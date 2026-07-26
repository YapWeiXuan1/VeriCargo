require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  // networks: {
    // // Local testing blockchain
    // hardhat: {
    //   accounts: {
    //     mnemonic:
    //       "test test test test test test test test test test test junk"
    //   }
    // },

    // // Sepolia testnet
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL,
    //   accounts: [
    //     process.env.PRIVATE_KEY
    //   ],
    //   chainId: 11155111,
    // }
  // }
};
