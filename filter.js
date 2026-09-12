// ============================================
// ��������: ������� �� ������� � ������ ������
// ============================================
export function isSatelliteActive(sat, launchStage, timeSec) {
    // 1. Спутник участвует в расчёте только если очередь запуска уже достигнута.
    if (sat.launch_batch > launchStage) return false;

    // 2. Периоды недоступности по ТЗ: начало включается, конец исключается.
    if (sat.outages) {
        for (const { start, end } of sat.outages) {
            if (timeSec >= start && timeSec < end) return false;
        }
    }

    // 3. Иначе спутник активен.
    return true;
}

// ============================================
// ������������� ������ ��������� �� ������ �������
// ============================================
export function filterSatellites(satellites, launchStage, timeSec) {
    return satellites.filter(sat =>
        isSatelliteActive(sat, launchStage, timeSec)
    );
}