const hre = require("hardhat");

async function main() {
  console.log("Deploying VeriCargoEscrow to Sepolia...");
  const VeriCargoEscrow =
    await hre.ethers.getContractFactory("VeriCargoEscrow");
  const escrow = await VeriCargoEscrow.deploy();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("✅ VeriCargoEscrow deployed to:", address);
  console.log("Verification period:", await escrow.VERIFICATION_PERIOD());
  console.log("Current agreement counter:", await escrow.agreementCounter());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});