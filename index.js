import { buildGraph } from './builder.js';
import { connectedComponent, satellitesSeeingGateways } from './helpers.js';

// ============================================
// Тестовые данные на одном шаге
// ============================================
const clients = [
    { id: 'client_murmansk', visibleSats: ['sat_1', 'sat_2'] },
    { id: 'client_tiksi', visibleSats: ['sat_3'] },
];

const gateways = [
    { id: 'gateway_msk', visibleSats: ['sat_4'], available: true },
];

const satellites = [
    { id: 'sat_1', active: true },
    { id: 'sat_2', active: true },
    { id: 'sat_3', active: true },
    { id: 'sat_4', active: true },
    { id: 'sat_5', active: false }, // отказ
];

const islLinks = [
    ['sat_1', 'sat_2'],
    ['sat_2', 'sat_4'],
    ['sat_3', 'sat_4'],
    ['sat_5', 'sat_4'], // будет отброшено: sat_5 в отказе
];

// ============================================
// Сборка графа
// ============================================
const graph = buildGraph({ clients, gateways, satellites, islLinks });

// ============================================
// Что получилось
// ============================================
console.log('Узлы:', [...graph.nodes.keys()]);
console.log('Соседи sat_2:', [...graph.neighbors('sat_2')]);
console.log('Соседи client_murmansk:', [...graph.neighbors('client_murmansk')]);
console.log('Рёбер всего:', graph.edges.length);

const comp = connectedComponent(graph, 'client_murmansk');
console.log('Компонента client_murmansk:', [...comp]);

const satsToGw = satellitesSeeingGateways(graph);
console.log('Спутники, видящие шлюз:', [...satsToGw]);
import { filterSatellites } from './filter.js';

// Полный список спутников с batch и outages
const allSatellites = [
    { id: 'sat_1', launch_batch: 1, outages: [] },
    { id: 'sat_2', launch_batch: 1, outages: [] },
    { id: 'sat_3', launch_batch: 2, outages: [] },
    { id: 'sat_4', launch_batch: 2, outages: [] },
    { id: 'sat_5', launch_batch: 3, outages: [{ start: 0, end: 86400 }] },
];

const launchStage = 2;
const timeSec = 3600;

const activeSats = filterSatellites(allSatellites, launchStage, timeSec);
console.log('Активные спутники:', activeSats.map(s => s.id));
// Должно вывести: [ 'sat_1', 'sat_2', 'sat_3', 'sat_4' ]
import { routeClientToGateway } from './router.js';

// Для каждого клиента ищем маршрут и печатаем результат
const clientsToCheck = ['client_murmansk', 'client_tiksi'];

for (const clientId of clientsToCheck) {
    const result = routeClientToGateway(graph, clientId);
    if (result.path) {
        console.log(`Маршрут ${clientId}:`, result.path.join(' → '));
    } else {
        console.log(`Маршрут ${clientId}: НЕТ. Причина: ${result.reason}`);
    }
}