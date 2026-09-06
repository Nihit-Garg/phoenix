/**
 * signaling/validation.ts — Zod schemas for all Socket.IO event payloads
 *
 * Exports one Zod schema per incoming event payload.
 * Used in every handler to validate before processing.
 *
 * See: API_SPEC.md → all client-emitted events for payload shapes
 */

import { z } from 'zod';

// ── join ─────────────────────────────────────────────────────────────────────

/** Validates JoinPayload — emitted when a client first connects. */
export const joinSchema = z.object({
  nodeId: z.string().min(1, 'nodeId is required'),
  displayName: z.string().min(1).max(32, 'displayName must be 32 characters or fewer'),
  protocolVersion: z.string().min(1, 'protocolVersion is required'),
});

export type JoinPayload = z.infer<typeof joinSchema>;

// ── offer ────────────────────────────────────────────────────────────────────

/** Validates OfferPayload — SDP offer forwarded to the target peer. */
export const offerSchema = z.object({
  targetSocketId: z.string().min(1, 'targetSocketId is required'),
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

export type OfferPayload = z.infer<typeof offerSchema>;

// ── answer ───────────────────────────────────────────────────────────────────

/** Validates AnswerPayload — SDP answer forwarded back to the initiating peer. */
export const answerSchema = z.object({
  targetSocketId: z.string().min(1, 'targetSocketId is required'),
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

export type AnswerPayload = z.infer<typeof answerSchema>;

// ── ice-candidate ─────────────────────────────────────────────────────────────

/** Validates IceCandidatePayload — a single ICE candidate for trickle ICE. */
export const iceCandidateSchema = z.object({
  targetSocketId: z.string().min(1, 'targetSocketId is required'),
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

export type IceCandidatePayload = z.infer<typeof iceCandidateSchema>;

// ── leave ────────────────────────────────────────────────────────────────────

/** Validates LeavePayload — sent by the client on graceful disconnect. */
export const leaveSchema = z.object({
  nodeId: z.string().optional(),
  reason: z.string().optional(),
});

export type LeavePayload = z.infer<typeof leaveSchema>;

// ── Shared error emitter helper ───────────────────────────────────────────────

import type { Socket } from 'socket.io';

export type SignalingErrorCode =
  | 'TARGET_NOT_FOUND'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'PROTOCOL_VERSION';

/**
 * emitSignalingError — emit a 'signaling-error' event back to the sender.
 */
export function emitSignalingError(
  socket: Socket,
  code: SignalingErrorCode,
  message: string,
  context?: Record<string, unknown>,
): void {
  socket.emit('signaling-error', { code, message, context });
}
