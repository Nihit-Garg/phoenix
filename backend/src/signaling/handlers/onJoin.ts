/**
 * signaling/handlers/onJoin.ts — handles the 'join' event
 *
 * Triggered when: a client emits socket.emit('join', JoinPayload)
 *
 * Responsibilities:
 * 1. Validate payload using validation.ts (Zod schema for JoinPayload)
 * 2. If invalid: emit 'signaling-error' with code 'INVALID_PAYLOAD' back to sender
 * 3. If valid:
 *    a. Upsert the client into the registry (registry.upsert(socket.id, entry))
 *    b. Emit 'peer-list' to the joining socket with all OTHER connected nodes
 *    c. Broadcast 'new-peer' to all OTHER sockets with the new node's summary
 * 4. Log the join event via logger.ts
 *
 * Payload type: JoinPayload (see API_SPEC.md → join event)
 * {
 *   nodeId: string
 *   displayName: string
 *   protocolVersion: string
 * }
 *
 * Emits:
 *   → 'peer-list'  to the joining socket
 *   → 'new-peer'   broadcast to all other sockets
 */
