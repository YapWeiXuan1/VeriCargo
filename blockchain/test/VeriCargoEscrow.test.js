const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriCargoEscrow", function () {
  let veriCargoEscrow;
  let shipper, carrier, other;
  const totalValue = ethers.parseEther("10");
  const VERIFICATION_PERIOD = 3 * 24 * 60 * 60;

  async function fastForward(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async function getTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  beforeEach(async function () {
    [shipper, carrier, other] = await ethers.getSigners();
    const VeriCargoEscrow = await ethers.getContractFactory("VeriCargoEscrow");
    veriCargoEscrow = await VeriCargoEscrow.deploy();
  });

  describe("createAgreement", function () {
    it("should create agreement successfully", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      const descriptions = ["Milestone 1", "Milestone 2"];
      const percentages = [50, 50];

      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          descriptions,
          percentages
        )
      ).to.emit(veriCargoEscrow, "AgreementCreated")
        .withArgs(0, shipper.address, carrier.address, totalValue, deadline);
    });

    it("should revert if carrier is zero address", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          ethers.ZeroAddress,
          totalValue,
          deadline,
          ["M1"],
          [100]
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "ZeroAddress");
    });

    it("should revert if totalValue is zero", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          0,
          deadline,
          ["M1"],
          [100]
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "ZeroValue");
    });

    it("should revert if deadline <= now", async function () {
      const deadline = await getTimestamp();
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          ["M1"],
          [100]
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidDeadline");
    });

    it("should revert if arrays length mismatch", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          ["M1", "M2"],
          [100]
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "MismatchedLengths");
    });

    it("should revert if no milestones", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          [],
          []
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "NoMilestones");
    });

    it("should revert if percentages do not sum to 100", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await expect(
        veriCargoEscrow.connect(shipper).createAgreement(
          carrier.address,
          totalValue,
          deadline,
          ["M1", "M2"],
          [30, 30]
        )
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidPercentageTotal");
    });
  });

  describe("fundAgreement", function () {
    let agreementId, deadline;

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
    });

    it("should fund agreement successfully", async function () {
      const tx = veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
      await expect(tx).to.emit(veriCargoEscrow, "AgreementFunded").withArgs(agreementId, totalValue);
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.status).to.equal(1);
      expect(ag.fundedAmount).to.equal(totalValue);
    });

    it("should revert if not shipper", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).fundAgreement(agreementId, { value: totalValue })
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });

    it("should revert if status is not Pending", async function () {
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
      await expect(
        veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue })
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidStatus");
    });

    it("should revert if incorrect amount sent", async function () {
      const wrongAmount = totalValue - ethers.parseEther("1");
      await expect(
        veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: wrongAmount })
      ).to.be.revertedWithCustomError(veriCargoEscrow, "IncorrectFundingAmount");
    });
  });

  describe("submitProofHash", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");
    const hash2 = ethers.encodeBytes32String("proof2");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
    });

    it("should submit proof for milestone 0 successfully", async function () {
      const tx = veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await expect(tx).to.emit(veriCargoEscrow, "ProofSubmitted")
        .withArgs(agreementId, 0, hash, (arg) => arg > 0, (arg) => arg > 0);
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.nextProofIndex).to.equal(1);
      expect(ag.pendingProofCount).to.equal(1);
      expect(ag.status).to.equal(2);
    });

    it("should revert if not carrier", async function () {
      await expect(
        veriCargoEscrow.connect(shipper).submitProofHash(agreementId, 0, hash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });

    it("should revert if status is not Funded or InProgress", async function () {
      const newDeadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        newDeadline,
        ["M1"],
        [100]
      );
      const id = 1;
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(id, 0, hash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidStatus");
    });

    it("should revert if milestone index out of bounds", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 2, hash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if submitting out of order (not nextProofIndex)", async function () {
      // Try to submit M1 before M0 (out of order)
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 1, hash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if submitting after overall deadline", async function () {
      await fastForward(8 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "ProofSubmissionDeadlinePassed");
    });

    it("should revert if hash is zero", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidHash");
    });

    it("should allow resubmission after rejection", async function () {
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0);
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash2)
      ).to.emit(veriCargoEscrow, "ProofSubmitted");
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.pendingProofCount).to.equal(1);
      expect(ag.nextProofIndex).to.equal(1);
    });

    it("should allow submitting milestone 1 after milestone 0 is submitted (sequential)", async function () {
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await expect(
        veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 1, hash2)
      ).to.emit(veriCargoEscrow, "ProofSubmitted");
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.nextProofIndex).to.equal(2);
      expect(ag.pendingProofCount).to.equal(2);
    });
  });

  describe("verifyMilestone", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
    });

    it("should verify milestone successfully", async function () {
      const expectedRelease = totalValue * 50n / 100n;
      const tx = veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      await expect(tx).to.emit(veriCargoEscrow, "MilestoneVerified")
        .withArgs(agreementId, 0, expectedRelease);
      await expect(tx).to.changeEtherBalance(carrier, expectedRelease);

      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.nextVerificationIndex).to.equal(1);
      expect(ag.pendingProofCount).to.equal(0);
      expect(ag.verifiedMilestoneCount).to.equal(1);
      expect(ag.releasedAmount).to.equal(expectedRelease);
    });

    it("should revert if not shipper", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).verifyMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });

    it("should revert if milestone index out of order", async function () {
      await expect(
        veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 1)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if milestone already verified", async function () {
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      // After verification, nextVerificationIndex is 1, so trying again with index 0 reverts with InvalidMilestone
      await expect(
        veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if milestone already rejected", async function () {
      await veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0);
      await expect(
        veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "AlreadyRejected");
    });

    it("should revert if no proof submitted", async function () {
      const newDeadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        newDeadline,
        ["M1"],
        [100]
      );
      const id = 1;
      await veriCargoEscrow.connect(shipper).fundAgreement(id, { value: totalValue });
      await expect(
        veriCargoEscrow.connect(shipper).verifyMilestone(id, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "ProofMissing");
    });

    it("should revert if verification period passed", async function () {
      await fastForward(4 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "VerificationPeriodPassed");
    });
  });

  describe("rejectMilestone", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
    });

    it("should reject milestone successfully", async function () {
      const tx = veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0);
      await expect(tx).to.emit(veriCargoEscrow, "MilestoneRejected")
        .withArgs(agreementId, 0, (arg) => arg > 0);
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.nextVerificationIndex).to.equal(0);
      expect(ag.pendingProofCount).to.equal(0);
      expect(ag.verifiedMilestoneCount).to.equal(0);
    });

    it("should revert if not shipper", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).rejectMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });

    it("should revert if milestone index out of order", async function () {
      await expect(
        veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 1)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if already verified", async function () {
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      // After verification, nextVerificationIndex is 1, so rejecting index 0 reverts with InvalidMilestone
      await expect(
        veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if already rejected", async function () {
      await veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0);
      await expect(
        veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "AlreadyRejected");
    });

    it("should revert if verification period passed", async function () {
      await fastForward(4 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "VerificationPeriodPassed");
    });
  });

  describe("claimAfterVerificationTimeout", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
    });

    it("should claim after timeout successfully", async function () {
      await fastForward(4 * 24 * 60 * 60);
      const expectedRelease = totalValue * 50n / 100n;
      const tx = veriCargoEscrow.connect(carrier).claimAfterVerificationTimeout(agreementId, 0);
      await expect(tx).to.emit(veriCargoEscrow, "MilestoneClaimedAfterTimeout")
        .withArgs(agreementId, 0, expectedRelease);
      await expect(tx).to.changeEtherBalance(carrier, expectedRelease);

      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.nextVerificationIndex).to.equal(1);
      expect(ag.pendingProofCount).to.equal(0);
    });

    it("should revert if not carrier", async function () {
      await fastForward(4 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(shipper).claimAfterVerificationTimeout(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });

    it("should revert if verification period not passed yet", async function () {
      await expect(
        veriCargoEscrow.connect(carrier).claimAfterVerificationTimeout(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "VerificationPeriodNotPassed");
    });

    it("should revert if milestone already verified", async function () {
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      await fastForward(4 * 24 * 60 * 60);
      // After verification, nextVerificationIndex is 1, so claiming index 0 reverts with InvalidMilestone
      await expect(
        veriCargoEscrow.connect(carrier).claimAfterVerificationTimeout(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidMilestone");
    });

    it("should revert if milestone already rejected", async function () {
      await veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 0);
      await fastForward(4 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(carrier).claimAfterVerificationTimeout(agreementId, 0)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "AlreadyRejected");
    });
  });

  describe("refund", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
    });

    it("should refund after deadline with no pending proofs", async function () {
      // Verify M0, submit and reject M1 (so no pending)
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 1, hash);
      await veriCargoEscrow.connect(shipper).rejectMilestone(agreementId, 1);

      await fastForward(8 * 24 * 60 * 60);
      const expectedRefund = totalValue * 50n / 100n;
      const tx = veriCargoEscrow.connect(shipper).refund(agreementId);
      await expect(tx).to.emit(veriCargoEscrow, "AgreementRefunded").withArgs(agreementId, expectedRefund);
      await expect(tx).to.changeEtherBalance(shipper, expectedRefund);

      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.status).to.equal(4); // Refunded
    });

    it("should revert if called before deadline", async function () {
      await expect(
        veriCargoEscrow.connect(shipper).refund(agreementId)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "DeadlineNotPassed");
    });

    it("should revert if there is a pending proof", async function () {
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await fastForward(8 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(shipper).refund(agreementId)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "PendingProofExists");
    });

    it("should revert if no funds to refund (all released)", async function () {
      // Verify both milestones
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 1, hash);
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 1);

      await fastForward(8 * 24 * 60 * 60);
      // Status is Completed, so refund reverts with InvalidStatus (not NoFundsToRefund)
      await expect(
        veriCargoEscrow.connect(shipper).refund(agreementId)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "InvalidStatus");
    });

    it("should revert if not shipper", async function () {
      await fastForward(8 * 24 * 60 * 60);
      await expect(
        veriCargoEscrow.connect(carrier).refund(agreementId)
      ).to.be.revertedWithCustomError(veriCargoEscrow, "Unauthorized");
    });
  });

  describe("View functions", function () {
    let agreementId, deadline;
    const hash = ethers.encodeBytes32String("proof1");

    beforeEach(async function () {
      deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      agreementId = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(agreementId, { value: totalValue });
    });

    it("should get agreement details", async function () {
      const ag = await veriCargoEscrow.getAgreement(agreementId);
      expect(ag.shipper).to.equal(shipper.address);
      expect(ag.carrier).to.equal(carrier.address);
      expect(ag.totalValue).to.equal(totalValue);
      expect(ag.deadline).to.equal(deadline);
      expect(ag.fundedAmount).to.equal(totalValue);
      expect(ag.releasedAmount).to.equal(0);
      expect(ag.nextProofIndex).to.equal(0);
      expect(ag.nextVerificationIndex).to.equal(0);
      expect(ag.verifiedMilestoneCount).to.equal(0);
      expect(ag.pendingProofCount).to.equal(0);
      expect(ag.status).to.equal(1);
      expect(ag.milestones.length).to.equal(2);
    });

    it("should get shipper agreements", async function () {
      const list = await veriCargoEscrow.getShipperAgreements(shipper.address);
      expect(list).to.deep.equal([0n]);
    });

    it("should get carrier agreements", async function () {
      const list = await veriCargoEscrow.getCarrierAgreements(carrier.address);
      expect(list).to.deep.equal([0n]);
    });

    it("should get verification deadline", async function () {
      expect(await veriCargoEscrow.getVerificationDeadline(agreementId, 0)).to.equal(0);
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      const submittedAt = await getTimestamp();
      const expected = submittedAt + VERIFICATION_PERIOD;
      const actual = await veriCargoEscrow.getVerificationDeadline(agreementId, 0);
      expect(actual).to.be.closeTo(expected, 2);
    });

    it("should check proof pending", async function () {
      expect(await veriCargoEscrow.isProofPending(agreementId, 0)).to.equal(false);
      await veriCargoEscrow.connect(carrier).submitProofHash(agreementId, 0, hash);
      expect(await veriCargoEscrow.isProofPending(agreementId, 0)).to.equal(true);
      await veriCargoEscrow.connect(shipper).verifyMilestone(agreementId, 0);
      expect(await veriCargoEscrow.isProofPending(agreementId, 0)).to.equal(false);
    });
  });

  describe("Full lifecycle with resubmission", function () {
    it("should handle rejection and resubmission correctly", async function () {
      const deadline = (await getTimestamp()) + 7 * 24 * 60 * 60;
      await veriCargoEscrow.connect(shipper).createAgreement(
        carrier.address,
        totalValue,
        deadline,
        ["M1", "M2"],
        [50, 50]
      );
      const id = 0;
      await veriCargoEscrow.connect(shipper).fundAgreement(id, { value: totalValue });

      const hash1 = ethers.encodeBytes32String("proof1");
      await veriCargoEscrow.connect(carrier).submitProofHash(id, 0, hash1);
      await veriCargoEscrow.connect(shipper).rejectMilestone(id, 0);
      let ag = await veriCargoEscrow.getAgreement(id);
      expect(ag.nextVerificationIndex).to.equal(0);

      const hash2 = ethers.encodeBytes32String("proof2");
      await veriCargoEscrow.connect(carrier).submitProofHash(id, 0, hash2);
      ag = await veriCargoEscrow.getAgreement(id);
      expect(ag.pendingProofCount).to.equal(1);

      await veriCargoEscrow.connect(shipper).verifyMilestone(id, 0);
      ag = await veriCargoEscrow.getAgreement(id);
      expect(ag.nextVerificationIndex).to.equal(1);
      expect(ag.pendingProofCount).to.equal(0);
      expect(ag.releasedAmount).to.equal(totalValue * 50n / 100n);

      const hash3 = ethers.encodeBytes32String("proof3");
      await veriCargoEscrow.connect(carrier).submitProofHash(id, 1, hash3);
      await veriCargoEscrow.connect(shipper).verifyMilestone(id, 1);
      ag = await veriCargoEscrow.getAgreement(id);
      expect(ag.status).to.equal(3);
      expect(ag.releasedAmount).to.equal(totalValue);
    });
  });
});