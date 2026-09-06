/**
 * signaling/handlers/onOffer.ts — handles the 'offer' event
 *
 * Triggered when: the initiating peer emits 'offer' with an SDP offer
 *
 * Responsibilities:
 * 1. Validate payload (Zod: OfferPayload)
 * 2. Check that targetSocketId exists in the Socket.IO server
 * 3. If not found: emit 'signaling-error' with code 'TARGET_NOT_FOUND' to sender
 * 4. If found: forward the SDP offer to targetSocketId with sender info attached
 *
 * Payload type: OfferPayload
 * {
 *   targetSocketId: string
 *   sdp: RTCSessionDescriptionInit
 * }
 *
 * Emits to targetSocketId:
 * {
 *   fromSocketId: string    ← the sender's socket.id
 *   fromNodeId: string      ← looked up from registry by socket.id
 *   sdp: RTCSessionDescriptionInit
 * }
 *
 * See: API_SPEC.md → offer event
 * See: ARCHITECTURE.md → WebRTC Signaling Flow (sequence diagram)
 */
