import { Node, NetworkGraph, NodeType, EdgeType } from './graph.js';

export function buildGraph({ clients, gateways, satellites, islLinks }) {
    const graph = new NetworkGraph();

    // --- 1. Спутники ---
    // Активные спутники становятся узлами. Отказавшие — исключаются.
    const activeSats = new Set();
    for (const sat of satellites) {
        if (sat.active !== false) {
            graph.addNode(new Node(sat.id, NodeType.SATELLITE, sat));
            activeSats.add(sat.id);
        }
    }

    // --- 2. Клиенты ---
    // Клиент — только источник, не транзитный узел.
    for (const client of clients) {
        graph.addNode(new Node(client.id, NodeType.CLIENT, client));
    }

    // --- 3. Шлюзы ---
    // Недоступный шлюз не добавляется как узел.
    for (const gw of gateways) {
        if (gw.available !== false) {
            graph.addNode(new Node(gw.id, NodeType.GATEWAY, gw));
        }
    }

    // --- 4. Рёбра клиент ↔ спутник ---
    for (const client of clients) {
        if (!graph.hasNode(client.id)) continue;
        for (const satId of client.visibleSats || []) {
            if (!activeSats.has(satId)) continue;
            graph.addEdge(client.id, satId, EdgeType.CLIENT_SAT);
        }
    }

    // --- 5. Рёбра спутник ↔ спутник (ISL) ---
    for (const [a, b] of islLinks || []) {
        if (!activeSats.has(a) || !activeSats.has(b)) continue;
        graph.addEdge(a, b, EdgeType.ISL);
    }

    // --- 6. Рёбра спутник ↔ шлюз ---
    for (const gw of gateways) {
        if (!graph.hasNode(gw.id)) continue; // шлюз в отказе
        for (const satId of gw.visibleSats || []) {
            if (!activeSats.has(satId)) continue;
            graph.addEdge(satId, gw.id, EdgeType.SAT_GATEWAY);
        }
    }

    return graph;
}