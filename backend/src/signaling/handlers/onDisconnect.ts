/**
 * signaling/handlers/onDisconnect.ts — handles Socket.IO 'disconnect' event
 *
 * Triggered when: a socket disconnects for ANY reason — graceful leave,
 * browser crash, network drop, or timeout. This is the safety net.
 *
 * Responsibilities:
 * 1. Check if the socket still exists in the registry
 *    (if 'leave' was already processed, it will have been removed — skip)
 * 2. If still in registry: remove it
 * 3. Broadcast 'peer-left' to all remaining sockets:
 *    {
 *      nodeId: string,
 *      socketId: string,
 *      reason: 'socket-disconnect'
 *    }
 * 4. Log the disconnection with reason (Socket.IO provides a reason string)
 *
 * This handler MUST be idempotent — it may be called after onLeave has
 * already cleaned up. Check registry existence before acting.
 *
 * See: API_SPEC.md → peer-left event
 */
