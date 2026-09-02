# VeriCargo

VeriCargo is a decentralized, milestone-based logistics escrow system built on Ethereum. It allows a shipper to lock funds in a smart contract and release payment to a carrier after individual delivery milestones are verified.

The system uses the Sepolia Ethereum testnet, MetaMask, Solidity, React, Express, and Supabase.

## Main Features

### Shipper

- Create a logistics agreement
- Select a registered and verified carrier
- Define agreement milestones
- Assign a payment percentage to each milestone
- Fund the agreement with Sepolia ETH
- View carrier proof images
- Verify or reject submitted proofs
- Release milestone payments
- Refund unreleased funds after the deadline
- View completed and refunded agreements

### Carrier

- View assigned logistics agreements
- Upload milestone proof images
- Store proof-image hashes on Ethereum
- Resubmit rejected proofs
- Receive payment after shipper verification
- Claim payment after the three-day review timeout
- View released payments and agreement history

### Account and Wallet

- Register as a shipper or carrier
- Log in using a secure HTTP-only cookie
- Update profile information
- Reset the account password
- Link one MetaMask wallet using a signed challenge
- Verify that MetaMask is connected to Sepolia
- Receive workflow notifications
- Configure notification preferences

## System Architecture

VeriCargo contains three main parts:

```text
VeriCargo/
├── frontend/       React and Vite web application
├── backend/        Express API and Supabase integration
├── blockchain/     Solidity contract and Hardhat project
├── .env.example    Required environment variables
└── README.md