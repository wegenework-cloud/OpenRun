import Foundation

struct PersistedAppState: Codable {
    var workspace: WorkspaceState
    var runningHistory: [RunningWorkoutSummary]
    var runningSnapshots: [RunningSignalSnapshot]
    var lastHealthImportAt: Date?

    static let `default` = PersistedAppState(
        workspace: .default,
        runningHistory: [],
        runningSnapshots: [],
        lastHealthImportAt: nil
    )
}

struct RunningWorkoutSummary: Identifiable, Codable, Hashable {
    let id: String
    let startDate: Date
    let endDate: Date
    let title: String
    let sourceName: String
    let durationMinutes: Double
    let distanceKm: Double?
    let energyBurnedKcal: Double?
    let averageHeartRateBpm: Double?
    let maxHeartRateBpm: Double?
    let averagePowerWatts: Double?
    let averageSpeedMetersPerSecond: Double?
    let cadenceSpm: Double?
    let firstHalfHeartRateBpm: Double?
    let secondHalfHeartRateBpm: Double?
    let vo2Max: Double?
    let heartRateDrop1Min: Double?
    let heartRateDrop2Min: Double?
    let bodyWeightKg: Double?
    let elevationGainMeters: Double?
    let elevationLossMeters: Double?
    let airTemperatureC: Double?
    let humidityPercent: Double?
    let groundContactTimeMs: Double?
    let strideLengthMeters: Double?
    let verticalOscillationCm: Double?
    let gapFlags: [String]
}

struct RunningSignalSnapshot: Identifiable, Codable, Hashable {
    let id: String
    let workoutID: String
    let title: String
    let date: Date
    let powerToWeight: Double?
    let efficiencyIndex: Double?
    let aerobicStability: Double?
    let cadenceEfficiency: Double?
    let powerHeartRate: Double?
    let vo2Max: Double?
    let recoveryIndex: Double?
    let gapFlags: [String]
}

struct HistoricalRunningImportPayload {
    let workouts: [RunningWorkoutSummary]
    let snapshots: [RunningSignalSnapshot]
    let importedAt: Date
}

struct RunningOverviewStat: Identifiable {
    let id = UUID()
    let label: String
    let value: String
    let detail: String
}

struct RunningMetricCard: Identifiable {
    let id: String
    let title: String
    let shortLabel: String
    let value: String
    let detail: String
    let interpretation: String
    let trend: String
}

struct RunningTrendCard: Identifiable {
    let id: String
    let title: String
    let value: String
    let detail: String
}

struct RunningGapNote: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
}
