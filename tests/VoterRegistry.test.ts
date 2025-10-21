import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, principalCV, buffCV, boolCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 200;
const ERR_VOTER_ALREADY_REGISTERED = 201;
const ERR_VOTER_NOT_FOUND = 202;
const ERR_INVALID_PROOF = 203;
const ERR_INVALID_STATUS = 204;
const ERR_INVALID_TIMESTAMP = 205;
const ERR_MAX_VOTERS_EXCEEDED = 206;
const ERR_INVALID_AMOUNT = 207;
const ERR_REGISTRATION_CLOSED = 210;

interface Voter {
  principal: string;
  proofHash: Buffer;
  registeredAt: number;
  active: boolean;
}

interface AuditLog {
  action: string;
  actor: string;
  timestamp: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class VoterRegistryMock {
  state: {
    admin: string;
    maxVoters: number;
    registrationFee: number;
    registrationOpen: boolean;
    nextVoterId: number;
    voters: Map<number, Voter>;
    voterByPrincipal: Map<string, number>;
    auditLogs: Map<number, AuditLog>;
  } = {
    admin: "ST1ADMIN",
    maxVoters: 10000,
    registrationFee: 50,
    registrationOpen: true,
    nextVoterId: 1,
    voters: new Map(),
    voterByPrincipal: new Map(),
    auditLogs: new Map(),
  };
  blockHeight: number = 100;
  caller: string = "ST1ADMIN";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  reset() {
    this.state = {
      admin: "ST1ADMIN",
      maxVoters: 10000,
      registrationFee: 50,
      registrationOpen: true,
      nextVoterId: 1,
      voters: new Map(),
      voterByPrincipal: new Map(),
      auditLogs: new Map(),
    };
    this.blockHeight = 100;
    this.caller = "ST1ADMIN";
    this.stxTransfers = [];
  }

  getVoter(voterId: number): Voter | null {
    return this.state.voters.get(voterId) || null;
  }

  getVoterIdByPrincipal(voter: string): number | null {
    return this.state.voterByPrincipal.get(voter) || null;
  }

  getAuditLog(logId: number): AuditLog | null {
    return this.state.auditLogs.get(logId) || null;
  }

  getRegistrationStatus(): Result<boolean> {
    return { ok: true, value: this.state.registrationOpen };
  }

  getVoterCount(): Result<number> {
    return { ok: true, value: this.state.nextVoterId };
  }

  setAdmin(newAdmin: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.admin = newAdmin;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "set-admin", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newFee <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.registrationFee = newFee;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "set-registration-fee", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  toggleRegistration(open: boolean): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registrationOpen = open;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: open ? "open-registration" : "close-registration", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  setMaxVoters(newMax: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMax <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.maxVoters = newMax;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "set-max-voters", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  registerVoter(voter: string, proofHash: Buffer): Result<number> {
    if (!this.state.registrationOpen) return { ok: false, value: ERR_REGISTRATION_CLOSED };
    if (this.state.nextVoterId > this.state.maxVoters) return { ok: false, value: ERR_MAX_VOTERS_EXCEEDED };
    if (this.state.voterByPrincipal.has(voter)) return { ok: false, value: ERR_VOTER_ALREADY_REGISTERED };
    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.admin });
    const voterId = this.state.nextVoterId;
    this.state.voters.set(voterId, { principal: voter, proofHash, registeredAt: this.blockHeight, active: true });
    this.state.voterByPrincipal.set(voter, voterId);
    this.state.nextVoterId++;
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "register-voter", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: voterId };
  }

  updateVoterStatus(voterId: number, active: boolean): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const voter = this.getVoter(voterId);
    if (!voter) return { ok: false, value: ERR_VOTER_NOT_FOUND };
    this.state.voters.set(voterId, { ...voter, active });
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: active ? "activate-voter" : "deactivate-voter", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  verifyVoter(voterId: number, proofHash: Buffer): Result<boolean> {
    const voter = this.getVoter(voterId);
    if (!voter) return { ok: false, value: ERR_VOTER_NOT_FOUND };
    if (!voter.proofHash.equals(proofHash)) return { ok: false, value: ERR_INVALID_PROOF };
    if (!voter.active) return { ok: false, value: ERR_INVALID_STATUS };
    this.state.auditLogs.set(this.state.auditLogs.size + 1, { action: "verify-voter", actor: this.caller, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }
}

describe("VoterRegistry", () => {
  let contract: VoterRegistryMock;

  beforeEach(() => {
    contract = new VoterRegistryMock();
    contract.reset();
  });

  it("registers voter successfully", () => {
    const proofHash = Buffer.from("proofhash123456789012345678901234");
    const result = contract.registerVoter("ST1VOTER", proofHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    const voter = contract.getVoter(1);
    expect(voter?.principal).toBe("ST1VOTER");
    expect(voter?.proofHash.equals(proofHash)).toBe(true);
    expect(voter?.active).toBe(true);
    expect(contract.getVoterIdByPrincipal("ST1VOTER")).toBe(1);
    expect(contract.stxTransfers).toEqual([{ amount: 50, from: "ST1ADMIN", to: "ST1ADMIN" }]);
  });

  it("rejects duplicate voter registration", () => {
    contract.registerVoter("ST1VOTER", Buffer.from("proof"));
    const result = contract.registerVoter("ST1VOTER", Buffer.from("newproof"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTER_ALREADY_REGISTERED);
  });

  it("rejects registration when closed", () => {
    contract.toggleRegistration(false);
    const result = contract.registerVoter("ST1VOTER", Buffer.from("proof"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_REGISTRATION_CLOSED);
  });

  it("rejects registration when max voters exceeded", () => {
    contract.setMaxVoters(1);
    contract.registerVoter("ST1VOTER", Buffer.from("proof"));
    const result = contract.registerVoter("ST2VOTER", Buffer.from("proof2"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_VOTERS_EXCEEDED);
  });

  it("sets admin successfully", () => {
    const result = contract.setAdmin("ST2NEWADMIN");
    expect(result.ok).toBe(true);
    expect(contract.state.admin).toBe("ST2NEWADMIN");
    const log = contract.getAuditLog(1);
    expect(log?.action).toBe("set-admin");
  });

  it("rejects set admin by non-admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setAdmin("ST3NEWADMIN");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets registration fee successfully", () => {
    const result = contract.setRegistrationFee(100);
    expect(result.ok).toBe(true);
    expect(contract.state.registrationFee).toBe(100);
    contract.registerVoter("ST1VOTER", Buffer.from("proof"));
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1ADMIN", to: "ST1ADMIN" }]);
  });

  it("rejects invalid registration fee", () => {
    const result = contract.setRegistrationFee(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("toggles registration successfully", () => {
    const result = contract.toggleRegistration(false);
    expect(result.ok).toBe(true);
    expect(contract.state.registrationOpen).toBe(false);
    const log = contract.getAuditLog(1);
    expect(log?.action).toBe("close-registration");
  });

  it("sets max voters successfully", () => {
    const result = contract.setMaxVoters(5000);
    expect(result.ok).toBe(true);
    expect(contract.state.maxVoters).toBe(5000);
  });

  it("rejects update status for non-existent voter", () => {
    const result = contract.updateVoterStatus(99, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTER_NOT_FOUND);
  });

  it("rejects verification with invalid proof", () => {
    contract.registerVoter("ST1VOTER", Buffer.from("proof"));
    const result = contract.verifyVoter(1, Buffer.from("wrongproof"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PROOF);
  });
});