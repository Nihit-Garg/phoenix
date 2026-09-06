/**
 * signaling/signaling.ts — Socket.IO namespace setup
 *
 * Responsibilities:
 * - Accept an `io: Server` (Socket.IO Server instance) as argument
 * - Register connection handler: io.on('connection', (socket) => { ... })
 * - For each connected socket, register all event handlers:
 *     socket.on('join',          onJoin(socket, registry))
 *     socket.on('offer',         onOffer(socket, io))
 *     socket.on('answer',        onAnswer(socket, io))
 *     socket.on('ice-candidate', onIceCandidate(socket, io))
 *     socket.on('leave',         onLeave(socket, io, registry))
 *     socket.on('disconnect',    onDisconnect(socket, io, registry))
 *
 * - Export a single function: setupSignaling(io: Server): void
 *
 * See: API_SPEC.md → Socket.IO Events
 * See: ARCHITECTURE.md → WebRTC Signaling Flow
 */
