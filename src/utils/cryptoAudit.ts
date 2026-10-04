import { AuditEvent, Role } from '../types';

/**
 * Calculates a SHA-256 hash of a string using the native Web Crypto API.
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ChainedAuditEvent extends AuditEvent {
  prevHash: string;
  hash: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Generates an append-only audit event with cryptographic chaining.
 */
export async function createChainedAuditEvent(
  params: {
    actorId: string;
    actorName: string;
    actorRole: Role;
    action: string;
    targetType: string;
    targetId: string;
    reason: string;
    ip?: string;
  },
  previousEvents: ChainedAuditEvent[]
): Promise<ChainedAuditEvent> {
  const prevHash = previousEvents.length > 0 ? previousEvents[0].hash : GENESIS_HASH;
  const ts = new Date().toISOString();
  const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const ip = params.ip || '197.239.4.18 (NITA-U Govnet)';

  const payloadToHash = `${prevHash}|${ts}|${params.actorId}|${params.action}|${params.targetType}|${params.targetId}|${params.reason}|${ip}`;
  const hash = await sha256(payloadToHash);

  return {
    id,
    ts,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    reason: params.reason,
    ip,
    prevHash,
    hash,
  };
}

/**
 * Validates the cryptographic integrity of an audit chain.
 * Returns true if every link's hash matches the expected SHA-256 value.
 */
export async function verifyAuditChain(
  events: ChainedAuditEvent[]
): Promise<{ valid: boolean; brokenIndex?: number; message: string }> {
  if (events.length === 0) {
    return { valid: true, message: 'Audit chain is empty and valid.' };
  }

  // Iterate backwards from oldest to newest (or according to list order)
  const sorted = [...events].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
  );

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    if (ev.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        brokenIndex: i,
        message: `Broken chain link at index ${i} (ID: ${ev.id}). Expected prevHash ${expectedPrevHash.substring(0, 10)}..., found ${ev.prevHash.substring(0, 10)}...`,
      };
    }

    const payload = `${ev.prevHash}|${ev.ts}|${ev.actorId}|${ev.action}|${ev.targetType}|${ev.targetId}|${ev.reason}|${ev.ip}`;
    const calculated = await sha256(payload);

    if (calculated !== ev.hash) {
      return {
        valid: false,
        brokenIndex: i,
        message: `Tampered record at index ${i} (ID: ${ev.id}). Calculated hash does not match stored hash.`,
      };
    }

    expectedPrevHash = ev.hash;
  }

  return {
    valid: true,
    message: `All ${events.length} audit records verified. Zero tampering detected.`,
  };
}
