import { NodeType } from './graph.js';
import { connectedComponent, satellitesSeeingGateways } from './helpers.js';

// ============================================
// Причины отсутствия маршрута (из ТЗ)
// ============================================
export const NoRouteReason = {
    NO_VISIBLE_SATELLITE: 'no_visible_satellite',   // нет видимого спутника
    ISL_BREAK: 'isl_break',                          // разрыв межспутниковой сети
    NO_GATEWAY_CONTACT: 'no_gateway_contact',        // нет контакта со шлюзом
    GATEWAY_DOWN: 'gateway_down',                    // шлюз недоступен
    OK: 'ok',                                        // маршрут есть
};

// ============================================
// BFS: поиск пути от startId до любого узла из targetIds
// ============================================
export function findPath(graph, startId, targetIds) {
    const targets = new Set(targetIds);
    const visited = new Set([startId]);
    const parent = new Map(); // для восстановления пути
    const queue = [startId];

    while (queue.length > 0) {
        const current = queue.shift();

        if (targets.has(current)) {
            // Восстанавливаем путь от target обратно к start
            const path = [];
            let node = current;
            while (node !== undefined) {
                path.unshift(node);
                node = parent.get(node);
            }
            return path;
        }

        for (const neighbor of graph.neighbors(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent.set(neighbor, current);
                queue.push(neighbor);
            }
        }
    }

    return null; // путь не найден
}

// ============================================
// Поиск пути клиента до любого доступного шлюза
// ============================================
export function routeClientToGateway(graph, clientId) {
    // Собираем все доступные шлюзы
    const gateways = [];
    for (const [id, node] of graph.nodes) {
        if (node.type === NodeType.GATEWAY) gateways.push(id);
    }

    if (gateways.length === 0) {
        return { path: null, reason: NoRouteReason.GATEWAY_DOWN };
    }

    const path = findPath(graph, clientId, gateways);
    if (path) {
        return { path, reason: NoRouteReason.OK };
    }

    // Пути нет — диагностируем причину
    return { path: null, reason: diagnoseNoRoute(graph, clientId) };
}

// ============================================
// Диагностика: почему нет маршрута
// ============================================
export function diagnoseNoRoute(graph, clientId) {
    // 1. Есть ли у клиента хоть один видимый спутник?
    let hasVisibleSat = false;
    for (const neighbor of graph.neighbors(clientId)) {
        const node = graph.nodes.get(neighbor);
        if (node?.type === NodeType.SATELLITE) {
            hasVisibleSat = true;
            break;
        }
    }
    if (!hasVisibleSat) {
        return NoRouteReason.NO_VISIBLE_SATELLITE;
    }

    // 2. Все ли шлюзы недоступны?
    let hasAnyGateway = false;
    for (const node of graph.nodes.values()) {
        if (node.type === NodeType.GATEWAY) {
            hasAnyGateway = true;
            break;
        }
    }
    if (!hasAnyGateway) {
        return NoRouteReason.GATEWAY_DOWN;
    }

    // 3. В компоненте клиента есть спутник, видящий шлюз?
    const component = connectedComponent(graph, clientId);
    const satsToGw = satellitesSeeingGateways(graph);

    let componentHasGatewayContact = false;
    for (const satId of satsToGw) {
        if (component.has(satId)) {
            componentHasGatewayContact = true;
            break;
        }
    }

    if (!componentHasGatewayContact) {
        // Есть ли вообще в графе спутник, видящий шлюз?
        if (satsToGw.size === 0) {
            return NoRouteReason.NO_GATEWAY_CONTACT;
        }
        // Спутник видит шлюз, но он в другой компоненте → разрыв ISL
        return NoRouteReason.ISL_BREAK;
    }

    // 4. Всё на месте, но пути нет — маловероятно, но возможно
    return NoRouteReason.ISL_BREAK;
}