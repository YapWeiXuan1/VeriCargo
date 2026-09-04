# VeriCargo

VeriCargo is a decentralized, milestone-based logistics escrow system built on Ethereum. It allows a shipper to create a logistics agreement with a carrier, lock payment in a smart contract, and release payment progressively when delivery milestones are verified.

The system combines a React web application, an Express backend, Supabase for off-chain account and application data, and an Ethereum smart contract deployed on the Sepolia test network.

## Table of Contents

* [1. Project Overview](#1-project-overview)
* [2. Main Features](#2-main-features)
* [3. System Architecture](#3-system-architecture)
* [4. Technology Stack](#4-technology-stack)
* [5. Project Structure](#5-project-structure)
* [6. Prerequisites](#6-prerequisites)
* [7. Clone the Repository](#7-clone-the-repository)
* [8. Environment Configuration](#8-environment-configuration)
* [9. Supabase Setup](#9-supabase-setup)
* [10. MetaMask Setup](#10-metamask-setup)
* [11. Sepolia RPC Setup](#11-sepolia-rpc-setup)
* [12. Blockchain Setup](#12-blockchain-setup)
* [13. Smart Contract Deployment](#13-smart-contract-deployment)
* [14. Configure the Deployed Contract](#14-configure-the-deployed-contract)
* [15. Backend Setup](#15-backend-setup)
* [16. Frontend Setup](#16-frontend-setup)
* [17. Running the Complete System](#17-running-the-complete-system)
* [18. User Registration](#18-user-registration)
* [19. Wallet Linking](#19-wallet-linking)
* [20. Shipper Workflow](#20-shipper-workflow)
* [21. Carrier Workflow](#21-carrier-workflow)
* [22. Milestone Verification](#22-milestone-verification)
* [23. Proof Image Verification](#23-proof-image-verification)
* [24. Payment and Escrow Workflow](#24-payment-and-escrow-workflow)
* [25. Refund Workflow](#25-refund-workflow)
* [26. Notification System](#26-notification-system)
* [27. API Overview](#27-api-overview)
* [28. Smart Contract Functions](#28-smart-contract-functions)
* [29. Agreement Statuses](#29-agreement-statuses)
* [30. Security Features](#30-security-features)
* [31. Troubleshooting](#31-troubleshooting)
* [32. Development Commands](#32-development-commands)
* [33. Important Notes](#33-important-notes)
* [34. Limitations](#34-limitations)
* [35. License](#35-license)

---

# 1. Project Overview

Traditional logistics payment systems normally require a trusted intermediary to hold funds and determine whether delivery conditions have been satisfied.

VeriCargo provides a blockchain-based alternative by using an Ethereum smart contract as an escrow mechanism.

The basic workflow is:

```text
Shipper
   |
   | 1. Create Agreement
   v
VeriCargo Smart Contract
   |
   | 2. Fund Agreement
   v
Escrowed Sepolia ETH
   |
   | 3. Carrier submits proof
   v
Milestone Verification
   |
   | 4. Shipper verifies
   v
Milestone Payment Released
   |
   v
Carrier
```

The payment is divided into multiple milestones. Each milestone contains a description and a percentage of the total agreement value.

For example:

```text
Total Agreement Value: 1 ETH

Milestone 1 - Pickup       20%
Milestone 2 - Departure    30%
Milestone 3 - Arrival      30%
Milestone 4 - Delivery     20%

Total                    100%
```

The carrier submits proof for each milestone. The proof is represented on-chain by a hash, while the actual proof image is handled by the backend/storage layer.

The shipper can then verify or reject the submitted proof.

---

# 2. Main Features

## 2.1 Shipper Features

A shipper can:

* Register as a shipper
* Log in to the system
* Update account information
* Reset the account password
* Connect and verify a MetaMask wallet
* Create logistics agreements
* Select a registered carrier
* Define multiple delivery milestones
* Assign payment percentages to milestones
* Fund agreements using Sepolia ETH
* View active agreements
* View carrier-submitted proof
* Verify milestones
* Reject milestones
* Allow carriers to resubmit rejected proof
* Receive workflow notifications
* Refund remaining funds after the agreement deadline
* View completed agreements
* View refunded agreements

## 2.2 Carrier Features

A carrier can:

* Register as a carrier
* Log in to the system
* Update account information
* Reset the account password
* Connect and verify a MetaMask wallet
* View assigned agreements
* View agreement milestones
* Submit proof for milestones
* Upload proof images
* Submit proof hashes to the blockchain
* Resubmit rejected milestone proof
* Receive milestone payments after verification
* Claim milestone payment if the shipper does not respond within the verification period
* View released payments
* View agreement history

## 2.3 Account and Wallet Features

The system also provides:

* User registration
* Login authentication
* HTTP-only authentication cookie handling
* JWT-based backend authentication
* Password hashing
* Profile management
* Password reset
* MetaMask wallet linking
* Signed wallet verification challenge
* Sepolia network checking
* Notification synchronization
* Notification read/dismiss functionality
* Notification preferences

---

# 3. System Architecture

VeriCargo is divided into three main application layers.

```text
┌───────────────────────────────────────────────┐
│                  FRONTEND                     │
│                                               │
│ React + Vite + React Router + Axios + ethers │
│                                               │
│ Shipper Dashboard                             │
│ Carrier Dashboard                             │
│ Agreements                                    │
│ Wallet                                        │
│ Settings                                      │
└──────────────────────┬────────────────────────┘
                       │
                       │ HTTP / REST API
                       ▼
┌───────────────────────────────────────────────┐
│                   BACKEND                     │
│                                               │
│ Express.js                                    │
│ Authentication                                │
│ Wallet verification                            │
│ Proof handling                                │
│ Notifications                                 │
│ Supabase integration                          │
└───────────────┬─────────────────┬─────────────┘
                │                 │
                │                 │
                ▼                 ▼
       ┌────────────────┐   ┌─────────────────┐
       │    SUPABASE    │   │    ETHEREUM     │
       │                │   │     SEPOLIA     │
       │ User accounts  │   │                 │
       │ Wallet data    │   │ VeriCargoEscrow │
       │ Notifications  │   │ Smart Contract  │
       │ Proof storage  │   │                 │
       └────────────────┘   └─────────────────┘
```

The frontend communicates with the backend through REST endpoints.

Blockchain transactions are performed through MetaMask using `ethers.js`.

The backend uses Supabase for off-chain application data.

---

# 4. Technology Stack

## Frontend

* React 19
* Vite
* React Router
* Axios
* ethers.js
* JavaScript
* CSS

## Backend

* Node.js
* Express.js
* Supabase JavaScript Client
* JSON Web Token
* bcrypt
* CORS
* dotenv
* ethers.js

## Blockchain

* Solidity
* Hardhat
* Hardhat Toolbox
* OpenZeppelin Contracts
* Ethereum Sepolia Testnet
* ethers.js

## External Services

* Supabase
* MetaMask
* Ethereum Sepolia RPC provider

---

# 5. Project Structure

The main repository structure is:

```text
VeriCargo/
│
├── backend/
│   ├── controller/
│   │   ├── AuthController.js
│   │   ├── notificationController.js
│   │   ├── proofController.js
│   │   └── walletController.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   └── index.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── notificationService.js
│   │   ├── proofStorageService.js
│   │   ├── supabaseClient.js
│   │   └── walletService.js
│   │
│   ├── server.js
│   └── package.json
│
├── blockchain/
│   ├── contracts/
│   │   ├── Lock.sol
│   │   └── VeriCargoEscrow.sol
│   │
│   ├── ignition/
│   ├── scripts/
│   │   └── deploy.js
│   │
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   │
│   ├── public/
│   └── package.json
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The repository currently contains the three main application components: `frontend`, `backend`, and `blockchain`.

---

# 6. Prerequisites

Before running VeriCargo, install the following software.

## 6.1 Node.js

Install Node.js.

Check the installation:

```bash
node -v
```

and:

```bash
npm -v
```

A recent Node.js LTS version is recommended.

---

## 6.2 Git

Check Git:

```bash
git --version
```

---

## 6.3 MetaMask

Install the MetaMask browser extension.

MetaMask is required because the frontend uses the browser wallet to:

* Connect the user's wallet
* Sign wallet verification challenges
* Sign blockchain transactions
* Fund agreements
* Submit milestone proofs
* Verify milestones
* Release payments
* Request refunds

---

## 6.4 Supabase Account

A Supabase project is required for the backend application.

Create a Supabase project before running the backend.

---

## 6.5 Sepolia Wallet

Create or use a MetaMask wallet specifically for testing.

Do not use a mainnet wallet for development if it contains real funds.

The project is configured for Ethereum Sepolia with:

```text
Chain ID: 11155111
```

The frontend checks that MetaMask is connected to Sepolia before interacting with the escrow contract.

---

# 7. Clone the Repository

Clone the project:

```bash
git clone https://github.com/YapWeiXuan1/VeriCargo.git
```

Enter the project:

```bash
cd VeriCargo
```

Check the project files:

```bash
dir
```

On macOS/Linux:

```bash
ls
```

You should see:

```text
backend
blockchain
frontend
.env.example
package.json
README.md
```

---

# 8. Environment Configuration

The repository provides an `.env.example` file.

The current example contains:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=replace-with-at-least-32-random-bytes
SEPOLIA_RPC_URL=
VITE_API_URL=/api
VITE_CONTRACT_ADDRESS=
```

The project also requires `PRIVATE_KEY` for Hardhat Sepolia deployment, because `hardhat.config.js` reads `process.env.PRIVATE_KEY`.

Create a file named:

```text
.env
```

in the **root VeriCargo directory**:

```text
VeriCargo/
├── .env
├── .env.example
├── backend/
├── blockchain/
└── frontend/
```

The backend loads this root `.env` file using:

```text
../.env
```

and the blockchain configuration also loads the root `.env` file.

---

## 8.1 Root `.env`

Example:

```env
PORT=5000

FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

JWT_SECRET=YOUR_LONG_RANDOM_SECRET

SEPOLIA_RPC_URL=https://YOUR_SEPOLIA_RPC_ENDPOINT

PRIVATE_KEY=YOUR_TEST_WALLET_PRIVATE_KEY

VITE_API_URL=/api

VITE_CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
```

Replace every placeholder with your own value.

---

## 8.2 Important Security Warning

Never commit the following information to GitHub:

```text
.env
PRIVATE_KEY
JWT_SECRET
Supabase credentials
wallet private keys
API secrets
```

The `.gitignore` file should be used to prevent `.env` from being committed.

The `PRIVATE_KEY` is particularly sensitive.

Do not use the private key of a wallet containing real cryptocurrency.

For this project, use a test wallet with Sepolia ETH.

---

# 9. Supabase Setup

The backend uses Supabase through the Supabase JavaScript client.

The client is initialized using:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

The backend's Supabase client reads these values from the root `.env` file.

---

## 9.1 Create a Supabase Project

Create a new project in Supabase.

After creating the project:

1. Open the Supabase project.
2. Go to the project settings.
3. Locate the API settings.
4. Copy the project URL.
5. Copy the required API key.
6. Add them to `.env`.

Example:

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxxxxx
```

---

## 9.2 Required User Data

The current backend expects a `users` table.

The authentication service reads and writes fields including:

```text
id
full_name
company_email
password
role
wallet_address
wallet_verified_at
```

The authentication code uses the `users` table for:

* Registration
* Login
* Profile updates
* Password changes
* Carrier searching
* Wallet information

For example, registration inserts:

```text
full_name
company_email
password
role
```

and carrier searches use:

```text
full_name
company_email
wallet_address
```

### Important

The current repository does **not** include a SQL migration/schema file.

Therefore, the exact database constraints, indexes, foreign keys, and Row Level Security policies should be configured according to the database structure used by your deployed project rather than copied from an invented SQL script.

---

## 9.3 Wallet Challenge Data

The backend also uses a:

```text
wallet_link_challenges
```

table.

This is used when a user links a MetaMask wallet.

The challenge mechanism allows the backend to verify that the user controls the wallet by checking a signed message.

---

## 9.4 Notification Data

The notification system uses a:

```text
notifications
```

table.

Notifications are associated with the authenticated user and can be:

* Retrieved
* Synchronized
* Marked as read
* Marked as read in bulk
* Dismissed
* Dismissed in bulk

---

# 10. MetaMask Setup

Install MetaMask and create a test wallet.

After creating the wallet:

1. Open MetaMask.
2. Switch to **Sepolia Test Network**.
3. Copy the wallet address.
4. Obtain Sepolia ETH from a Sepolia faucet.
5. Keep enough ETH to pay for test transactions.

The wallet must remain connected to Sepolia when using VeriCargo.

The frontend checks the connected network and rejects blockchain interactions if the wallet is not using Sepolia.

---

# 11. Sepolia RPC Setup

The Hardhat configuration uses:

```env
SEPOLIA_RPC_URL=
```

The RPC endpoint is used by Hardhat when deploying the smart contract.

You can obtain a Sepolia RPC endpoint from an Ethereum RPC provider.

After obtaining the endpoint:

```env
SEPOLIA_RPC_URL=YOUR_SEPOLIA_RPC_URL
```

The configured network is:

```text
Network: Sepolia
Chain ID: 11155111
```

The project's Hardhat configuration explicitly defines Sepolia using chain ID `11155111`.

---

# 12. Blockchain Setup

Enter the blockchain directory:

```bash
cd blockchain
```

Install the dependencies:

```bash
npm install
```

The blockchain package uses:

* Hardhat
* Hardhat Toolbox
* dotenv
* OpenZeppelin Contracts

Return to the project root:

```bash
cd ..
```

---

# 13. Smart Contract Deployment

The main escrow contract is:

```text
blockchain/contracts/VeriCargoEscrow.sol
```

The contract is compiled using Solidity `0.8.28` in the Hardhat configuration.

---

## 13.1 Compile the Contract

Enter the blockchain directory:

```bash
cd blockchain
```

Run:

```bash
npx hardhat compile
```

If compilation succeeds, Hardhat generates the compiled contract artifacts.

---

## 13.2 Deploy to Sepolia

The repository contains:

```text
blockchain/scripts/deploy.js
```

The deployment script obtains the `VeriCargoEscrow` contract factory, deploys the contract, waits for deployment, and prints the resulting contract address.

Run:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

A successful deployment should print something similar to:

```text
Deploying VeriCargoEscrow to Sepolia...
VeriCargoEscrow deployed to: 0x...
Verification period: ...
Current agreement counter: ...
```

Copy the deployed contract address.

---

# 14. Configure the Deployed Contract

After deployment, update the root `.env`:

```env
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

The frontend escrow service reads:

```text
import.meta.env.VITE_CONTRACT_ADDRESS
```

to determine which smart contract it should communicate with.

For example:

```env
VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

Do not use the example address above.

Use the actual address returned by your deployment.

---

# 15. Backend Setup

Open another terminal.

From the project root:

```bash
cd backend
```

Install backend dependencies:

```bash
npm install
```

The backend uses:

* Express
* Supabase
* bcrypt
* CORS
* dotenv
* ethers
* jsonwebtoken

---

## 15.1 Start the Backend

Run:

```bash
npm start
```

The backend uses:

```text
node server.js
```

as its start command.

The server uses:

```env
PORT=5000
```

and exposes its API under:

```text
/api
```

The server configuration mounts:

```text
app.use('/api', routes)
```

and allows the frontend origin configured through:

```env
FRONTEND_URL=http://localhost:5173
```

A successful startup should show:

```text
Backend running on http://localhost:5000
```

---

# 16. Frontend Setup

Open another terminal.

From the project root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

The frontend package uses:

* React
* React DOM
* React Router
* Axios
* ethers
* Vite

---

## 16.1 Start the Frontend

Run:

```bash
npm run dev
```

The frontend uses Vite.

Normally the application will be available at:

```text
http://localhost:5173
```

The frontend API service defaults to:

```text
/api
```

through:

```env
VITE_API_URL=/api
```

The Axios client uses this value as its backend base URL.

---

# 17. Running the Complete System

For normal development, three components need to be available:

### Terminal 1 — Backend

```bash
cd VeriCargo/backend
npm install
npm start
```

Expected:

```text
Backend running on http://localhost:5000
```

### Terminal 2 — Frontend

```bash
cd VeriCargo/frontend
npm install
npm run dev
```

Expected:

```text
http://localhost:5173
```

### Blockchain

The blockchain does not need a local Hardhat node for normal Sepolia usage.

The deployed `VeriCargoEscrow` contract runs on Sepolia and MetaMask signs transactions from the user's browser.

---

# 18. User Registration

Open the frontend:

```text
http://localhost:5173
```

Create an account.

A user must provide the required registration information and select an appropriate role.

Supported application roles include:

```text
shipper
carrier
```

The backend hashes passwords using bcrypt before storing them.

The registration process sends the user's information to:

```text
POST /api/auth/register
```

The authentication service checks whether the company email is already registered before creating the account.

---

# 19. Wallet Linking

After registration, the user can link a MetaMask wallet.

The wallet linking process is intentionally different from simply entering a wallet address.

The process is:

```text
User
 |
 | Connect MetaMask
 v
Frontend obtains wallet address
 |
 | Request challenge
 v
Backend creates signed challenge message
 |
 | Sign message using MetaMask
 v
User signature
 |
 | Send signature to backend
 v
Backend verifies signature
 |
 v
Wallet linked to account
```

The backend maintains wallet-link challenges in:

```text
wallet_link_challenges
```

The frontend communicates through:

```text
POST /api/wallet/request-challenge
POST /api/wallet/verify-challenge
```

Only one registered wallet is intended to be linked to an account.

---

# 20. Shipper Workflow

The shipper workflow is:

```text
Register
   ↓
Login
   ↓
Link MetaMask
   ↓
Select Carrier
   ↓
Create Agreement
   ↓
Define Milestones
   ↓
Fund Agreement
   ↓
Wait for Carrier Proof
   ↓
Review Proof
   ↓
Verify / Reject
   ↓
Milestone Payment Released
   ↓
Repeat Until Completed
```

---

## 20.1 Create an Agreement

The shipper selects a carrier and defines:

* Carrier wallet
* Total agreement value
* Agreement deadline
* Milestone descriptions
* Milestone percentages

The percentages must total exactly:

```text
100%
```

For example:

```text
Pickup       25%
Departure    25%
Arrival      25%
Delivery     25%

Total        100%
```

The smart contract rejects agreements when the milestone percentages do not total 100%.

---

## 20.2 Fund the Agreement

After creating an agreement, the shipper funds it through MetaMask.

The exact agreement value must be supplied.

The smart contract checks:

```text
msg.value == totalValue
```

If the amount is incorrect, the transaction is rejected.

---

# 21. Carrier Workflow

The carrier workflow is:

```text
Login
   ↓
Link MetaMask
   ↓
View Assigned Agreement
   ↓
View Current Milestone
   ↓
Upload Proof
   ↓
Proof Hash Generated
   ↓
Submit Hash to Blockchain
   ↓
Wait for Shipper Verification
   ↓
Payment Released
```

The carrier can also resubmit proof if the shipper rejects a milestone.

---

# 22. Milestone Verification

Milestones are processed sequentially.

The smart contract maintains:

```text
nextProofIndex
```

for carrier proof submission and:

```text
nextVerificationIndex
```

for shipper verification.

This prevents milestones from being verified out of sequence.

For example:

```text
Milestone 1
    ↓
Verify
    ↓
Milestone 2
    ↓
Verify
    ↓
Milestone 3
    ↓
Verify
```

The shipper cannot skip directly from Milestone 1 to Milestone 3.

---

# 23. Proof Image Verification

When the carrier uploads a proof image, the backend receives the image data.

The backend limits proof images to a maximum size of:

```text
10 MB
```

The proof-storage service calculates a cryptographic hash for the proof.

The blockchain stores the resulting proof hash rather than the complete image.

This creates the following architecture:

```text
Proof Image
     |
     v
Backend
     |
     | SHA-256 / proof hash
     v
Blockchain
     |
     | stores bytes32 hash
     v
VeriCargoEscrow
```

The frontend can later retrieve the proof image and calculate its hash again.

If the calculated hash does not match the hash stored on-chain, the proof is considered invalid.

The frontend explicitly compares the calculated hash against the on-chain proof hash before displaying the proof image as valid.

---

# 24. Payment and Escrow Workflow

The smart contract acts as the escrow mechanism.

The payment process is:

```text
Shipper
   |
   | Fund Agreement
   v
Smart Contract
   |
   | Holds Sepolia ETH
   |
   | Milestone verified
   v
Carrier receives milestone payment
```

The carrier does not receive the full payment immediately.

Instead, each milestone releases a percentage of the agreement value.

For example:

```text
Agreement Value = 1 ETH

Milestone 1 = 20%
Release = 0.20 ETH

Milestone 2 = 30%
Release = 0.30 ETH

Milestone 3 = 50%
Release = 0.50 ETH
```

The final milestone releases the remaining balance.

The smart contract tracks:

```text
totalValue
fundedAmount
releasedAmount
```

---

# 25. Refund Workflow

If an agreement reaches its deadline and unreleased funds remain, the shipper can request a refund.

The smart contract checks:

```text
block.timestamp > deadline
```

The refund cannot be performed before the deadline.

The contract also checks that there are no pending proofs awaiting a decision.

This prevents the shipper from refunding funds while a submitted proof is still awaiting resolution.

The relevant smart contract conditions include:

```text
DeadlineNotPassed
PendingProofExists
NoFundsToRefund
```

---

# 26. Notification System

VeriCargo contains a workflow notification system.

Notifications can inform users about events such as:

* Agreement updates
* Milestone activity
* Verification activity
* Agreement completion
* Refunds
* Wallet connection requirements

The frontend synchronizes notification data with the backend.

Available operations include:

```text
Get notifications
Sync notifications
Mark notification as read
Mark all as read
Dismiss notification
Dismiss all notifications
```

These are exposed through backend API endpoints.

The notification service stores notification records in the Supabase `notifications` table.

---

# 27. API Overview

The backend API is mounted under:

```text
/api
```

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PUT  /api/auth/profile
POST /api/auth/reset-password
```

---

## Carrier Search

```text
GET /api/carriers
```

This is used when a shipper searches for a registered carrier.

The backend only returns carrier accounts that have a wallet address registered.

---

## Wallet

```text
GET  /api/wallet/status
POST /api/wallet/request-challenge
POST /api/wallet/verify-challenge
```

---

## Proofs

```text
POST /api/proofs
GET  /api/proofs/:proofHash
```

The proof endpoints require authentication.

---

## Notifications

```text
GET   /api/notifications
POST  /api/notifications/sync
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
PATCH /api/notifications/:id/dismiss
PATCH /api/notifications/dismiss-all
```

The current route configuration exposes these notification endpoints under `/api`.

---

# 28. Smart Contract Functions

The frontend communicates with the following main functions of `VeriCargoEscrow`.

## Create Agreement

```solidity
createAgreement(
    address carrier,
    uint256 totalValue,
    uint256 deadline,
    string[] descriptions,
    uint8[] percentages
)
```

Creates a new agreement.

---

## Fund Agreement

```solidity
fundAgreement(uint256 agreementId)
```

The shipper deposits the required amount into the escrow contract.

---

## Submit Proof

```solidity
submitProofHash(
    uint256 agreementId,
    uint256 milestoneIndex,
    bytes32 hash
)
```

The carrier submits the proof hash for a milestone.

---

## Verify Milestone

```solidity
verifyMilestone(
    uint256 agreementId,
    uint256 milestoneIndex
)
```

The shipper approves a milestone and releases its payment.

---

## Reject Milestone

```solidity
rejectMilestone(
    uint256 agreementId,
    uint256 milestoneIndex
)
```

The shipper rejects the proof.

A rejected milestone can be resubmitted by the carrier.

---

## Claim After Verification Timeout

```solidity
claimAfterVerificationTimeout(
    uint256 agreementId,
    uint256 milestoneIndex
)
```

Allows the carrier to claim a milestone payment when the shipper has not verified the proof within the configured verification period.

---

## Refund

```solidity
refund(uint256 agreementId)
```

Returns remaining unreleased funds to the shipper after the agreement deadline, subject to the contract conditions.

---

## View Agreement

```solidity
getAgreement(uint256 agreementId)
```

Returns agreement information and milestone information.

---

## Shipper Agreements

```solidity
getShipperAgreements(address shipper)
```

Returns agreements created by a shipper.

---

## Carrier Agreements

```solidity
getCarrierAgreements(address carrier)
```

Returns agreements assigned to a carrier.

---

# 29. Agreement Statuses

The smart contract defines five agreement statuses.

```text
0 = Pending
1 = Funded
2 = InProgress
3 = Completed
4 = Refunded
```

## Pending

The agreement has been created but has not yet been funded.

```text
Create Agreement
       ↓
    Pending
```

---

## Funded

The shipper has deposited the complete agreement value.

```text
Pending
   ↓
Fund Agreement
   ↓
Funded
```

---

## In Progress

The carrier has started submitting milestone proofs.

```text
Funded
   ↓
Submit Proof
   ↓
In Progress
```

---

## Completed

All milestones have been verified and the corresponding payments have been released.

```text
In Progress
     ↓
All milestones verified
     ↓
Completed
```

---

## Refunded

The agreement has passed its deadline and remaining eligible funds have been returned to the shipper.

```text
In Progress
     ↓
Deadline passed
     ↓
Refund
     ↓
Refunded
```

---

# 30. Security Features

VeriCargo includes several security mechanisms.

## 30.1 Password Hashing

User passwords are hashed using bcrypt before being stored.

The backend does not store passwords as plain text.

---

## 30.2 JWT Authentication

The backend generates JWT tokens after successful authentication.

The token includes information such as:

```text
User ID
Email
Role
```

The token has:

```text
Issuer: vericargo-api
Audience: vericargo-web
```

The default expiry is:

```text
1 day
```

or:

```text
30 days
```

when the user selects the remember-me option.

---

## 30.3 Wallet Signature Verification

A user does not simply enter a wallet address and automatically become verified.

Instead, the system uses a signed challenge.

This helps demonstrate control of the wallet associated with the account.

---

## 30.4 Sepolia Network Restriction

The frontend checks:

```text
Chain ID = 11155111
```

before accessing the escrow contract.

If MetaMask is connected to another network, the application requests that the user switch to Sepolia.

---

## 30.5 Smart Contract Authorization

The smart contract restricts operations using the shipper and carrier addresses associated with an agreement.

For example:

```solidity
onlyShipper(...)
```

is used for shipper-only operations.

Similarly:

```solidity
onlyCarrier(...)
```

is used for carrier-only operations.

---

## 30.6 Reentrancy Protection

The smart contract contains a reentrancy guard.

Functions that transfer funds use the `nonReentrant` modifier.

This provides protection against reentrancy attacks during payment and refund operations.

---

## 30.7 Proof Hash Integrity

The actual proof image is not stored directly inside the blockchain transaction.

Instead:

```text
Image
  ↓
Hash
  ↓
Blockchain
```

The hash can later be recalculated to determine whether the retrieved proof matches the proof originally submitted.

---

# 31. Troubleshooting

## 31.1 `VITE_CONTRACT_ADDRESS is not configured`

Error:

```text
VITE_CONTRACT_ADDRESS is not configured.
```

Solution:

Check the root `.env` file:

```env
VITE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Then restart the Vite server:

```bash
npm run dev
```

The frontend reads this value when the application starts.

---

## 31.2 MetaMask is on the Wrong Network

If the application says:

```text
Switch MetaMask to the Sepolia testnet.
```

open MetaMask and switch to:

```text
Sepolia
```

The application requires chain ID:

```text
11155111
```

---

## 31.3 Backend Does Not Start

Check:

```bash
cd backend
npm install
npm start
```

Confirm `.env` exists in the root:

```text
VeriCargo/.env
```

Check:

```env
PORT=5000
```

The backend server reads the root `.env` file.

---

## 31.4 Supabase Errors

If login or registration fails:

Check:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Also confirm the required database tables exist.

The backend currently expects at least:

```text
users
wallet_link_challenges
notifications
```

The authentication service specifically accesses the `users` table.

---

## 31.5 JWT Errors

Check:

```env
JWT_SECRET=
```

Use a long random secret.

Example:

```env
JWT_SECRET=replace-this-with-a-long-random-secret
```

Do not use a short or predictable secret in a deployed system.

---

## 31.6 Contract Deployment Fails

Check:

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
```

Make sure:

1. The RPC endpoint is valid.
2. The wallet private key belongs to the deployment wallet.
3. The deployment wallet has Sepolia ETH.
4. The network is Sepolia.
5. Hardhat dependencies are installed.

Run:

```bash
cd blockchain
npm install
npx hardhat compile
```

Then:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## 31.7 Transaction Fails Because of Insufficient ETH

Sepolia transactions still require gas.

Make sure the MetaMask test wallet has enough Sepolia ETH.

This applies to:

* Creating agreements
* Funding agreements
* Submitting proofs
* Verifying milestones
* Rejecting milestones
* Claiming timeout payments
* Refunds

---

## 31.8 Agreement Funding Amount Is Incorrect

The smart contract requires the funding amount to exactly match the agreement's `totalValue`.

If the agreement requires:

```text
1 ETH
```

the funding transaction must send:

```text
1 ETH
```

Sending a different amount causes the transaction to fail.

---

## 31.9 Proof Cannot Be Submitted

Check:

* MetaMask is connected
* MetaMask is using Sepolia
* The connected wallet belongs to the registered carrier
* The agreement is funded
* The milestone has not already been verified
* The agreement deadline has not passed
* The correct milestone is being submitted
* The proof hash is not empty

---

## 31.10 Milestone Cannot Be Verified

Check:

* The connected wallet belongs to the shipper
* The milestone has a submitted proof
* The milestone is the next milestone requiring verification
* The milestone has not already been rejected or verified
* The three-day verification period has not expired

---

## 31.11 Frontend Cannot Reach Backend

Check that the backend is running:

```text
http://localhost:5000
```

and the frontend is running:

```text
http://localhost:5173
```

The frontend Axios client defaults to:

```text
/api
```

through:

```env
VITE_API_URL=/api
```

---

# 32. Development Commands

## Install Root Dependencies

From the root:

```bash
npm install
```

The root package currently contains the `dotenv` dependency.

---

## Install Backend Dependencies

```bash
cd backend
npm install
```

---

## Start Backend

```bash
npm start
```

---

## Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## Start Frontend

```bash
npm run dev
```

---

## Build Frontend

```bash
npm run build
```

---

## Preview Frontend Build

```bash
npm run preview
```

---

## Run Frontend Linter

```bash
npm run lint
```

---

## Install Blockchain Dependencies

```bash
cd blockchain
npm install
```

---

## Compile Smart Contracts

```bash
npx hardhat compile
```

---

## Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

# 33. Important Notes

## 33.1 Use Sepolia for Development

VeriCargo is currently configured for Ethereum Sepolia.

Do not deploy or test the project with real ETH unless the application has been specifically redesigned for mainnet use.

---

## 33.2 Keep Private Keys Secret

Never place a private key directly inside:

```text
hardhat.config.js
```

or source code.

The current configuration reads:

```text
process.env.PRIVATE_KEY
```

from the environment.

---

## 33.3 Restart Vite After Changing Environment Variables

If you change:

```env
VITE_CONTRACT_ADDRESS
```

or another Vite environment variable, stop the frontend server and start it again:

```bash
npm run dev
```

---

## 33.4 Contract Address Must Match Deployment

If you redeploy the contract, the contract address changes.

Update:

```env
VITE_CONTRACT_ADDRESS
```

with the new deployment address.

---

## 33.5 Keep MetaMask Connected

When performing blockchain operations, make sure the wallet currently selected in MetaMask is the same wallet associated with the VeriCargo account.

The system uses the connected wallet address when interacting with the smart contract.

---

# 34. Limitations

The current project is intended primarily as a blockchain application prototype and academic project.

The following points should be considered when deploying the system in a production environment.

## 34.1 Sepolia Testnet

The system currently uses Sepolia rather than Ethereum Mainnet.

Therefore, the ETH used by the system is testnet ETH.

---

## 34.2 Database Schema

The repository does not currently include a complete Supabase database migration file.

The database must therefore be configured separately.

---

## 34.3 Proof Storage

The blockchain stores proof hashes rather than the complete proof image.

This reduces the amount of data stored on-chain.

---

## 34.4 Smart Contract Immutability

Once a smart contract is deployed, changing its Solidity source code does not automatically change the already deployed contract.

If the contract logic is changed, a new deployment is normally required and the frontend contract address must be updated.

---

# 35. License

This project is developed as an academic software project.

The project is intended for educational and demonstration purposes.

---

# Quick Start

For experienced developers, the minimum setup process is:

```bash
# 1. Clone
git clone https://github.com/YapWeiXuan1/VeriCargo.git
cd VeriCargo

# 2. Create root environment file
# Create .env and configure:
# PORT
# FRONTEND_URL
# SUPABASE_URL
# SUPABASE_ANON_KEY
# JWT_SECRET
# SEPOLIA_RPC_URL
# PRIVATE_KEY
# VITE_API_URL
# VITE_CONTRACT_ADDRESS

# 3. Install blockchain dependencies
cd blockchain
npm install

# 4. Compile contract
npx hardhat compile

# 5. Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 6. Copy deployed contract address into .env
# VITE_CONTRACT_ADDRESS=0x...

# 7. Start backend
cd ../backend
npm install
npm start

# 8. Start frontend in another terminal
cd ../frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

Make sure MetaMask is connected to:

```text
Ethereum Sepolia
Chain ID: 11155111
```

The complete VeriCargo workflow is then:

```text
Register
   ↓
Login
   ↓
Link MetaMask
   ↓
Shipper creates agreement
   ↓
Carrier selected
   ↓
Milestones defined
   ↓
Shipper funds agreement
   ↓
Carrier submits proof
   ↓
Proof hash stored on blockchain
   ↓
Shipper reviews proof
   ↓
Verify / Reject
   ↓
Payment released
   ↓
Next milestone
   ↓
All milestones completed
   ↓
Agreement Completed
```
