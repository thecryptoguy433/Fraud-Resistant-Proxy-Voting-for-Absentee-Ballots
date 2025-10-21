import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_VOTE_ALREADY_CAST = 101;
const ERR_INVALID_ELECTION = 102;
const ERR_ELECTION_CLOSED = 103;
const ERR_INVALID_PROXY = 104;
const ERR_INVALID_VOTER = 105;
const ERR_INVALID_BALLOT = 106;
const ERR_ELECTION_NOT_STARTED = 107;
const ERR_PROXY_REVOKED = 108;
const ERR_VOTE_NOT_ALLOWED = 109;
const ERR_INVALID_DELEGATION = 110;
const ERR_AUDIT_NOT_AUTHORIZED = 111;
const ERR_INVALID_TIMESTAMP = 112;
const ERR_MAX_VOTES_EXCEEDED = 113;
const ERR_INVALID_OPTION = 114;
const ERR_ELECTION_FINALIZED = 115;
const ERR_PROXY_NOT_ASSIGNED = 116;
const ERR_INVALID_PROOF = 117;
const ERR_INSUFFICIENT_BALANCE = 118;
const ERR_TRANSFER_FAILED = 119;
const ERR_INVALID_AMOUNT = 120;

interface Vote {
  option: number;
  timestamp: number;
  proxy: string | null;
}

interface Proxy {
  proxy: string;
  delegatedAt: number;
  revoked: boolean;
}

interface VoterEligibility {
  eligible: boolean;
  votesCast: number;
}

interface AuditLog {
  action: string;
  actor: string;
  timestamp: number;
}

interface Delegation {
  voter: string;
  proxy: string;
  proofHash: Buffer;
}

interface ElectionConfig {
  start: number;
  end: number;
  active: boolean;
  finalized: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class VotingEngineMock {
  state: {
    electionActive: boolean;
    electionStart: number;
    electionEnd: number;
    maxVotesPerVoter: number;
    voteFee: number;
    admin: string;
    votes: Map<string, Vote>;
    proxies: Map<string, Proxy>;
    voterEligibility: Map<string, VoterEligibility>;
    electionOptions: Map<number, number[]>;
    electionTallies: Map<string, number>;
    auditLogs: Map<number, AuditLog>;
    delegations: Map<number, Delegation>;
    electionConfigs: Map<number, ElectionConfig>;
    voterBalances: Map<string, number>;
  } = {
    electionActive: true,
    electionStart: 0,
    electionEnd: 0,
    maxVotesPerVoter: 1,
    voteFee: 10,
    admin: "ST1ADMIN",
    votes: new Map(),
    proxies: new Map(),
    voterEligibility: new Map(),
    electionOptions: new Map(),
    electionTallies: new Map(),
    auditLogs: new Map(),
    delegations: new Map(),
    electionConfigs: new Map(),
    voterBalances: new Map(),
  };
  blockHeight: number = 100;
  caller: string = "ST1VOTER";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      electionActive: true,
      electionStart: 0,
      electionEnd: 0,
      maxVotesPerVoter: 1,
      voteFee: 10,
      admin: "ST1ADMIN",
      votes: new Map(),
      proxies: new Map(),
      voterEligibility: new Map(),
      electionOptions: new Map(),
      electionTallies: new Map(),
      auditLogs: new Map(),
      delegations: new Map(),
      electionConfigs: new Map(),
      voterBalances: new Map(),
    };
    this.blockHeight = 100;
    this.caller = "ST1VOTER";
    this.stxTransfers = [];
  }

  getVote(electionId: number, voter: string): Vote | null {
    return this.state.votes.get(`${electionId}-${voter}`) || null;
  }

  getProxy(voter: string): Proxy | null {
    return this.state.proxies.get(voter) || null;
  }

  getVoterEligibility(voter: string): VoterEligibility | null {
    return this.state.voterEligibility.get(voter) || null;
  }

  getElectionOptions(electionId: number): number[] | null {
    return this.state.electionOptions.get(electionId) || null;
  }

  getElectionTally(electionId: number, option: number): number {
    return this.state.electionTallies.get(`${electionId}-${option}`) || 0;
  }

  getAuditLog(logId: number): AuditLog | null {
    return this.state.auditLogs.get(logId) || null;
  }

  getDelegation(delegationId: number): Delegation | null {
    return this.state.delegations.get(delegationId) || null;
  }

  getElectionConfig(electionId: number): ElectionConfig | null {
    return this.state.electionConfigs.get(electionId) || null;
  }

  getVoterBalance(voter: string): number {
    return this.state.voterBalances.get(voter) || 0;
  }

  setAdmin(newAdmin: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.admin = newAdmin;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "set-admin", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  configureElection(electionId: number, start: number, end: number, options: number[]): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (start <= this.blockHeight) return { ok: false, value: ERR_INVALID_TIMESTAMP };
    if (end <= start) return { ok: false, value: ERR_INVALID_TIMESTAMP };
    this.state.electionConfigs.set(electionId, { start, end, active: true, finalized: false });
    this.state.electionOptions.set(electionId, options);
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "configure-election", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  assignProxy(voter: string, proxy: string, proofHash: Buffer): Result<number> {
    if (this.caller !== voter) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.getProxy(voter)) return { ok: false, value: ERR_INVALID_PROXY };
    const delegationId = this.state.delegations.size + 1;
    this.state.proxies.set(voter, { proxy, delegatedAt: this.blockHeight, revoked: false });
    this.state.delegations.set(delegationId, { voter, proxy, proofHash });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "assign-proxy", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: delegationId };
  }

  revokeProxy(voter: string): Result<boolean> {
    if (this.caller !== voter) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const proxy = this.getProxy(voter);
    if (!proxy) return { ok: false, value: ERR_PROXY_NOT_ASSIGNED };
    this.state.proxies.set(voter, { ...proxy, revoked: true });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "revoke-proxy", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  registerVoter(voter: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.getVoterEligibility(voter)) return { ok: false, value: ERR_INVALID_VOTER };
    this.state.voterEligibility.set(voter, { eligible: true, votesCast: 0 });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "register-voter", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  castVote(electionId: number, option: number, voter: string): Result<boolean> {
    const eligibility = this.getVoterEligibility(voter);
    if (!eligibility || !eligibility.eligible) return { ok: false, value: ERR_INVALID_VOTER };
    const config = this.getElectionConfig(electionId);
    if (!config || !config.active || this.blockHeight < config.start || this.blockHeight > config.end || config.finalized) return { ok: false, value: ERR_ELECTION_CLOSED };
    if (eligibility.votesCast >= this.state.maxVotesPerVoter) return { ok: false, value: ERR_MAX_VOTES_EXCEEDED };
    const options = this.getElectionOptions(electionId);
    if (!options || !options.includes(option)) return { ok: false, value: ERR_INVALID_OPTION };
    if (this.getVote(electionId, voter)) return { ok: false, value: ERR_VOTE_ALREADY_CAST };
    this.stxTransfers.push({ amount: this.state.voteFee, from: this.caller, to: this.state.admin });
    this.state.votes.set(`${electionId}-${voter}`, { option, timestamp: this.blockHeight, proxy: null });
    const tallyKey = `${electionId}-${option}`;
    this.state.electionTallies.set(tallyKey, (this.state.electionTallies.get(tallyKey) || 0) + 1);
    this.state.voterEligibility.set(voter, { ...eligibility, votesCast: eligibility.votesCast + 1 });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "cast-vote", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  castProxyVote(electionId: number, option: number, voter: string, proofHash: Buffer): Result<boolean> {
    const eligibility = this.getVoterEligibility(voter);
    if (!eligibility || !eligibility.eligible) return { ok: false, value: ERR_INVALID_VOTER };
    const config = this.getElectionConfig(electionId);
    if (!config || !config.active || this.blockHeight < config.start || this.blockHeight > config.end || config.finalized) return { ok: false, value: ERR_ELECTION_CLOSED };
    if (eligibility.votesCast >= this.state.maxVotesPerVoter) return { ok: false, value: ERR_MAX_VOTES_EXCEEDED };
    const options = this.getElectionOptions(electionId);
    if (!options || !options.includes(option)) return { ok: false, value: ERR_INVALID_OPTION };
    if (this.getVote(electionId, voter)) return { ok: false, value: ERR_VOTE_ALREADY_CAST };
    const proxyInfo = this.getProxy(voter);
    if (!proxyInfo || proxyInfo.proxy !== this.caller || proxyInfo.revoked) return { ok: false, value: ERR_INVALID_PROXY };
    let foundDelegation: Delegation | null = null;
    for (const del of this.state.delegations.values()) {
      if (del.voter === voter && del.proxy === this.caller && del.proofHash.equals(proofHash)) {
        foundDelegation = del;
        break;
      }
    }
    if (!foundDelegation) return { ok: false, value: ERR_INVALID_PROOF };
    this.stxTransfers.push({ amount: this.state.voteFee, from: this.caller, to: this.state.admin });
    this.state.votes.set(`${electionId}-${voter}`, { option, timestamp: this.blockHeight, proxy: this.caller });
    const tallyKey = `${electionId}-${option}`;
    this.state.electionTallies.set(tallyKey, (this.state.electionTallies.get(tallyKey) || 0) + 1);
    this.state.voterEligibility.set(voter, { ...eligibility, votesCast: eligibility.votesCast + 1 });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "cast-proxy-vote", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  finalizeElection(electionId: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const config = this.getElectionConfig(electionId);
    if (!config) return { ok: false, value: ERR_INVALID_ELECTION };
    if (this.blockHeight <= config.end) return { ok: false, value: ERR_ELECTION_CLOSED };
    if (config.finalized) return { ok: false, value: ERR_ELECTION_FINALIZED };
    this.state.electionConfigs.set(electionId, { ...config, finalized: true, active: false });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "finalize-election", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  setVoteFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFee <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.voteFee = newFee;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "set-vote-fee", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  depositBalance(amount: number): Result<boolean> {
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    this.state.voterBalances.set(this.caller, (this.state.voterBalances.get(this.caller) || 0) + amount);
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "deposit-balance", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  withdrawBalance(amount: number): Result<boolean> {
    const balance = this.getVoterBalance(this.caller);
    if (balance < amount) return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.stxTransfers.push({ amount, from: "contract", to: this.caller });
    this.state.voterBalances.set(this.caller, balance - amount);
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "withdraw-balance", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }
}

describe("VotingEngine", () => {
  let contract: VotingEngineMock;

  beforeEach(() => {
    contract = new VotingEngineMock();
    contract.reset();
  });

  it("configures election successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.configureElection(1, 101, 200, [1, 2, 3]);
    expect(result.ok).toBe(true);
    const config = contract.getElectionConfig(1);
    expect(config?.start).toBe(101);
    expect(config?.end).toBe(200);
    expect(config?.active).toBe(true);
    expect(config?.finalized).toBe(false);
    const options = contract.getElectionOptions(1);
    expect(options).toEqual([1, 2, 3]);
  });

  it("rejects election config with invalid timestamps", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.configureElection(1, 99, 150, [1, 2]);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TIMESTAMP);
  });

  it("assigns proxy successfully", () => {
    const proofHash = Buffer.from("proofhash123456789012345678901234");
    const result = contract.assignProxy("ST1VOTER", "ST2PROXY", proofHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    const proxy = contract.getProxy("ST1VOTER");
    expect(proxy?.proxy).toBe("ST2PROXY");
    expect(proxy?.revoked).toBe(false);
    const delegation = contract.getDelegation(1);
    expect(delegation?.voter).toBe("ST1VOTER");
    expect(delegation?.proxy).toBe("ST2PROXY");
    expect(delegation?.proofHash.equals(proofHash)).toBe(true);
  });

  it("rejects proxy assignment if already assigned", () => {
    contract.assignProxy("ST1VOTER", "ST2PROXY", Buffer.from("proof"));
    const result = contract.assignProxy("ST1VOTER", "ST3ANOTHER", Buffer.from("newproof"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROXY);
  });

  it("revokes proxy successfully", () => {
    contract.assignProxy("ST1VOTER", "ST2PROXY", Buffer.from("proof"));
    const result = contract.revokeProxy("ST1VOTER");
    expect(result.ok).toBe(true);
    const proxy = contract.getProxy("ST1VOTER");
    expect(proxy?.revoked).toBe(true);
  });

  it("rejects revoke if no proxy assigned", () => {
    const result = contract.revokeProxy("ST1VOTER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROXY_NOT_ASSIGNED);
  });

  it("registers voter successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.registerVoter("ST1VOTER");
    expect(result.ok).toBe(true);
    const eligibility = contract.getVoterEligibility("ST1VOTER");
    expect(eligibility?.eligible).toBe(true);
    expect(eligibility?.votesCast).toBe(0);
  });

  it("rejects duplicate voter registration", () => {
    contract.caller = "ST1ADMIN";
    contract.registerVoter("ST1VOTER");
    const result = contract.registerVoter("ST1VOTER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VOTER);
  });

  it("sets vote fee successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setVoteFee(20);
    expect(result.ok).toBe(true);
    expect(contract.state.voteFee).toBe(20);
  });

  it("rejects invalid vote fee", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setVoteFee(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("deposits balance successfully", () => {
    const result = contract.depositBalance(100);
    expect(result.ok).toBe(true);
    expect(contract.getVoterBalance("ST1VOTER")).toBe(100);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1VOTER", to: "contract" }]);
  });

  it("rejects invalid deposit amount", () => {
    const result = contract.depositBalance(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("withdraws balance successfully", () => {
    contract.depositBalance(100);
    const result = contract.withdrawBalance(50);
    expect(result.ok).toBe(true);
    expect(contract.getVoterBalance("ST1VOTER")).toBe(50);
    expect(contract.stxTransfers[1]).toEqual({ amount: 50, from: "contract", to: "ST1VOTER" });
  });

  it("rejects withdraw with insufficient balance", () => {
    const result = contract.withdrawBalance(100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_BALANCE);
  });
});