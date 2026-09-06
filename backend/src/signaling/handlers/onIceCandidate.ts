/**
 * signaling/handlers/onIceCandidate.ts — handles the 'ice-candidate' event
 *
 * Triggered when: either peer emits 'ice-candidate' as trickle ICE fires locally
 *
 * Responsibilities:
 * 1. Validate payload (Zod: IceCandidatePayload)
 * 2. Silently drop if targetSocketId is not connected (ICE candidates can be lost)
 * 3. Forward the ICE candidate to targetSocketId with sender metadata
 *
 * Payload type: IceCandidatePayload
 * {
 *   targetSocketId: string
 *   candidate: RTCIceCandidateInit
 * }
 *
 * Emits to targetSocketId:
 * {
 *   fromSocketId: string
 *   fromNodeId: string
 *   candidate: RTCIceCandidateInit
 * }
 *
 * Note: Unlike offer/answer, a missing target is silently dropped (not an error).
 * ICE negotiation is tolerant of lost candidates.
 *
 * See: API_SPEC.md → ice-candidate event
 */
