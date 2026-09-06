/**
 * registry/registry.ts — in-memory peer registry
 *
 * This is the ONLY stateful module on the server.
 * It holds a Map<socketId, RegistryEntry> of all currently-connected peers.
 *
 * Responsibilities — export the following functions:
 *
 *   upsert(socketId: string, entry: RegistryEntry): void
 *     Add or update a registry entry for the given socketId.
 *
 *   remove(socketId: string): RegistryEntry | undefined
 *     Remove and return the entry for the given socketId.
 *     Returns undefined if not found (idempotent).
 *
 *   get(socketId: string): RegistryEntry | undefined
 *     Return the entry for the given socketId.
 *
 *   getByNodeId(nodeId: string): RegistryEntry | undefined
 *     Look up a peer by their persistent nodeId (not socketId).
 *
 *   getAll(): RegistryEntry[]
 *     Return all current entries as an array.
 *
 *   getAllExcept(socketId: string): RegistryEntry[]
 *     Return all entries except the one with the given socketId.
 *     Used to build 'peer-list' response for a newly-joined client.
 *
 *   size(): number
 *     Return the number of currently-connected peers.
 *
 *   toNodeSummary(entry: RegistryEntry): NodeSummary
 *     Convert a full RegistryEntry to the public NodeSummary shape.
 *
 * Implementation note:
 *   Use a module-level Map (singleton). No class needed.
 *   const registry = new Map<string, RegistryEntry>();
 *
 * See: DATA_MODELS.md → SignalingModels
 * See: API_SPEC.md → GET /api/nodes
 */
