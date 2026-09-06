/**
 * signaling/validation.ts — Zod schemas for all Socket.IO event payloads
 *
 * Each schema validates one incoming client event before it is processed.
 * Usage pattern in handlers:
 *   const result = joinSchema.safeParse(payload);
 *   if (!result.success) { emit 'signaling-error'; return; }
 *   const data = result.data;
 *
 * See: API_SPEC.md → all client-emitted events for payload shapes
 */

import { z } from 'zod';

/**
 * joinSchema — validates JoinPayload
 *
 * Client emits: { nodeId, displayName, protocolVersion }
 */
export const joinSchema = z.object({
  /** Persistent node ID — must be non-empty. */
  nodeId: z.string().min(1, 'nodeId must not be empty'),
  /** User-chosen display name — max 32 characters per MIRAGE_CONSTANTS. */
  displayName: z.string().min(1).max(32),
  /** Protocol version string, e.g. "1.0". */
  protocolVersion: z.string().min(1),
});

export type JoinPayload = z.infer<typeof joinSchema>;

/**
 * offerSchema — validates OfferPayload
 *
 * Client emits: { targetSocketId, sdp }
 * sdp must at minimum have 'type' and 'sdp' fields (RTCSessionDescriptionInit shape).
 */
export const offerSchema = z.object({
  /** Socket.IO ID of the target peer to forward the offer to. */
  targetSocketId: z.string().min(1),
  /** SDP offer object (RTCSessionDescriptionInit). */
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

export type OfferPayload = z.infer<typeof offerSchema>;

/**
 * answerSchema — validates AnswerPayload
 *
 * Identical structure to offerSchema; separate for clarity.
 */
export const answerSchema = z.object({
  /** Socket.IO ID of the initiating peer to forward the answer to. */
  targetSocketId: z.string().min(1),
  /** SDP answer object (RTCSessionDescriptionInit). */
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

export type AnswerPayload = z.infer<typeof answerSchema>;

/**
 * iceCandidateSchema — validates IceCandidatePayload
 *
 * client emits: { targetSocketId, candidate }
 */
export const iceCandidateSchema = z.object({
  /** Socket.IO ID of the target peer. */
  targetSocketId: z.string().min(1),
  /** RTCIceCandidateInit shape. */
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

export type IceCandidatePayload = z.infer<typeof iceCandidateSchema>;

/**
 * leaveSchema — validates LeavePayload (all fields optional for robustness)
 *
 * Client emits: { nodeId?, reason? }
 * Sent on beforeunload — we can't guarantee a full payload, so be lenient.
 */
export const leaveSchema = z.object({
  /** Persistent node ID (optional — we can look it up from registry). */
  nodeId: z.string().optional(),
  /** Human-readable reason string (e.g., "user_closed_tab"). */
  reason: z.string().optional(),
});

export type LeavePayload = z.infer<typeof leaveSchema>;
