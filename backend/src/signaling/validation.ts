/**
 * signaling/validation.ts — Zod schemas for all Socket.IO event payloads
 *
 * Responsibilities:
 * - Export one Zod schema per incoming event payload
 * - Used in every handler to validate before processing
 *
 * Schemas to define:
 *
 *   joinSchema        — validates JoinPayload
 *     { nodeId: string (min 1), displayName: string (max 32), protocolVersion: string }
 *
 *   offerSchema       — validates OfferPayload
 *     { targetSocketId: string, sdp: object (RTCSessionDescriptionInit shape) }
 *
 *   answerSchema      — validates AnswerPayload
 *     { targetSocketId: string, sdp: object }
 *
 *   iceCandidateSchema — validates IceCandidatePayload
 *     { targetSocketId: string, candidate: object (RTCIceCandidateInit shape) }
 *
 *   leaveSchema       — validates LeavePayload (optional fields)
 *     { nodeId: string (optional), reason: string (optional) }
 *
 * Usage pattern in handlers:
 *   const result = joinSchema.safeParse(payload);
 *   if (!result.success) { ... emit signaling-error ... return; }
 *   const data = result.data;
 *
 * See: API_SPEC.md → all client-emitted events for payload shapes
 */
