// ============================================
// Типы узлов графа
// ============================================
export const NodeType = {
    CLIENT: 'client',
    SATELLITE: 'satellite',
    GATEWAY: 'gateway',
};

// ============================================
// Типы рёбер
// ============================================
export const EdgeType = {
    CLIENT_SAT: 'client_sat',
    ISL: 'isl',
    SAT_GATEWAY: 'sat_gateway',
};

// ============================================
// Узел графа
// ============================================
export class Node {
    constructor(id, type, meta = {}) {
        this.id = id;
        this.type = type;
        this.meta = meta;
    }
}

// ============================================
// Ребро графа
// ============================================
export class Edge {
    constructor(from, to, type, weight = 1) {
        this.from = from;
        this.to = to;
        this.type = type;
        this.weight = weight;
    }
}

// ============================================
// Граф сети на одном шаге
// ============================================
export class NetworkGraph {
    constructor() {
        this.nodes = new Map();
        this.adjacency = new Map();
        this.edges = [];
    }

    addNode(node) {
        this.nodes.set(node.id, node);
        if (!this.adjacency.has(node.id)) {
            this.adjacency.set(node.id, new Set());
        }
    }

    addEdge(fromId, toId, type, weight = 1) {
        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
            throw new Error(`Edge endpoints not found: ${fromId}, ${toId}`);
        }
        this.adjacency.get(fromId).add(toId);
        this.adjacency.get(toId).add(fromId);
        this.edges.push(new Edge(fromId, toId, type, weight));
    }

    neighbors(id) {
        return this.adjacency.get(id) || new Set();
    }

    hasNode(id) {
        return this.nodes.has(id);
    }
}