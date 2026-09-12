// ============================================
// Проверка: активен ли спутник в данный момент
// ============================================
export function isSatelliteActive(sat, launchStage, timeSec) {
    // 1. Ещё не запущен на текущем этапе
    if (sat.launch_batch > launchStage) return false;

    // 2. В отказе на этом интервале
    if (sat.outages) {
        for (const { start, end } of sat.outages) {
            if (timeSec >= start && timeSec <= end) return false;
        }
    }

    // 3. Иначе — активен
    return true;
}

// ============================================
// Отфильтровать список спутников на момент времени
// ============================================
export function filterSatellites(satellites, launchStage, timeSec) {
    return satellites.filter(sat =>
        isSatelliteActive(sat, launchStage, timeSec)
    );
}