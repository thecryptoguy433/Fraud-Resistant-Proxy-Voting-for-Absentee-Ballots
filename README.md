# 🗳️ Fraud-Resistant Proxy Voting for Absentee Ballots

Welcome to a secure, transparent way to handle proxy voting for absentee ballots using the Stacks blockchain! This Web3 project addresses real-world issues like voter fraud, lack of transparency, and tampering in absentee voting systems by leveraging blockchain's immutability and smart contracts in Clarity. Voters can assign proxies securely, cast votes remotely, and verify the entire process without trusting centralized authorities.

## ✨ Features

🔒 Secure voter registration with identity verification  
🛡️ Fraud-resistant proxy assignment (revocable only by the voter)  
📩 Immutable absentee ballot casting via proxies  
✅ Real-time vote verification and audit trails  
🚫 Anti-double-voting mechanisms with on-chain checks  
📊 Transparent tallying and result announcements  
🔍 Publicly auditable election history  
🔔 Event notifications for key actions (e.g., proxy changes, vote casts)

## 🛠 How It Works

This project involves 8 smart contracts written in Clarity to ensure modularity, security, and scalability. Each contract handles a specific aspect of the voting process, reducing attack surfaces and enabling composability.

### Smart Contracts Overview
1. **VoterRegistry.clar**: Manages voter registration, storing hashed identities (e.g., via SIP-009 NFTs or external proofs) and eligibility status. Prevents duplicate registrations.  
2. **ElectionAdmin.clar**: Allows authorized admins to create and configure elections, defining ballot options, timelines, and participant criteria.  
3. **ProxyAssignment.clar**: Enables voters to assign or revoke proxies securely, with time-bound delegations and fraud checks (e.g., no circular proxies).  
4. **BallotStorage.clar**: Stores encrypted ballot details immutably, ensuring ballots are tamper-proof and only accessible during voting periods.  
5. **VotingEngine.clar**: Handles vote casting by proxies on behalf of absentee voters, enforcing one-vote-per-voter rules via on-chain validations.  
6. **VerificationOracle.clar**: Provides functions for anyone to verify vote integrity, proxy validity, and ownership without revealing sensitive data.  
7. **TallyAggregator.clar**: Computes and reveals vote tallies post-election, using zero-knowledge proofs or delayed reveals for privacy.  
8. **AuditTrail.clar**: Logs all events (e.g., registrations, votes) in an immutable ledger for post-election audits and dispute resolution.

**For Election Admins**  
- Register as an admin and call `create-election` in ElectionAdmin.clar with ballot details (e.g., candidates, deadlines).  
- Use BallotStorage.clar to upload ballot templates securely.

**For Voters**  
- Register via VoterRegistry.clar by submitting a hashed ID (e.g., from a government-issued proof).  
- Assign a proxy using ProxyAssignment.clar: Provide the proxy's principal and a delegation hash.  
- If needed, revoke with `revoke-proxy` to prevent unauthorized use.

**For Proxies**  
- Accept delegation (optional confirmation step).  
- Cast votes on behalf of absentees via VotingEngine.clar: Submit the vote with the voter's delegation proof.  
- The contract checks against double-voting using on-chain state.

**For Verifiers/Auditors**  
- Query VerificationOracle.clar with a vote ID to confirm validity.  
- Use AuditTrail.clar to fetch event logs for the entire election.  
- After the election ends, call `compute-tally` in TallyAggregator.clar for transparent results.

Boom! Votes are cast securely, with blockchain ensuring no fraud like ballot stuffing or unauthorized proxies. The system supports integration with off-chain identity providers for real-world compliance.

## 🚀 Getting Started
- Install the Clarity SDK and Stacks wallet.  
- Deploy the contracts in sequence (start with VoterRegistry).  
- Test on the Stacks testnet for fraud scenarios like attempted double-voting.  

This setup solves absentee voting fraud by making every step verifiable and immutable, promoting trust in democratic processes!