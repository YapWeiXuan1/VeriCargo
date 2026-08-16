// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title VeriCargoEscrow
/// @notice Milestone-based logistics escrow between shipper and carrier
contract VeriCargoEscrow {

    // =============================================================
    // ENUM
    // =============================================================

    enum AgreementStatus {
        Pending,      // 0
        Funded,       // 1
        InProgress,   // 2
        Completed,    // 3
        Refunded      // 4
    }

    // =============================================================
    // STRUCTS
    // =============================================================

    struct Milestone {
        string description;
        uint8 percent;
        bool verified;          // true when milestone payment has been approved/claimed
        bool rejected;          // true when shipper explicitly rejects this milestone
        uint256 proofSubmittedAt; // starts the 3-day shipper review period
        uint256 verifiedAt;     // time milestone was approved or timeout-claimed
    }

    struct Agreement {
        address shipper;
        address carrier;
        uint256 totalValue;
        uint256 deadline;               // overall deadline for proof submission
        uint256 fundedAmount;
        uint256 releasedAmount;
        uint256 nextProofIndex;         // carrier submits proofs sequentially
        uint256 nextVerificationIndex;  // shipper verifies/rejects sequentially
        uint256 verifiedMilestoneCount;
        uint256 pendingProofCount;      // number of submitted proofs awaiting final decision
        AgreementStatus status;
        Milestone[] milestones;
    }

    // =============================================================
    // CUSTOM ERRORS
    // =============================================================

    error ZeroAddress();
    error ZeroValue();
    error InvalidDeadline();
    error MismatchedLengths();
    error InvalidPercentageTotal();
    error NoMilestones();

    error Unauthorized();
    error InvalidStatus();
    error IncorrectFundingAmount();

    error InvalidMilestone();
    error AlreadyVerified();
    error AlreadyRejected();

    error ProofAlreadySubmitted();
    error ProofMissing();
    error InvalidHash();

    error ProofSubmissionDeadlinePassed();

    error VerificationPeriodPassed();
    error VerificationPeriodNotPassed();

    error DeadlineNotPassed();

    error PendingProofExists();
    error NoFundsToRefund();

    error TransferFailed();
    error ReentrancyGuard();

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    uint256 public agreementCounter;

    /// @notice Shipper has exactly 3 days to approve/reject proof
    uint256 public constant VERIFICATION_PERIOD = 3 days;

    mapping(uint256 => Agreement) public agreements;

    mapping(address => uint256[]) public shipperAgreements;
    mapping(address => uint256[]) public carrierAgreements;

    /// agreementId => milestoneIndex => proof hash
    mapping(uint256 => mapping(uint256 => bytes32)) public proofHashes;

    // =============================================================
    // REENTRANCY GUARD
    // =============================================================

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _reentrancyStatus = _NOT_ENTERED;

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuard();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier onlyShipper(uint256 _agreementId) {
        if (msg.sender != agreements[_agreementId].shipper) revert Unauthorized();
        _;
    }

    modifier onlyCarrier(uint256 _agreementId) {
        if (msg.sender != agreements[_agreementId].carrier) revert Unauthorized();
        _;
    }

    modifier validStatus(uint256 _agreementId, AgreementStatus _status1, AgreementStatus _status2) {
        AgreementStatus current = agreements[_agreementId].status;
        if (current != _status1 && current != _status2) revert InvalidStatus();
        _;
    }

    // =============================================================
    // EVENTS
    // =============================================================

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed shipper,
        address indexed carrier,
        uint256 totalValue,
        uint256 deadline
    );

    event AgreementFunded(
        uint256 indexed agreementId,
        uint256 amount
    );

    event AgreementInProgress(
        uint256 indexed agreementId
    );

    event ProofSubmitted(
        uint256 indexed agreementId,
        uint256 indexed milestoneIndex,
        bytes32 hash,
        uint256 submittedAt,
        uint256 verificationDeadline
    );

    event MilestoneVerified(
        uint256 indexed agreementId,
        uint256 indexed milestoneIndex,
        uint256 releaseAmount
    );

    event MilestoneRejected(
        uint256 indexed agreementId,
        uint256 indexed milestoneIndex,
        uint256 rejectedAt
    );

    event MilestoneClaimedAfterTimeout(
        uint256 indexed agreementId,
        uint256 indexed milestoneIndex,
        uint256 releaseAmount
    );

    event AgreementCompleted(
        uint256 indexed agreementId
    );

    event AgreementRefunded(
        uint256 indexed agreementId,
        uint256 refundAmount
    );

    // =============================================================
    // CREATE AGREEMENT
    // =============================================================

    function createAgreement(
        address _carrier,
        uint256 _totalValue,
        uint256 _deadline,
        string[] calldata _descriptions,
        uint8[] calldata _percentages
    )
        external
        returns (uint256)
    {
        if (_carrier == address(0)) revert ZeroAddress();
        if (_totalValue == 0) revert ZeroValue();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        if (_descriptions.length != _percentages.length) revert MismatchedLengths();
        if (_descriptions.length == 0) revert NoMilestones();

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
        ag.fundedAmount = 0;
        ag.releasedAmount = 0;
        ag.nextProofIndex = 0;
        ag.nextVerificationIndex = 0;
        ag.verifiedMilestoneCount = 0;
        ag.pendingProofCount = 0;
        ag.status = AgreementStatus.Pending;

        for (uint256 i = 0; i < len; ) {
            ag.milestones.push(Milestone({
                description: _descriptions[i],
                percent: _percentages[i],
                verified: false,
                rejected: false,
                proofSubmittedAt: 0,
                verifiedAt: 0
            }));
            unchecked { ++i; }
        }

        shipperAgreements[msg.sender].push(id);
        carrierAgreements[_carrier].push(id);

        emit AgreementCreated(id, msg.sender, _carrier, _totalValue, _deadline);
        return id;
    }

    // =============================================================
    // FUND AGREEMENT
    // =============================================================

    function fundAgreement(uint256 _agreementId)
        external
        payable
        onlyShipper(_agreementId)
        validStatus(_agreementId, AgreementStatus.Pending, AgreementStatus.Pending)
    {
        Agreement storage ag = agreements[_agreementId];
        if (msg.value != ag.totalValue) revert IncorrectFundingAmount();

        ag.fundedAmount = msg.value;
        ag.status = AgreementStatus.Funded;

        emit AgreementFunded(_agreementId, msg.value);
    }

    // =============================================================
    // CARRIER: SUBMIT PROOF (including resubmission after rejection)
    // =============================================================

    function submitProofHash(
        uint256 _agreementId,
        uint256 _milestoneIndex,
        bytes32 _hash
    )
        external
        onlyCarrier(_agreementId)
        validStatus(_agreementId, AgreementStatus.Funded, AgreementStatus.InProgress)
    {
        Agreement storage ag = agreements[_agreementId];

        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();

        if (block.timestamp > ag.deadline) revert ProofSubmissionDeadlinePassed();
        if (_hash == bytes32(0)) revert InvalidHash();

        Milestone storage milestone = ag.milestones[_milestoneIndex];

        // Cannot submit if already verified
        if (milestone.verified) revert AlreadyVerified();

        // If the milestone was previously rejected, we allow resubmission
        bool isResubmission = milestone.rejected;

        if (!isResubmission && _milestoneIndex != ag.nextProofIndex) {
            revert InvalidMilestone();
        }

        // If not rejected, ensure no proof exists yet
        if (!isResubmission && proofHashes[_agreementId][_milestoneIndex] != bytes32(0)) {
            revert ProofAlreadySubmitted();
        }

        // Overwrite hash (for resubmission) or store new
        proofHashes[_agreementId][_milestoneIndex] = _hash;

        // Reset rejection flag if it was rejected
        if (isResubmission) {
            milestone.rejected = false;
            // pendingProofCount was decremented on rejection, so increment it back
            ag.pendingProofCount += 1;
        } else {
            // New submission: increment pending count
            ag.pendingProofCount += 1;
            ag.nextProofIndex += 1;
        }

        // Update submission timestamp (starts new 3-day window)
        milestone.proofSubmittedAt = block.timestamp;

        // If status is still Funded, change to InProgress
        if (ag.status == AgreementStatus.Funded) {
            ag.status = AgreementStatus.InProgress;
            emit AgreementInProgress(_agreementId);
        }

        uint256 verificationDeadline = block.timestamp + VERIFICATION_PERIOD;
        emit ProofSubmitted(_agreementId, _milestoneIndex, _hash, block.timestamp, verificationDeadline);
    }

    // =============================================================
    // SHIPPER: VERIFY MILESTONE
    // =============================================================

    function verifyMilestone(uint256 _agreementId, uint256 _milestoneIndex)
        external
        nonReentrant
        onlyShipper(_agreementId)
        validStatus(_agreementId, AgreementStatus.Funded, AgreementStatus.InProgress)
    {
        Agreement storage ag = agreements[_agreementId];

        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        if (_milestoneIndex != ag.nextVerificationIndex) revert InvalidMilestone();

        Milestone storage milestone = ag.milestones[_milestoneIndex];
        if (milestone.verified) revert AlreadyVerified();
        if (milestone.rejected) revert AlreadyRejected();
        if (proofHashes[_agreementId][_milestoneIndex] == bytes32(0)) revert ProofMissing();

        if (block.timestamp > milestone.proofSubmittedAt + VERIFICATION_PERIOD) {
            revert VerificationPeriodPassed();
        }

        _approveMilestone(_agreementId, _milestoneIndex, false);
    }

    // =============================================================
    // SHIPPER: REJECT MILESTONE (does NOT advance verification index)
    // =============================================================

    function rejectMilestone(uint256 _agreementId, uint256 _milestoneIndex)
        external
        onlyShipper(_agreementId)
        validStatus(_agreementId, AgreementStatus.Funded, AgreementStatus.InProgress)
    {
        Agreement storage ag = agreements[_agreementId];

        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        if (_milestoneIndex != ag.nextVerificationIndex) revert InvalidMilestone();

        Milestone storage milestone = ag.milestones[_milestoneIndex];
        if (milestone.verified) revert AlreadyVerified();
        if (milestone.rejected) revert AlreadyRejected();
        if (proofHashes[_agreementId][_milestoneIndex] == bytes32(0)) revert ProofMissing();

        if (block.timestamp > milestone.proofSubmittedAt + VERIFICATION_PERIOD) {
            revert VerificationPeriodPassed();
        }

        // Mark as rejected
        milestone.rejected = true;

        // Decrease pending proof count (no longer pending)
        ag.pendingProofCount -= 1;

        // DO NOT advance nextVerificationIndex – shipper must wait for resubmission or final refund

        // Ensure status is InProgress
        if (ag.status == AgreementStatus.Funded) {
            ag.status = AgreementStatus.InProgress;
            emit AgreementInProgress(_agreementId);
        }

        emit MilestoneRejected(_agreementId, _milestoneIndex, block.timestamp);
    }

    // =============================================================
    // CARRIER: CLAIM AFTER TIMEOUT
    // =============================================================

    function claimAfterVerificationTimeout(uint256 _agreementId, uint256 _milestoneIndex)
        external
        nonReentrant
        onlyCarrier(_agreementId)
        validStatus(_agreementId, AgreementStatus.Funded, AgreementStatus.InProgress)
    {
        Agreement storage ag = agreements[_agreementId];

        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        if (_milestoneIndex != ag.nextVerificationIndex) revert InvalidMilestone();

        Milestone storage milestone = ag.milestones[_milestoneIndex];
        if (milestone.verified) revert AlreadyVerified();
        if (milestone.rejected) revert AlreadyRejected();
        if (proofHashes[_agreementId][_milestoneIndex] == bytes32(0)) revert ProofMissing();

        if (block.timestamp <= milestone.proofSubmittedAt + VERIFICATION_PERIOD) {
            revert VerificationPeriodNotPassed();
        }

        _approveMilestone(_agreementId, _milestoneIndex, true);
    }

    // =============================================================
    // INTERNAL APPROVAL + PAYMENT
    // =============================================================

    function _approveMilestone(
        uint256 _agreementId,
        uint256 _milestoneIndex,
        bool _claimedAfterTimeout
    )
        internal
    {
        Agreement storage ag = agreements[_agreementId];
        Milestone storage milestone = ag.milestones[_milestoneIndex];

        // Effects
        milestone.verified = true;
        milestone.verifiedAt = block.timestamp;
        ag.verifiedMilestoneCount += 1;
        ag.nextVerificationIndex += 1;   // advance to next milestone

        // Decrease pending proof count
        ag.pendingProofCount -= 1;

        uint256 releaseAmount = (ag.totalValue * milestone.percent) / 100;

        bool allMilestonesVerified = (ag.verifiedMilestoneCount == ag.milestones.length);
        if (allMilestonesVerified) {
            releaseAmount = ag.fundedAmount - ag.releasedAmount;
            ag.status = AgreementStatus.Completed;
        } else {
            ag.status = AgreementStatus.InProgress;
        }

        ag.releasedAmount += releaseAmount;

        // Emit events
        if (_claimedAfterTimeout) {
            emit MilestoneClaimedAfterTimeout(_agreementId, _milestoneIndex, releaseAmount);
        } else {
            emit MilestoneVerified(_agreementId, _milestoneIndex, releaseAmount);
        }
        if (allMilestonesVerified) {
            emit AgreementCompleted(_agreementId);
        }

        // Interaction
        (bool sent, ) = ag.carrier.call{ value: releaseAmount }("");
        if (!sent) revert TransferFailed();
    }

    // =============================================================
    // SHIPPER: REFUND
    // =============================================================

    function refund(uint256 _agreementId)
        external
        nonReentrant
        onlyShipper(_agreementId)
        validStatus(_agreementId, AgreementStatus.Funded, AgreementStatus.InProgress)
    {
        Agreement storage ag = agreements[_agreementId];

        if (block.timestamp <= ag.deadline) revert DeadlineNotPassed();

        // No pending proofs allowed
        if (ag.pendingProofCount > 0) revert PendingProofExists();

        uint256 refundAmount = ag.fundedAmount - ag.releasedAmount;
        if (refundAmount == 0) revert NoFundsToRefund();

        ag.status = AgreementStatus.Refunded;
        emit AgreementRefunded(_agreementId, refundAmount);

        (bool sent, ) = ag.shipper.call{ value: refundAmount }("");
        if (!sent) revert TransferFailed();
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function getAgreement(uint256 _agreementId)
        external
        view
        returns (
            address shipper,
            address carrier,
            uint256 totalValue,
            uint256 deadline,
            uint256 fundedAmount,
            uint256 releasedAmount,
            uint256 nextProofIndex,
            uint256 nextVerificationIndex,
            uint256 verifiedMilestoneCount,
            uint256 pendingProofCount,
            AgreementStatus status,
            Milestone[] memory milestones
        )
    {
        Agreement storage ag = agreements[_agreementId];
        return (
            ag.shipper,
            ag.carrier,
            ag.totalValue,
            ag.deadline,
            ag.fundedAmount,
            ag.releasedAmount,
            ag.nextProofIndex,
            ag.nextVerificationIndex,
            ag.verifiedMilestoneCount,
            ag.pendingProofCount,
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

    function getVerificationDeadline(uint256 _agreementId, uint256 _milestoneIndex)
        external
        view
        returns (uint256)
    {
        Agreement storage ag = agreements[_agreementId];
        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        Milestone storage milestone = ag.milestones[_milestoneIndex];
        if (milestone.proofSubmittedAt == 0) return 0;
        return milestone.proofSubmittedAt + VERIFICATION_PERIOD;
    }

    function isProofPending(uint256 _agreementId, uint256 _milestoneIndex)
        external
        view
        returns (bool)
    {
        Agreement storage ag = agreements[_agreementId];
        if (_milestoneIndex >= ag.milestones.length) revert InvalidMilestone();
        Milestone storage milestone = ag.milestones[_milestoneIndex];
        bool proofExists = (proofHashes[_agreementId][_milestoneIndex] != bytes32(0));
        return proofExists && !milestone.verified && !milestone.rejected;
    }
}