import { NodeType } from './graph.js';

// ============================================
// Есть ли у узла хоть одно ребро
// ============================================
export function hasAnyEdge(graph, nodeId) {
    return (graph.adjacency.get(nodeId)?.size || 0) > 0;
}

// ============================================
// Компонента связности, содержащая узел
// (BFS по неориентированному графу)
// ============================================
export function connectedComponent(graph, startId) {
    const visited = new Set();
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of graph.neighbors(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return visited;
}

// ============================================
// Все спутники, видящие хотя бы один доступный шлюз
// ============================================
export function satellitesSeeingGateways(graph) {
    const result = new Set();
    for (const [id, node] of graph.nodes) {
        if (node.type !== NodeType.GATEWAY) continue;
        for (const neighbor of graph.neighbors(id)) {
            const neighborNode = graph.nodes.get(neighbor);
            if (neighborNode?.type === NodeType.SATELLITE) {
                result.add(neighbor);
            }
        }
    }
    return result;
}