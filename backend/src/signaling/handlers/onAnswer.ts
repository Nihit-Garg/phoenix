/**
 * signaling/handlers/onAnswer.ts — handles the 'answer' event
 *
 * Triggered when: the responding peer emits 'answer' with an SDP answer
 *
 * Responsibilities:
 * 1. Validate payload (Zod: AnswerPayload)
 * 2. Check that targetSocketId is connected
 * 3. If not found: emit 'signaling-error' with code 'TARGET_NOT_FOUND'
 * 4. Forward the SDP answer to targetSocketId with sender metadata
 *
 * Payload type: AnswerPayload
 * {
 *   targetSocketId: string
 *   sdp: RTCSessionDescriptionInit
 * }
 *
 * Emits to targetSocketId:
 * {
 *   fromSocketId: string
 *   fromNodeId: string
 *   sdp: RTCSessionDescriptionInit
 * }
 *
 * See: API_SPEC.md → answer event
 */
