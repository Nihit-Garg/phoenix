/**
 * signaling/handlers/onLeave.ts — handles the 'leave' event (graceful disconnect)
 *
 * Triggered when: a client emits 'leave' before closing the tab/window
 * (registered on the browser's 'beforeunload' event)
 *
 * Responsibilities:
 * 1. Validate payload (optional; payload may be empty or { nodeId, reason })
 * 2. Remove the socket from the registry
 * 3. Broadcast 'peer-left' to ALL other connected sockets:
 *    {
 *      nodeId: string,
 *      socketId: string,
 *      reason: 'graceful'
 *    }
 * 4. Log the departure
 *
 * Note: onDisconnect.ts handles the case where 'leave' is NOT sent (crash/timeout).
 * Both paths must emit 'peer-left' with the appropriate reason.
 *
 * See: API_SPEC.md → leave event and peer-left event
 */
