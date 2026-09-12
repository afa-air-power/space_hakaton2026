// ============================================
// Хранилище метрик по одному клиенту
// ============================================
export class ClientMetrics {
    constructor(clientId, totalSteps) {
        this.clientId = clientId;
        this.totalSteps = totalSteps;
        this.stepsWithRoute = 0;

        // Текущий незакрытый перерыв (null, если маршрут есть)
        this.currentGap = null;

        // Завершённые перерывы
        this.gaps = [];

        // Статистика по причинам (число шагов с каждой причиной)
        this.reasonCounts = {
            no_visible_satellite: 0,
            isl_break: 0,
            no_gateway_contact: 0,
            gateway_down: 0,
        };

        // Статистика по маршрутам
        this.routeHops = [];
        this.routeChanges = 0;
        this.lastRoute = null;
    }

    // ----------------------------------------
    // Обработка одного шага
    // ----------------------------------------
    accumulateStep(stepIndex, routeResult) {
        const { path, reason } = routeResult;

        if (path) {
            // Маршрут есть
            this.stepsWithRoute += 1;
            this.routeHops.push(path.length - 1);

            // Если был открытый перерыв — закрываем его
            if (this.currentGap !== null) {
                this.gaps.push({
                    startStep: this.currentGap.startStep,
                    endStep: stepIndex - 1,
                    durationSteps: stepIndex - this.currentGap.startStep,
                    reason: this.currentGap.reason,
                });
                this.currentGap = null;
            }

            // Проверка изменения маршрута
            if (this.lastRoute !== null && !samePath(this.lastRoute, path)) {
                this.routeChanges += 1;
            }
            this.lastRoute = path;
        } else {
            // Маршрута нет — начало или продолжение перерыва
            if (this.currentGap === null) {
                this.currentGap = { startStep: stepIndex, reason };
            }
            if (this.reasonCounts[reason] !== undefined) {
                this.reasonCounts[reason] += 1;
            }
        }
    }

    // ----------------------------------------
    // Финализация
    // ----------------------------------------
    finalize(stepSec) {
        if (this.currentGap !== null) {
            this.gaps.push({
                startStep: this.currentGap.startStep,
                endStep: this.totalSteps - 1,
                durationSteps: this.totalSteps - this.currentGap.startStep,
                reason: this.currentGap.reason,
            });
            this.currentGap = null;
        }

        const totalGapSteps = this.gaps.reduce((s, g) => s + g.durationSteps, 0);
        const maxGapSteps = this.gaps.length
            ? Math.max(...this.gaps.map(g => g.durationSteps))
            : 0;
        const avgGapSteps = this.gaps.length
            ? totalGapSteps / this.gaps.length
            : 0;

        const avgHops = this.routeHops.length
            ? this.routeHops.reduce((s, h) => s + h, 0) / this.routeHops.length
            : 0;

        return {
            clientId: this.clientId,
            totalSteps: this.totalSteps,
            stepsWithRoute: this.stepsWithRoute,
            availability: this.stepsWithRoute / this.totalSteps,

            gapsCount: this.gaps.length,
            gaps: this.gaps,

            maxGapSec: maxGapSteps * stepSec,
            avgGapSec: avgGapSteps * stepSec,
            totalGapSec: totalGapSteps * stepSec,

            reasonCounts: this.reasonCounts,

            routeStats: {
                avgHops,
                routeChanges: this.routeChanges,
            },
        };
    }
}

// ============================================
// Проверка: одинаковые ли два маршрута
// ============================================
function samePath(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// ============================================
// Сравнение двух вариантов
// ============================================
export function compareVariants(a, b) {
    const clients = new Set([
        ...Object.keys(a.perClient),
        ...Object.keys(b.perClient),
    ]);

    const rows = [];
    for (const clientId of clients) {
        const ca = a.perClient[clientId];
        const cb = b.perClient[clientId];
        if (!ca || !cb) continue;

        rows.push({
            clientId,
            availabilityA: ca.availability,
            availabilityB: cb.availability,
            availabilityDiff: cb.availability - ca.availability,

            maxGapSecA: ca.maxGapSec,
            maxGapSecB: cb.maxGapSec,
            maxGapSecDiff: cb.maxGapSec - ca.maxGapSec,

            avgHopsA: ca.routeStats.avgHops,
            avgHopsB: cb.routeStats.avgHops,
            avgHopsDiff: cb.routeStats.avgHops - ca.routeStats.avgHops,
        });
    }

    return rows;
}