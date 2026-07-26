const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProductRegistry", function () {
  let ProductRegistry;
  let registry;
  let owner, shipper, carrier, attacker, otherAccount;

  // Test values
  const totalValue = ethers.parseEther("1.0"); // 1 ETH
  const descriptions = ["Phase 1: Pickup", "Phase 2: Delivery"];
  const percentages = [40, 60];
  const proofHash1 = ethers.keccak256(ethers.toUtf8Bytes("proof_1"));
  const proofHash2 = ethers.keccak256(ethers.toUtf8Bytes("proof_2"));
  let deadline;

  beforeEach(async function () {
    [owner, shipper, carrier, attacker, otherAccount] = await ethers.getSigners();

    // Set deadline to 1 day in the future
    const currentBlockTime = await time.latest();
    deadline = currentBlockTime + 86400; // +24 hours

    ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    registry = await ProductRegistry.deploy();
  });

  describe("createAgreement", function () {
    it("Should create an agreement successfully with correct state", async function () {
      await expect(
        registry.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          descriptions,
          percentages
        )
      )
        .to.emit(registry, "AgreementCreated")
        .withArgs(0, shipper.address, carrier.address, totalValue, deadline);

      const ag = await registry.getAgreement(0);
      expect(ag.shipper).to.equal(shipper.address);
      expect(ag.carrier).to.equal(carrier.address);
      expect(ag.totalValue).to.equal(totalValue);
      expect(ag.status).to.equal(0); // AgreementStatus.Pending
      expect(ag.milestones.length).to.equal(2);
    });

    it("Should revert with ZeroAddress if carrier is address(0)", async function () {
      await expect(
        registry.connect(shipper).createAgreement(
          ethers.ZeroAddress,
          totalValue,
          deadline,
          descriptions,
          percentages
        )
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("Should revert with ZeroValue if totalValue is 0", async function () {
      await expect(
        registry.connect(shipper).createAgreement(
          carrier.address,
          0,
          deadline,
          descriptions,
          percentages
        )
      ).to.be.revertedWithCustomError(registry, "ZeroValue");
    });

    it("Should revert with InvalidDeadline if deadline is in the past", async function () {
      const pastDeadline = (await time.latest()) - 100;
      await expect(
        registry.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          pastDeadline,
          descriptions,
          percentages
        )
      ).to.be.revertedWithCustomError(registry, "InvalidDeadline");
    });

    it("Should revert with MismatchedLengths if array lengths differ", async function () {
      await expect(
        registry.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          ["Phase 1"],
          percentages
        )
      ).to.be.revertedWithCustomError(registry, "MismatchedLengths");
    });

    it("Should revert with InvalidPercentageTotal if percentages do not sum to 100", async function () {
      await expect(
        registry.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          descriptions,
          [30, 60] // Sums to 90
        )
      ).to.be.revertedWithCustomError(registry, "InvalidPercentageTotal");
    });
  });

  describe("fundAgreement", function () {
    beforeEach(async function () {
      await registry.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        descriptions,
        percentages
      );
    });

    it("Should fund agreement successfully", async function () {
      await expect(
        registry.connect(shipper).fundAgreement(0, { value: totalValue })
      )
        .to.emit(registry, "AgreementFunded")
        .withArgs(0, totalValue);

      const ag = await registry.getAgreement(0);
      expect(ag.status).to.equal(1); // AgreementStatus.Funded
      expect(ag.fundedAmount).to.equal(totalValue);
    });

    it("Should revert with Unauthorized if non-shipper tries to fund", async function () {
      await expect(
        registry.connect(attacker).fundAgreement(0, { value: totalValue })
      ).to.be.revertedWithCustomError(registry, "Unauthorized");
    });

    it("Should revert with IncorrectFundingAmount if sent value is wrong", async function () {
      const wrongValue = ethers.parseEther("0.5");
      await expect(
        registry.connect(shipper).fundAgreement(0, { value: wrongValue })
      ).to.be.revertedWithCustomError(registry, "IncorrectFundingAmount");
    });
  });

  describe("submitProofHash", function () {
    beforeEach(async function () {
      await registry.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        descriptions,
        percentages
      );
      await registry.connect(shipper).fundAgreement(0, { value: totalValue });
    });

    it("Should allow carrier to submit proof hash", async function () {
      await expect(registry.connect(carrier).submitProofHash(0, 0, proofHash1))
        .to.emit(registry, "ProofSubmitted")
        .withArgs(0, 0, proofHash1);

      expect(await registry.proofHashes(0, 0)).to.equal(proofHash1);
    });

    it("Should revert with Unauthorized if caller is not carrier", async function () {
      await expect(
        registry.connect(attacker).submitProofHash(0, 0, proofHash1)
      ).to.be.revertedWithCustomError(registry, "Unauthorized");
    });

    it("Should revert with ProofAlreadySubmitted if submitted twice", async function () {
      await registry.connect(carrier).submitProofHash(0, 0, proofHash1);
      await expect(
        registry.connect(carrier).submitProofHash(0, 0, proofHash1)
      ).to.be.revertedWithCustomError(registry, "ProofAlreadySubmitted");
    });

    it("Should revert with InvalidHash if hash is bytes32(0)", async function () {
      await expect(
        registry.connect(carrier).submitProofHash(0, 0, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(registry, "InvalidHash");
    });
  });

  describe("verifyMilestone", function () {
    beforeEach(async function () {
      await registry.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        descriptions,
        percentages
      );
      await registry.connect(shipper).fundAgreement(0, { value: totalValue });
      await registry.connect(carrier).submitProofHash(0, 0, proofHash1);
    });

    it("Should verify milestone 0, release funds, and transition to InProgress", async function () {
      const initialCarrierBalance = await ethers.provider.getBalance(carrier.address);
      const expectedRelease = (totalValue * 40n) / 100n; // 0.4 ETH

      await expect(registry.connect(shipper).verifyMilestone(0, 0))
        .to.emit(registry, "MilestoneVerified")
        .withArgs(0, 0, expectedRelease);

      const ag = await registry.getAgreement(0);
      expect(ag.status).to.equal(2); // AgreementStatus.InProgress
      expect(ag.currentMilestoneIndex).to.equal(1);

      const finalCarrierBalance = await ethers.provider.getBalance(carrier.address);
      expect(finalCarrierBalance - initialCarrierBalance).to.equal(expectedRelease);
    });

    it("Should verify final milestone, sweep exact remaining dust, and set status to Completed", async function () {
      // Step 1: Verify Milestone 0
      await registry.connect(shipper).verifyMilestone(0, 0);

      // Step 2: Submit & Verify Milestone 1 (Final)
      await registry.connect(carrier).submitProofHash(0, 1, proofHash2);

      await expect(registry.connect(shipper).verifyMilestone(0, 1))
        .to.emit(registry, "MilestoneVerified")
        .and.to.emit(registry, "AgreementCompleted")
        .withArgs(0);

      const ag = await registry.getAgreement(0);
      expect(ag.status).to.equal(3); // AgreementStatus.Completed
      expect(ag.releasedAmount).to.equal(totalValue);
    });

    it("Should revert with InvalidMilestone if verified out of order", async function () {
      await registry.connect(carrier).submitProofHash(0, 1, proofHash2);

      // Attempting to verify index 1 before index 0
      await expect(
        registry.connect(shipper).verifyMilestone(0, 1)
      ).to.be.revertedWithCustomError(registry, "InvalidMilestone");
    });

    it("Should revert with ProofMissing if carrier hasn't submitted proof hash", async function () {
      // Milestone 0 has proof, but let's test a fresh agreement without proof
      await registry.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        descriptions,
        percentages
      );
      await registry.connect(shipper).fundAgreement(1, { value: totalValue });

      await expect(
        registry.connect(shipper).verifyMilestone(1, 0)
      ).to.be.revertedWithCustomError(registry, "ProofMissing");
    });

    it("Should revert with DeadlinePassed if time is past deadline", async function () {
      await time.increaseTo(deadline + 1);

      await expect(
        registry.connect(shipper).verifyMilestone(0, 0)
      ).to.be.revertedWithCustomError(registry, "DeadlinePassed");
    });
  });

  describe("refund", function () {
    beforeEach(async function () {
      await registry.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        descriptions,
        percentages
      );
      await registry.connect(shipper).fundAgreement(0, { value: totalValue });
    });

    it("Should revert with DeadlineNotPassed if deadline hasn't passed", async function () {
      await expect(
        registry.connect(shipper).refund(0)
      ).to.be.revertedWithCustomError(registry, "DeadlineNotPassed");
    });

    it("Should refund remaining balance to shipper after deadline passes", async function () {
      // Fast forward past deadline
      await time.increaseTo(deadline + 100);

      const initialShipperBalance = await ethers.provider.getBalance(shipper.address);

      const tx = await registry.connect(shipper).refund(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.fee; // Gas spent by shipper

      const finalShipperBalance = await ethers.provider.getBalance(shipper.address);

      // Final balance = Initial balance + refundAmount - gasUsed
      expect(finalShipperBalance).to.equal(
        initialShipperBalance + totalValue - gasUsed
      );

      const ag = await registry.getAgreement(0);
      expect(ag.status).to.equal(4); // AgreementStatus.Refunded
    });

    it("Should refund remaining unreleased amount if partially completed", async function () {
      // Complete milestone 0 (40%)
      await registry.connect(carrier).submitProofHash(0, 0, proofHash1);
      await registry.connect(shipper).verifyMilestone(0, 0);

      // Advance past deadline
      await time.increaseTo(deadline + 100);

      const expectedRefund = (totalValue * 60n) / 100n; // 0.6 ETH

      await expect(registry.connect(shipper).refund(0))
        .to.emit(registry, "AgreementRefunded")
        .withArgs(0, expectedRefund);
    });
  });
});