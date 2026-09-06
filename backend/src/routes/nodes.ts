/**
 * routes/nodes.ts — GET /api/nodes and GET /api/nodes/:nodeId
 *
 * Responsibilities:
 * - GET /api/nodes
 *     Return all currently-connected nodes from the in-memory registry.
 *     Response: { nodes: NodeSummary[], timestamp: number }
 *
 * - GET /api/nodes/:nodeId
 *     Look up a single node by its persistent nodeId.
 *     Response: { node: NodeSummary }
 *     Error: 404 if not found
 *
 * Both routes import from registry/registry.ts — do NOT store state here.
 *
 * See: API_SPEC.md → GET /api/nodes and GET /api/nodes/:nodeId
 * Types: NodeSummary (DATA_MODELS.md → Node section)
 */
