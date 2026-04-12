import Foundation

enum RunningAnalysisEngine {
    private struct MetricBand {
        let label: String
        let minInclusive: Double
        let narrative: String
    }

    private static let powerToWeightBands: [MetricBand] = [
        MetricBand(label: "Elite-like", minInclusive: 4.6, narrative: "High-end distance power relative to body mass."),
        MetricBand(label: "Sub-3 trajectory", minInclusive: 4.0, narrative: "Strong marathon-supporting power-to-weight."),
        MetricBand(label: "Competitive amateur", minInclusive: 3.3, narrative: "Well beyond general recreational fitness."),
        MetricBand(label: "Recreational", minInclusive: 0, narrative: "A baseline that can move quickly with consistent aerobic work.")
    ]

    private static let efficiencyBands: [MetricBand] = [
        MetricBand(label: "Excellent economy", minInclusive: 3.2, narrative: "Strong speed relative to heart-rate cost."),
        MetricBand(label: "Strong economy", minInclusive: 2.8, narrative: "The heart-rate cost of pace is moving in the right direction."),
        MetricBand(label: "Developing economy", minInclusive: 2.3, narrative: "Useful signal, but still room to buy more speed from the same effort."),
        MetricBand(label: "Early baseline", minInclusive: 0, narrative: "Use this as a reference point and improve it with durability.")
    ]

    private static let aerobicBands: [MetricBand] = [
        MetricBand(label: "Excellent durability", minInclusive: 97, narrative: "Heart-rate drift stayed low through the run."),
        MetricBand(label: "Strong durability", minInclusive: 95, narrative: "The aerobic system stayed stable without much fade."),
        MetricBand(label: "Watch drift", minInclusive: 92, narrative: "Useful, but fueling, heat, or fatigue may still be nudging heart rate upward."),
        MetricBand(label: "Fade risk", minInclusive: 0, narrative: "Durability likely broke down enough to matter.")
    ]

    private static let cadenceBands: [MetricBand] = [
        MetricBand(label: "Elastic", minInclusive: 1.7, narrative: "A lot of forward travel per step without losing rhythm."),
        MetricBand(label: "Efficient", minInclusive: 1.5, narrative: "Cadence and speed are cooperating well."),
        MetricBand(label: "Developing", minInclusive: 1.3, narrative: "There is still room to turn cadence into more forward travel."),
        MetricBand(label: "Short stride output", minInclusive: 0, narrative: "Cadence is not yet converting into much speed.")
    ]

    private static let powerHeartRateBands: [MetricBand] = [
        MetricBand(label: "Excellent resilience", minInclusive: 2.0, narrative: "Power is staying high relative to heart rate."),
        MetricBand(label: "Strong resilience", minInclusive: 1.8, narrative: "Cardiovascular cost is still turning into useful output."),
        MetricBand(label: "Developing resilience", minInclusive: 1.55, narrative: "Workable, but still room for aerobic and muscular gains."),
        MetricBand(label: "Fatigue watch", minInclusive: 0, narrative: "If this stays low while effort feels high, fatigue or breakdown is likely.")
    ]

    private static let vo2Bands: [MetricBand] = [
        MetricBand(label: "Elite-like", minInclusive: 65, narrative: "A rarefied aerobic ceiling."),
        MetricBand(label: "Sub-elite", minInclusive: 58, narrative: "A strong macro indicator for high-end endurance performance."),
        MetricBand(label: "Competitive", minInclusive: 50, narrative: "This supports serious amateur endurance goals."),
        MetricBand(label: "Recreational", minInclusive: 0, narrative: "A solid baseline that can trend upward with structured training.")
    ]

    private static let recoveryBands: [MetricBand] = [
        MetricBand(label: "Fast reset", minInclusive: 38, narrative: "Heart rate is dropping quickly after work."),
        MetricBand(label: "Strong reset", minInclusive: 30, narrative: "The post-effort recovery response looks healthy."),
        MetricBand(label: "Moderate reset", minInclusive: 22, narrative: "Recovery is acceptable, but not yet snapping back quickly."),
        MetricBand(label: "Slow reset", minInclusive: 0, narrative: "Recovery is lagging and may reflect fatigue or accumulated stress.")
    ]

    static func buildSnapshots(from workouts: [RunningWorkoutSummary]) -> [RunningSignalSnapshot] {
        workouts
            .map(snapshot(from:))
            .sorted { $0.date > $1.date }
    }

    static func buildOverviewStats(
        from workouts: [RunningWorkoutSummary],
        snapshots: [RunningSignalSnapshot],
        lastImportAt: Date?
    ) -> [RunningOverviewStat] {
        guard !workouts.isEmpty else {
            return [
                RunningOverviewStat(
                    label: "History",
                    value: "0 runs",
                    detail: "Import the last 12 months from HealthKit to build the local analysis set."
                )
            ]
        }

        let totalDistance = workouts.compactMap(\.distanceKm).reduce(0, +)
        let totalHours = workouts.map(\.durationMinutes).reduce(0, +) / 60
        let metricCoverage = percentage(
            numerator: snapshots.filter { coreMetricCount(for: $0) >= 4 }.count,
            denominator: workouts.count
        )
        let powerCoverage = percentage(
            numerator: workouts.filter { $0.averagePowerWatts != nil }.count,
            denominator: workouts.count
        )
        let weatherCoverage = percentage(
            numerator: workouts.filter { $0.airTemperatureC != nil || $0.humidityPercent != nil }.count,
            denominator: workouts.count
        )

        return [
            RunningOverviewStat(label: "Runs", value: "\(workouts.count)", detail: "running workouts over the last 12 months"),
            RunningOverviewStat(label: "Distance", value: "\(format(totalDistance, digits: 0)) km", detail: "total recorded distance"),
            RunningOverviewStat(label: "Time", value: "\(format(totalHours, digits: 1)) h", detail: "total recorded duration"),
            RunningOverviewStat(label: "Metric coverage", value: "\(format(metricCoverage, digits: 0))%", detail: "runs with at least four core metrics"),
            RunningOverviewStat(label: "Power coverage", value: "\(format(powerCoverage, digits: 0))%", detail: "runs with running power samples"),
            RunningOverviewStat(
                label: "Weather coverage",
                value: "\(format(weatherCoverage, digits: 0))%",
                detail: lastImportAt.map { "last sync \(relativeDateString(for: $0))" } ?? "not synced yet"
            )
        ]
    }

    static func buildMetricCards(from snapshots: [RunningSignalSnapshot]) -> [RunningMetricCard] {
        guard let latest = snapshots.sorted(by: { $0.date > $1.date }).first else {
            return []
        }

        let prior = snapshots
            .sorted(by: { $0.date > $1.date })
            .dropFirst()
            .first

        return [
            buildMetricCard(
                id: "power-to-weight",
                title: "Running power-to-weight",
                shortLabel: "W/kg",
                value: latest.powerToWeight,
                priorValue: prior?.powerToWeight,
                digits: 2,
                unit: "W/kg",
                bands: powerToWeightBands
            ),
            buildMetricCard(
                id: "efficiency-index",
                title: "Efficiency index",
                shortLabel: "speed / HR",
                value: latest.efficiencyIndex,
                priorValue: prior?.efficiencyIndex,
                digits: 2,
                unit: "score",
                bands: efficiencyBands
            ),
            buildMetricCard(
                id: "aerobic-stability",
                title: "Aerobic stability",
                shortLabel: "100 - drift",
                value: latest.aerobicStability,
                priorValue: prior?.aerobicStability,
                digits: 1,
                unit: "score",
                bands: aerobicBands
            ),
            buildMetricCard(
                id: "cadence-efficiency",
                title: "Cadence efficiency ratio",
                shortLabel: "speed / cadence",
                value: latest.cadenceEfficiency,
                priorValue: prior?.cadenceEfficiency,
                digits: 2,
                unit: "m/step",
                bands: cadenceBands
            ),
            buildMetricCard(
                id: "power-heart-rate",
                title: "Power versus heart-rate ratio",
                shortLabel: "W / HR",
                value: latest.powerHeartRate,
                priorValue: prior?.powerHeartRate,
                digits: 2,
                unit: "W/bpm",
                bands: powerHeartRateBands
            ),
            buildMetricCard(
                id: "vo2-max",
                title: "VO2 max trend",
                shortLabel: "VO2 max",
                value: latest.vo2Max,
                priorValue: prior?.vo2Max,
                digits: 1,
                unit: "ml/kg/min",
                bands: vo2Bands
            ),
            buildMetricCard(
                id: "recovery-index",
                title: "Recovery index",
                shortLabel: "HR reset",
                value: latest.recoveryIndex,
                priorValue: prior?.recoveryIndex,
                digits: 1,
                unit: "bpm",
                bands: recoveryBands
            )
        ]
        .compactMap { $0 }
    }

    static func buildTrendCards(from snapshots: [RunningSignalSnapshot], workouts: [RunningWorkoutSummary]) -> [RunningTrendCard] {
        let recentRange = dateRange(daysBackStart: 90, daysBackEnd: 0)
        let priorRange = dateRange(daysBackStart: 180, daysBackEnd: 90)

        let powerTrend = buildSnapshotTrendCard(
            id: "power-trend",
            title: "90-day W/kg",
            keyPath: \.powerToWeight,
            recentRange: recentRange,
            priorRange: priorRange,
            snapshots: snapshots,
            digits: 2,
            unit: "W/kg"
        )

        let efficiencyTrend = buildSnapshotTrendCard(
            id: "efficiency-trend",
            title: "90-day efficiency",
            keyPath: \.efficiencyIndex,
            recentRange: recentRange,
            priorRange: priorRange,
            snapshots: snapshots,
            digits: 2,
            unit: "score"
        )

        let durabilityTrend = buildSnapshotTrendCard(
            id: "durability-trend",
            title: "90-day aerobic stability",
            keyPath: \.aerobicStability,
            recentRange: recentRange,
            priorRange: priorRange,
            snapshots: snapshots,
            digits: 1,
            unit: "score"
        )

        let distanceRecent = averageDistance(for: workouts, range: recentRange)
        let distancePrior = averageDistance(for: workouts, range: priorRange)
        let distanceTrend = RunningTrendCard(
            id: "distance-trend",
            title: "90-day average run distance",
            value: distanceRecent.map { "\(format($0, digits: 1)) km" } ?? "n/a",
            detail: compareText(recent: distanceRecent, prior: distancePrior, digits: 1, unit: " km")
        )

        return [powerTrend, efficiencyTrend, durabilityTrend, distanceTrend]
    }

    static func buildGapNotes(from workouts: [RunningWorkoutSummary], snapshots: [RunningSignalSnapshot]) -> [RunningGapNote] {
        guard !workouts.isEmpty else {
            return [
                RunningGapNote(
                    title: "No local running history yet",
                    detail: "Import from Apple Health to populate the last 12 months of workout summaries and derived metrics."
                )
            ]
        }

        let missingPower = workouts.filter { $0.averagePowerWatts == nil }.count
        let estimatedCadence = workouts.filter { $0.gapFlags.contains("Cadence estimated from step count and duration.") }.count
        let missingMechanics = workouts.filter {
            $0.groundContactTimeMs == nil || $0.strideLengthMeters == nil || $0.verticalOscillationCm == nil
        }.count
        let missingRecovery = workouts.filter { $0.heartRateDrop1Min == nil && $0.heartRateDrop2Min == nil }.count
        let missingWeather = workouts.filter { $0.airTemperatureC == nil && $0.humidityPercent == nil }.count
        let lowCoverageRuns = snapshots.filter { coreMetricCount(for: $0) < 4 }.count

        let candidates: [(String, Int, String)] = [
            (
                "Power coverage",
                missingPower,
                "\(missingPower) of \(workouts.count) runs do not have running power, so power-based ratios skip them."
            ),
            (
                "Cadence quality",
                estimatedCadence,
                "\(estimatedCadence) runs use cadence estimated from step count because HealthKit does not expose running cadence directly."
            ),
            (
                "Mechanics coverage",
                missingMechanics,
                "\(missingMechanics) runs are missing one or more running mechanics fields such as ground contact time, stride length, or vertical oscillation."
            ),
            (
                "Recovery coverage",
                missingRecovery,
                "\(missingRecovery) runs do not have enough post-run heart-rate data to compute a recovery score."
            ),
            (
                "Weather metadata",
                missingWeather,
                "\(missingWeather) runs do not include weather metadata, so climate-aware interpretation is incomplete for those sessions."
            ),
            (
                "Core metric coverage",
                lowCoverageRuns,
                "\(lowCoverageRuns) runs have fewer than four core metrics available, so they are down-weighted in trend interpretation."
            )
        ]

        let notes = candidates
            .filter { $0.1 > 0 }
            .sorted { $0.1 > $1.1 }
            .prefix(4)
            .map { RunningGapNote(title: $0.0, detail: $0.2) }

        if notes.isEmpty {
            return [
                RunningGapNote(
                    title: "Coverage looks strong",
                    detail: "Most imported runs include enough signal quality to support the core metrics without heavy fallback logic."
                )
            ]
        }

        return notes
    }

    private static func snapshot(from workout: RunningWorkoutSummary) -> RunningSignalSnapshot {
        let powerToWeight = safeDivide(workout.averagePowerWatts, workout.bodyWeightKg)
        let efficiencyIndex = safeDivide(
            (workout.averageSpeedMetersPerSecond ?? 0) * 100,
            workout.averageHeartRateBpm
        )
        let drift = safeDivide(
            ((workout.secondHalfHeartRateBpm ?? 0) - (workout.firstHalfHeartRateBpm ?? 0)) * 100,
            workout.firstHalfHeartRateBpm
        )
        let aerobicStability: Double?
        if let drift {
            aerobicStability = max(0, 100 - max(drift, 0))
        } else {
            aerobicStability = nil
        }
        let cadenceEfficiency = safeDivide(
            workout.averageSpeedMetersPerSecond,
            workout.cadenceSpm.map { $0 / 60 }
        )
        let powerHeartRate = safeDivide(workout.averagePowerWatts, workout.averageHeartRateBpm)

        let recoveryInputs = [workout.heartRateDrop1Min, workout.heartRateDrop2Min].compactMap { $0 }
        let recoveryIndex = recoveryInputs.isEmpty ? nil : recoveryInputs.reduce(0, +) / Double(recoveryInputs.count)

        return RunningSignalSnapshot(
            id: workout.id,
            workoutID: workout.id,
            title: workout.title,
            date: workout.startDate,
            powerToWeight: round(powerToWeight, digits: 2),
            efficiencyIndex: round(efficiencyIndex, digits: 2),
            aerobicStability: round(aerobicStability, digits: 1),
            cadenceEfficiency: round(cadenceEfficiency, digits: 2),
            powerHeartRate: round(powerHeartRate, digits: 2),
            vo2Max: round(workout.vo2Max, digits: 1),
            recoveryIndex: round(recoveryIndex, digits: 1),
            gapFlags: workout.gapFlags
        )
    }

    private static func buildMetricCard(
        id: String,
        title: String,
        shortLabel: String,
        value: Double?,
        priorValue: Double?,
        digits: Int,
        unit: String,
        bands: [MetricBand]
    ) -> RunningMetricCard? {
        guard let value else {
            return nil
        }

        let band = bands
            .sorted { $0.minInclusive > $1.minInclusive }
            .first(where: { value >= $0.minInclusive }) ?? bands.last!

        return RunningMetricCard(
            id: id,
            title: title,
            shortLabel: shortLabel,
            value: "\(format(value, digits: digits)) \(unit)",
            detail: band.label,
            interpretation: band.narrative,
            trend: deltaText(current: value, previous: priorValue, digits: digits)
        )
    }

    private static func buildSnapshotTrendCard(
        id: String,
        title: String,
        keyPath: KeyPath<RunningSignalSnapshot, Double?>,
        recentRange: DateInterval,
        priorRange: DateInterval,
        snapshots: [RunningSignalSnapshot],
        digits: Int,
        unit: String
    ) -> RunningTrendCard {
        let recent = averageValue(for: snapshots, keyPath: keyPath, range: recentRange)
        let prior = averageValue(for: snapshots, keyPath: keyPath, range: priorRange)

        return RunningTrendCard(
            id: id,
            title: title,
            value: recent.map { "\(format($0, digits: digits)) \(unit)" } ?? "n/a",
            detail: compareText(recent: recent, prior: prior, digits: digits, unit: " \(unit)")
        )
    }

    private static func averageValue(
        for snapshots: [RunningSignalSnapshot],
        keyPath: KeyPath<RunningSignalSnapshot, Double?>,
        range: DateInterval
    ) -> Double? {
        let values = snapshots
            .filter { range.contains($0.date) }
            .compactMap { $0[keyPath: keyPath] }

        guard !values.isEmpty else {
            return nil
        }

        return values.reduce(0, +) / Double(values.count)
    }

    private static func averageDistance(for workouts: [RunningWorkoutSummary], range: DateInterval) -> Double? {
        let values = workouts
            .filter { range.contains($0.startDate) }
            .compactMap(\.distanceKm)

        guard !values.isEmpty else {
            return nil
        }

        return values.reduce(0, +) / Double(values.count)
    }

    private static func coreMetricCount(for snapshot: RunningSignalSnapshot) -> Int {
        [
            snapshot.powerToWeight,
            snapshot.efficiencyIndex,
            snapshot.aerobicStability,
            snapshot.cadenceEfficiency,
            snapshot.powerHeartRate,
            snapshot.vo2Max,
            snapshot.recoveryIndex
        ]
        .compactMap { $0 }
        .count
    }

    private static func dateRange(daysBackStart: Int, daysBackEnd: Int) -> DateInterval {
        let now = Date()
        let start = Calendar.current.date(byAdding: .day, value: -daysBackStart, to: now) ?? now
        let end = Calendar.current.date(byAdding: .day, value: -daysBackEnd, to: now) ?? now
        return DateInterval(start: start, end: end)
    }

    private static func compareText(recent: Double?, prior: Double?, digits: Int, unit: String) -> String {
        guard let recent else {
            return "No recent data window yet."
        }

        guard let prior else {
            return "Recent window baseline: \(format(recent, digits: digits))\(unit)"
        }

        let delta = recent - prior
        let sign = delta > 0 ? "+" : ""
        return "Last 90d vs prior 90d: \(sign)\(format(delta, digits: digits))\(unit)"
    }

    private static func deltaText(current: Double, previous: Double?, digits: Int) -> String {
        guard let previous else {
            return "Baseline from the latest imported run."
        }

        let delta = current - previous
        let sign = delta > 0 ? "+" : ""
        return "\(sign)\(format(delta, digits: digits)) vs previous run"
    }

    private static func percentage(numerator: Int, denominator: Int) -> Double {
        guard denominator > 0 else {
            return 0
        }

        return (Double(numerator) / Double(denominator)) * 100
    }

    private static func safeDivide(_ numerator: Double?, _ denominator: Double?) -> Double? {
        guard let numerator, let denominator, denominator > 0 else {
            return nil
        }

        return numerator / denominator
    }

    private static func round(_ value: Double?, digits: Int) -> Double? {
        guard let value else {
            return nil
        }

        let factor = pow(10.0, Double(digits))
        return (value * factor).rounded() / factor
    }

    private static func format(_ value: Double, digits: Int) -> String {
        String(format: "%.\(digits)f", value)
    }

    private static func relativeDateString(for date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
