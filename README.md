# 🏛 PreserveNet: Decentralized Cultural Preservation Platform

Welcome to a groundbreaking Web3 platform that empowers communities to preserve cultural heritage sites through decentralized crowdfunding and governance, built on the Stacks blockchain using Clarity smart contracts.

## ✨ Features

- 💰 **Tokenized Crowdfunding**: Donors contribute STX (Stacks' native token) to fund restoration projects and receive tokenized rewards (NFTs) for virtual tours.
- 🗳 **Decentralized Governance**: Donors holding governance tokens vote on fund allocation and project priorities.
- 🔍 **Transparency**: All transactions and fund usage are recorded immutably on the blockchain.
- 🎥 **Virtual Tour Rewards**: Donors unlock exclusive virtual tours of restored sites based on their contribution tier.
- 🛡 **Project Verification**: Ensures only verified cultural heritage projects can launch campaigns.
- 📊 **Progress Tracking**: Publicly accessible project updates and fund utilization reports.
- 🔄 **Reward Redemption**: Donors redeem NFTs for virtual tours or trade them on secondary markets.

## 🛠 How It Works

### For Donors
1. Browse verified cultural heritage preservation projects.
2. Contribute STX to a project’s funding campaign.
3. Receive **Preservation NFTs** based on contribution tier (e.g., Bronze, Silver, Gold).
4. Use NFTs to access exclusive virtual tours or hold them for governance voting.
5. Vote on project milestones and fund allocation using governance tokens.

### For Project Owners
1. Submit a preservation project for verification (e.g., historical site, artifact restoration).
2. Launch a crowdfunding campaign with a funding goal and timeline.
3. Provide regular updates on restoration progress.
4. Allocate funds transparently via smart contracts.

### For Verifiers
1. Review and approve project submissions based on authenticity and feasibility.
2. Monitor fund usage and project milestones.

## 📜 Smart Contracts (Written in Clarity)

This project uses 8 Clarity smart contracts to manage the platform’s functionality:

1. **ProjectRegistry.clar**: Registers and verifies cultural heritage projects.
   - Stores project details (ID, title, description, location, funding goal).
   - Allows verifiers to approve or reject projects.
2. **Crowdfunding.clar**: Manages crowdfunding campaigns.
   - Tracks contributions and funding progress.
   - Enforces funding deadlines and goal checks.
3. **PreservationNFT.clar**: Mints and manages NFTs for donors.
   - Issues tiered NFTs (Bronze, Silver, Gold) based on contribution amounts.
   - Tracks NFT ownership and metadata.
4. **GovernanceToken.clar**: Issues governance tokens for voting.
   - Distributes tokens proportional to contributions.
   - Tracks token balances and voting rights.
5. **Voting.clar**: Handles decentralized governance.
   - Allows token holders to vote on fund allocation and project milestones.
   - Ensures one-token-one-vote with a quorum threshold.
6. **FundEscrow.clar**: Secures and disburses funds.
   - Locks funds until milestones are approved by governance.
   - Refunds donors if a campaign fails to meet its goal.
7. **VirtualTourAccess.clar**: Manages access to virtual tours.
   - Verifies NFT ownership for tour access.
   - Tracks redeemed tours to prevent reuse.
8. **ProgressTracking.clar**: Records project updates and milestones.
   - Allows project owners to post immutable updates.
   - Provides public access to progress reports.

## 🚀 Getting Started

### Prerequisites
- Stacks blockchain wallet (e.g., Hiro Wallet).
- STX tokens for contributions.
- Clarity development environment for deploying contracts.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/preservenets.git
   ```
2. Deploy the Clarity smart contracts to the Stacks blockchain using Clarinet.
3. Set up a frontend (e.g., React with Stacks.js) to interact with the contracts.
4. Configure a backend to host virtual tour content (off-chain, linked via NFTs).

### Usage
- **Project Owners**: Register a project via `ProjectRegistry.clar` and launch a campaign using `Crowdfunding.clar`.
- **Donors**: Contribute STX via `Crowdfunding.clar`, receive NFTs from `PreservationNFT.clar`, and access tours via `VirtualTourAccess.clar`.
- **Verifiers**: Approve projects using `ProjectRegistry.clar` and monitor progress via `ProgressTracking.clar`.
- **Governance**: Vote on proposals using `Voting.clar` with tokens from `GovernanceToken.clar`.

## 🛡 Security Considerations
- **Immutability**: All transactions are recorded on the Stacks blockchain for transparency.
- **Access Control**: Only verified project owners can launch campaigns, and only NFT holders can access virtual tours.
- **Fund Safety**: Funds are locked in `FundEscrow.clar` until governance approves disbursements.
- **Non-Duplication**: `ProjectRegistry.clar` prevents duplicate project registrations.

## 🌍 Impact
This platform empowers global communities to preserve cultural heritage by:
- Enabling transparent, decentralized funding.
- Rewarding donors with unique digital experiences (virtual tours).
- Giving stakeholders a voice in preservation decisions through governance.
- Ensuring accountability with immutable progress tracking.

## 📚 Example Workflow
1. A project owner submits a restoration campaign for an ancient temple.
2. Verifiers approve the project after validation.
3. Donors contribute 100 STX and receive a Silver-tier NFT.
4. The campaign reaches its 10,000 STX goal, and funds are locked in escrow.
5. Donors vote to release funds for the first milestone (e.g., structural repairs).
6. The project owner posts progress updates (e.g., photos, videos).
7. Donors redeem NFTs for a virtual tour of the restored temple.

## 🔗 Resources
- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language](https://docs.stacks.co/clarity)
- [Hiro Wallet](https://www.hiro.so/wallet)

Let’s preserve cultural heritage together, one block at a time! 🏛