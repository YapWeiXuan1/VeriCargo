// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title ProductRegistry - Milestone-based escrow registry for shippers and carriers
contract ProductRegistry {
    enum AgreementStatus { Pending, Funded, InProgress, Completed, Refunded }

    struct Milestone {
        string description;
        uint8 percent;
        bool verified;
        uint256 timestamp;
    }

    struct Agreement {
        address shipper;
        address carrier;
        uint256 totalValue;
        uint256 deadline;
        uint256 fundedAmount;
        uint256 releasedAmount;
        uint256 currentMilestoneIndex;
        AgreementStatus status;
        Milestone[] milestones;
    }

    // Custom Errors (Gas Efficiency)
    error ZeroAddress();
    error ZeroValue();
    error InvalidDeadline();
    error MismatchedLengths();
    error InvalidPercentageTotal();
    error Unauthorized();
    error InvalidStatus();
    error IncorrectFundingAmount();
    error InvalidMilestone();
    error AlreadyVerified();
    error ProofAlreadySubmitted();
    error ProofMissing();
    error InvalidHash();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error AllMilestonesVerified();
    error NoFundsToRefund();
    error TransferFailed();
    error ReentrancyGuard();

    uint256 public agreementCounter;
    mapping(uint256 => Agreement) public agreements;
    mapping(address => uint256[]) public shipperAgreements;
    mapping(address => uint256[]) public carrierAgreements;
    mapping(uint256 => mapping(uint256 => bytes32)) public proofHashes;

    // Simple Reentrancy Guard Flag
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuard();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    event AgreementCreated(uint256 indexed agreementId, address indexed shipper, address indexed carrier, uint256 totalValue, uint256 deadline);
    event AgreementFunded(uint256 indexed agreementId, uint256 amount);
    event ProofSubmitted(uint256 indexed agreementId, uint256 milestoneIndex, bytes32 hash);
    event MilestoneVerified(uint256 indexed agreementId, uint256 milestoneIndex, uint256 releaseAmount);
    event AgreementCompleted(uint256 indexed agreementId);
    event AgreementRefunded(uint256 indexed agreementId, uint256 refundAmount);

    function createAgreement(
        address _carrier,
        uint256 _totalValue,
        uint256 _deadline,
        string[] calldata _descriptions,
        uint8[] calldata _percentages
    ) external returns (uint256) {
        if (_carrier == address(0)) revert ZeroAddress();
        if (_totalValue == 0) revert ZeroValue();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        if (_descriptions.length != _percentages.length) revert MismatchedLengths();
        
        uint256 totalPercent;
        uint256 len = _percentages.length;
        for (uint256 i = 0; i < len; ) {
            totalPercent += _percentages[i];
            unchecked { ++i; }
        }
        if (totalPercent != 100) revert InvalidPercentageTotal();

        uint256 id = agreementCounter++;
        Agreement storage ag = agreements[id];
        ag.shipper = msg.sender;
        ag.carrier = _carrier;
        ag.totalValue = _totalValue;
        ag.deadline = _deadline;
        ag.status = AgreementStatus.Pending;

        for (uint256 i = 0; i < len; ) {
            ag.milestones.push(Milestone({
                description: _descriptions[i],
                percent: _percentages[i],
                verified: false,
                timestamp: 0
            }));
            unchecked { ++i; }
        }

        shipperAgreements[msg.sender].push(id);
        carrierAgreements[_carrier].push(id);

        emit AgreementCreated(id, msg.sender, _carrier, _totalValue, _deadline);
        return id;
    }

    function fundAgreement(uint256 _agreementId) external payable {
        Agreement storage ag = agreements[_agreementId];
        if (msg.sender != ag.shipper) revert Unauthorized();
        if (ag.status != AgreementStatus.Pending) revert InvalidStatus();
        if (msg.value != ag.totalValue) revert IncorrectFundingAmount();

        ag.fundedAmount = msg.value;
        ag.status = AgreementStatus.Funded;
        emit AgreementFunded(_agreementId, msg.value);
    }

    function submitProofHash(uint256 _agreementId, uint256 _milestoneIndex, bytes32 _hash) external {
        Agreement storage ag = agreements[_agreementId];
        if (msg.sender != ag.carrier) revert Unauthorized();
        if (ag.status != AgreementStatus.Funded && ag.status != AgreementStatus.InProgress) revert InvalidStatus();
        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        if (ag.milestones[_milestoneIndex].verified) revert AlreadyVerified();
        if (proofHashes[_agreementId][_milestoneIndex] != bytes32(0)) revert ProofAlreadySubmitted();
        if (_hash == bytes32(0)) revert InvalidHash();

        proofHashes[_agreementId][_milestoneIndex] = _hash;
        emit ProofSubmitted(_agreementId, _milestoneIndex, _hash);
    }

    function verifyMilestone(uint256 _agreementId, uint256 _milestoneIndex) external nonReentrant {
        Agreement storage ag = agreements[_agreementId];
        if (msg.sender != ag.shipper) revert Unauthorized();
        if (ag.status != AgreementStatus.Funded && ag.status != AgreementStatus.InProgress) revert InvalidStatus();
        if (_milestoneIndex != ag.currentMilestoneIndex) revert InvalidMilestone(); // Enforce sequential execution
        if (ag.milestones[_milestoneIndex].verified) revert AlreadyVerified();
        if (block.timestamp > ag.deadline) revert DeadlinePassed();
        if (proofHashes[_agreementId][_milestoneIndex] == bytes32(0)) revert ProofMissing();

        // 1. Effects (Update internal state first)
        ag.milestones[_milestoneIndex].verified = true;
        ag.milestones[_milestoneIndex].timestamp = block.timestamp;

        uint256 releaseAmount;
        bool isLastMilestone = (_milestoneIndex == ag.milestones.length - 1);

        if (isLastMilestone) {
            // Prevent leaving sub-wei dust due to integer division
            releaseAmount = ag.fundedAmount - ag.releasedAmount;
            ag.status = AgreementStatus.Completed;
            emit AgreementCompleted(_agreementId);
        } else {
            uint8 percent = ag.milestones[_milestoneIndex].percent;
            releaseAmount = (ag.totalValue * percent) / 100;
            ag.status = AgreementStatus.InProgress;
        }

        ag.releasedAmount += releaseAmount;
        ag.currentMilestoneIndex = _milestoneIndex + 1;

        emit MilestoneVerified(_agreementId, _milestoneIndex, releaseAmount);

        // 2. Interaction (External transfer at the absolute end)
        (bool sent, ) = ag.carrier.call{value: releaseAmount}("");
        if (!sent) revert TransferFailed();
    }

    function refund(uint256 _agreementId) external nonReentrant {
        Agreement storage ag = agreements[_agreementId];
        if (msg.sender != ag.shipper) revert Unauthorized();
        if (ag.status != AgreementStatus.Funded && ag.status != AgreementStatus.InProgress) revert InvalidStatus();
        if (block.timestamp <= ag.deadline) revert DeadlineNotPassed();
        if (ag.currentMilestoneIndex >= ag.milestones.length) revert AllMilestonesVerified();

        uint256 refundAmount = ag.totalValue - ag.releasedAmount;
        if (refundAmount == 0) revert NoFundsToRefund();

        // 1. Effects
        ag.status = AgreementStatus.Refunded;

        emit AgreementRefunded(_agreementId, refundAmount);

        // 2. Interaction
        (bool sent, ) = ag.shipper.call{value: refundAmount}("");
        if (!sent) revert TransferFailed();
    }

    function getAgreement(uint256 _agreementId) external view returns (
        address shipper,
        address carrier,
        uint256 totalValue,
        uint256 deadline,
        uint256 fundedAmount,
        uint256 releasedAmount,
        uint256 currentMilestoneIndex,
        AgreementStatus status,
        Milestone[] memory milestones
    ) {
        Agreement storage ag = agreements[_agreementId];
        return (
            ag.shipper,
            ag.carrier,
            ag.totalValue,
            ag.deadline,
            ag.fundedAmount,
            ag.releasedAmount,
            ag.currentMilestoneIndex,
            ag.status,
            ag.milestones
        );
    }

    function getShipperAgreements(address _shipper) external view returns (uint256[] memory) {
        return shipperAgreements[_shipper];
    }

    function getCarrierAgreements(address _carrier) external view returns (uint256[] memory) {
        return carrierAgreements[_carrier];
    }
}