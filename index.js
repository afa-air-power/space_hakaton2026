import { buildGraph } from './builder.js';
import { filterSatellites } from './filter.js';
import { connectedComponent, satellitesSeeingGateways } from './helpers.js';
import { routeClientToGateway } from './router.js';
import { ClientMetrics } from './metrics.js';

// ============================================
// Данные сценария
// ============================================
const clients = [
    { id: 'client_murmansk', visibleSats: ['sat_1', 'sat_2'] },
    { id: 'client_tiksi', visibleSats: ['sat_3'] },
];

const gateways = [
    { id: 'gateway_msk', visibleSats: ['sat_4'], available: true },
];

const allSatellites = [
    { id: 'sat_1', launch_batch: 1, outages: [] },
    { id: 'sat_2', launch_batch: 1, outages: [] },
    { id: 'sat_3', launch_batch: 2, outages: [] },
    { id: 'sat_4', launch_batch: 2, outages: [] },
    { id: 'sat_5', launch_batch: 3, outages: [{ start: 0, end: 86400 }] },
];

const islLinks = [
    ['sat_1', 'sat_2'],
    ['sat_2', 'sat_4'],
    ['sat_3', 'sat_4'],
    ['sat_5', 'sat_4'],
];

// ============================================
// Параметры расчёта
// ============================================
const TOTAL_STEPS = 720;
const STEP_SEC = 120;
const launchStage = 2;
const clientsToCheck = ['client_murmansk', 'client_tiksi'];

// ============================================
// Создаём накопители метрик
// ============================================
const metricsMap = new Map();
for (const clientId of clientsToCheck) {
    metricsMap.set(clientId, new ClientMetrics(clientId, TOTAL_STEPS));
}

// ============================================
// Цикл по всем 720 шагам
// ============================================
for (let step = 0; step < TOTAL_STEPS; step++) {
    const timeSec = step * STEP_SEC;

    // Искусственный отказ sat_4 на шагах 100–110 — для проверки перерывов
    const sat4Broken = step >= 100 && step <= 110;

    const islLinksThisStep = sat4Broken
        ? islLinks.filter(([a, b]) => a !== 'sat_4' && b !== 'sat_4')
        : islLinks;

    const gatewaysThisStep = sat4Broken
        ? [{ ...gateways[0], available: false }]
        : gateways;

    // Фильтрация спутников на момент t
    const activeSats = filterSatellites(allSatellites, launchStage, timeSec);

    // Сборка графа
    const graph = buildGraph({
        clients,
        gateways: gatewaysThisStep,
        satellites: activeSats.map(s => ({ id: s.id, active: true })),
        islLinks: islLinksThisStep,
    });

    // Маршрутизация и накопление метрик
    for (const clientId of clientsToCheck) {
        const result = routeClientToGateway(graph, clientId);
        metricsMap.get(clientId).accumulateStep(step, result);
    }
}

// ============================================
// Финализация и вывод
// ============================================
for (const clientId of clientsToCheck) {
    const metrics = metricsMap.get(clientId).finalize(STEP_SEC);

    console.log(`\n=== ${clientId} ===`);
    console.log(`Доступность: ${(metrics.availability * 100).toFixed(1)}%`);
    console.log(`Перерывов: ${metrics.gapsCount}`);
    console.log(`Макс. перерыв: ${metrics.maxGapSec} сек`);
    console.log(`Суммарно без связи: ${metrics.totalGapSec} сек`);
    console.log('Причины:', metrics.reasonCounts);
    console.log(`Средняя длина маршрута: ${metrics.routeStats.avgHops.toFixed(2)} хопов`);
    console.log(`Маршрут менялся: ${metrics.routeStats.routeChanges} раз`);
}