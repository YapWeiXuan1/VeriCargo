// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

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

    uint256 public agreementCounter;
    mapping(uint256 => Agreement) public agreements;
    mapping(address => uint256[]) public shipperAgreements;
    mapping(address => uint256[]) public carrierAgreements;
    mapping(uint256 => mapping(uint256 => bytes32)) public proofHashes;

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
        string[] memory _descriptions,
        uint8[] memory _percentages
    ) external returns (uint256) {
        require(_carrier != address(0), "Invalid carrier");
        require(_totalValue > 0, "Total value must be >0");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_descriptions.length == _percentages.length, "Mismatch lengths");
        
        uint256 totalPercent;
        for (uint i = 0; i < _percentages.length; i++) {
            totalPercent += _percentages[i];
        }
        require(totalPercent == 100, "Percentages must sum to 100");

        uint256 id = agreementCounter++;
        Agreement storage ag = agreements[id];
        ag.shipper = msg.sender;
        ag.carrier = _carrier;
        ag.totalValue = _totalValue;
        ag.deadline = _deadline;
        ag.status = AgreementStatus.Pending;

        for (uint i = 0; i < _descriptions.length; i++) {
            ag.milestones.push(Milestone({
                description: _descriptions[i],
                percent: _percentages[i],
                verified: false,
                timestamp: 0
            }));
        }

        shipperAgreements[msg.sender].push(id);
        carrierAgreements[_carrier].push(id);

        emit AgreementCreated(id, msg.sender, _carrier, _totalValue, _deadline);
        return id;
    }

    function fundAgreement(uint256 _agreementId) external payable {
        Agreement storage ag = agreements[_agreementId];
        require(msg.sender == ag.shipper, "Only shipper can fund");
        require(ag.status == AgreementStatus.Pending, "Not pending");
        require(msg.value == ag.totalValue, "Must send exact total value");

        ag.fundedAmount = msg.value;
        ag.status = AgreementStatus.Funded;
        emit AgreementFunded(_agreementId, msg.value);
    }

    function submitProofHash(uint256 _agreementId, uint256 _milestoneIndex, bytes32 _hash) external {
        Agreement storage ag = agreements[_agreementId];
        require(msg.sender == ag.carrier, "Only carrier can submit proof");
        require(ag.status == AgreementStatus.Funded || ag.status == AgreementStatus.InProgress, "Invalid status");
        require(_milestoneIndex < ag.milestones.length, "Invalid milestone");
        require(!ag.milestones[_milestoneIndex].verified, "Milestone already verified");
        require(proofHashes[_agreementId][_milestoneIndex] == 0x0, "Proof already submitted");
        require(_hash != 0x0, "Invalid hash");

        proofHashes[_agreementId][_milestoneIndex] = _hash;
        emit ProofSubmitted(_agreementId, _milestoneIndex, _hash);
    }

    function verifyMilestone(uint256 _agreementId, uint256 _milestoneIndex) external {
        Agreement storage ag = agreements[_agreementId];
        require(msg.sender == ag.shipper, "Only shipper can verify");
        require(ag.status == AgreementStatus.Funded || ag.status == AgreementStatus.InProgress, "Invalid status");
        require(_milestoneIndex < ag.milestones.length, "Invalid milestone");
        require(!ag.milestones[_milestoneIndex].verified, "Already verified");
        require(block.timestamp <= ag.deadline, "Deadline passed");
        require(proofHashes[_agreementId][_milestoneIndex] != 0x0, "Carrier must submit proof hash first");

        ag.milestones[_milestoneIndex].verified = true;
        ag.milestones[_milestoneIndex].timestamp = block.timestamp;

        uint8 percent = ag.milestones[_milestoneIndex].percent;
        uint256 releaseAmount = (ag.totalValue * percent) / 100;
        ag.releasedAmount += releaseAmount;
        ag.currentMilestoneIndex = _milestoneIndex + 1;

        (bool sent, ) = ag.carrier.call{value: releaseAmount}("");
        require(sent, "Transfer failed");

        emit MilestoneVerified(_agreementId, _milestoneIndex, releaseAmount);

        bool allVerified = true;
        for (uint i = 0; i < ag.milestones.length; i++) {
            if (!ag.milestones[i].verified) {
                allVerified = false;
                break;
            }
        }
        if (allVerified) {
            ag.status = AgreementStatus.Completed;
            emit AgreementCompleted(_agreementId);
        } else {
            ag.status = AgreementStatus.InProgress;
        }
    }

    function refund(uint256 _agreementId) external {
        Agreement storage ag = agreements[_agreementId];
        require(msg.sender == ag.shipper, "Only shipper can refund");
        require(ag.status == AgreementStatus.Funded || ag.status == AgreementStatus.InProgress, "Invalid status");
        require(block.timestamp > ag.deadline, "Deadline not passed yet");

        bool allVerified = true;
        for (uint i = 0; i < ag.milestones.length; i++) {
            if (!ag.milestones[i].verified) {
                allVerified = false;
                break;
            }
        }
        require(!allVerified, "All milestones verified, cannot refund");

        uint256 refundAmount = ag.totalValue - ag.releasedAmount;
        require(refundAmount > 0, "No funds to refund");

        ag.status = AgreementStatus.Refunded;
        (bool sent, ) = ag.shipper.call{value: refundAmount}("");
        require(sent, "Refund transfer failed");
        emit AgreementRefunded(_agreementId, refundAmount);
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
        return (ag.shipper, ag.carrier, ag.totalValue, ag.deadline, ag.fundedAmount, ag.releasedAmount, ag.currentMilestoneIndex, ag.status, ag.milestones);
    }

    function getShipperAgreements(address _shipper) external view returns (uint256[] memory) {
        return shipperAgreements[_shipper];
    }

    function getCarrierAgreements(address _carrier) external view returns (uint256[] memory) {
        return carrierAgreements[_carrier];
    }
}