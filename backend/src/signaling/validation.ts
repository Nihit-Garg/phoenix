import { z } from 'zod';

/** Validates the 'join' event payload. */
export const joinSchema = z.object({
  nodeId: z.string().min(1).max(64),
  displayName: z.string().min(1).max(32),
  protocolVersion: z.string().min(1),
});

/** Validates the 'offer' event payload. */
export const offerSchema = z.object({
  targetSocketId: z.string().min(1),
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

/** Validates the 'answer' event payload. */
export const answerSchema = z.object({
  targetSocketId: z.string().min(1),
  sdp: z.object({
    type: z.enum(['offer', 'answer', 'pranswer', 'rollback']),
    sdp: z.string().optional(),
  }),
});

/** Validates the 'ice-candidate' event payload. */
export const iceCandidateSchema = z.object({
  targetSocketId: z.string().min(1),
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

/** Validates the 'leave' event payload (all fields optional). */
export const leaveSchema = z.object({
  nodeId: z.string().optional(),
  reason: z.string().optional(),
});
