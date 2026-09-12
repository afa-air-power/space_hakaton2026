import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGraph } from '../builder.js';
import { connectedComponent, satellitesSeeingGateways } from '../helpers.js';
import { filterSatellites, isSatelliteActive } from '../filter.js';
import { NoRouteReason, routeClientToGateway } from '../router.js';

test('filterSatellites respects launch_stage and end-exclusive outages', () => {
  const satellites = [
    { id: 'sat_1', launch_batch: 1, outages: [] },
    { id: 'sat_2', launch_batch: 1, outages: [] },
    { id: 'sat_3', launch_batch: 2, outages: [{ start: 1800, end: 3600 }] },
    { id: 'sat_4', launch_batch: 2, outages: [{ start: 3600, end: 5400 }] },
    { id: 'sat_5', launch_batch: 3, outages: [] },
  ];

  assert.deepEqual(filterSatellites(satellites, 2, 3600).map(s => s.id), ['sat_1', 'sat_2', 'sat_3']);
  assert.equal(isSatelliteActive(satellites[2], 2, 1800), false);
  assert.equal(isSatelliteActive(satellites[2], 2, 3599), false);
  assert.equal(isSatelliteActive(satellites[2], 2, 3600), true);
  assert.equal(isSatelliteActive(satellites[3], 2, 5400), true);
});

test('buildGraph builds only active network nodes and edges', () => {
  const clients = [
    { id: 'client_murmansk', visibleSats: ['sat_1', 'sat_2'] },
    { id: 'client_tiksi', visibleSats: ['sat_3'] },
  ];
  const gateways = [
    { id: 'gateway_msk', visibleSats: ['sat_4'], available: true },
    { id: 'gateway_down', visibleSats: ['sat_1'], available: false },
  ];
  const satellites = [
    { id: 'sat_1', active: true },
    { id: 'sat_2', active: true },
    { id: 'sat_3', active: true },
    { id: 'sat_4', active: true },
    { id: 'sat_5', active: false },
  ];
  const islLinks = [
    ['sat_1', 'sat_2'],
    ['sat_2', 'sat_4'],
    ['sat_3', 'sat_4'],
    ['sat_5', 'sat_4'],
  ];

  const graph = buildGraph({ clients, gateways, satellites, islLinks });

  assert.ok(graph.hasNode('client_murmansk'));
  assert.ok(graph.hasNode('gateway_msk'));
  assert.ok(!graph.hasNode('gateway_down'));
  assert.ok(!graph.hasNode('sat_5'));
  assert.deepEqual([...graph.neighbors('client_murmansk')].sort(), ['sat_1', 'sat_2']);
  assert.deepEqual([...connectedComponent(graph, 'client_murmansk')].sort(), [
    'client_murmansk',
    'client_tiksi',
    'gateway_msk',
    'sat_1',
    'sat_2',
    'sat_3',
    'sat_4',
  ]);
  assert.deepEqual([...satellitesSeeingGateways(graph)].sort(), ['sat_4']);
});

test('routeClientToGateway returns an OK path for connected client', () => {
  const graph = buildGraph({
    clients: [{ id: 'client_a', visibleSats: ['sat_1'] }],
    gateways: [{ id: 'gateway_g', visibleSats: ['sat_2'], available: true }],
    satellites: [{ id: 'sat_1', active: true }, { id: 'sat_2', active: true }],
    islLinks: [['sat_1', 'sat_2']],
  });

  const result = routeClientToGateway(graph, 'client_a');

  assert.equal(result.reason, NoRouteReason.OK);
  assert.deepEqual(result.path, ['client_a', 'sat_1', 'sat_2', 'gateway_g']);
});

test('routeClientToGateway diagnoses missing visible satellite and gateway outage', () => {
  const missingSatelliteGraph = buildGraph({
    clients: [{ id: 'client_a', visibleSats: [] }],
    gateways: [{ id: 'gateway_g', visibleSats: ['sat_1'], available: true }],
    satellites: [{ id: 'sat_1', active: true }],
    islLinks: [],
  });

  assert.equal(routeClientToGateway(missingSatelliteGraph, 'client_a').reason, NoRouteReason.NO_VISIBLE_SATELLITE);

  const gatewayDownGraph = buildGraph({
    clients: [{ id: 'client_a', visibleSats: ['sat_1'] }],
    gateways: [{ id: 'gateway_g', visibleSats: ['sat_2'], available: false }],
    satellites: [{ id: 'sat_1', active: true }, { id: 'sat_2', active: true }],
    islLinks: [['sat_1', 'sat_2']],
  });

  assert.equal(routeClientToGateway(gatewayDownGraph, 'client_a').reason, NoRouteReason.GATEWAY_DOWN);
});

test('routeClientToGateway distinguishes no gateway contact from ISL break', () => {
  const noGatewayContactGraph = buildGraph({
    clients: [{ id: 'client_a', visibleSats: ['sat_1'] }],
    gateways: [{ id: 'gateway_g', visibleSats: [], available: true }],
    satellites: [{ id: 'sat_1', active: true }, { id: 'sat_2', active: true }],
    islLinks: [],
  });

  assert.equal(routeClientToGateway(noGatewayContactGraph, 'client_a').reason, NoRouteReason.NO_GATEWAY_CONTACT);

  const islBreakGraph = buildGraph({
    clients: [{ id: 'client_a', visibleSats: ['sat_1'] }],
    gateways: [{ id: 'gateway_g', visibleSats: ['sat_2'], available: true }],
    satellites: [{ id: 'sat_1', active: true }, { id: 'sat_2', active: true }],
    islLinks: [],
  });

  assert.equal(routeClientToGateway(islBreakGraph, 'client_a').reason, NoRouteReason.ISL_BREAK);
});
