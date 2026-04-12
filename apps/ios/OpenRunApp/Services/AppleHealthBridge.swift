import Foundation
import HealthKit

@MainActor
final class AppleHealthBridge: ObservableObject {
    enum Availability {
        case available
        case unavailable
    }

    enum BridgeError: LocalizedError {
        case unavailable

        var errorDescription: String? {
            switch self {
            case .unavailable:
                return "Health data is not available on this device."
            }
        }
    }

    @Published private(set) var availability: Availability
    @Published private(set) var statusMessage: String
    @Published private(set) var isImporting = false

    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    init() {
        if HKHealthStore.isHealthDataAvailable() {
            availability = .available
            statusMessage = "Apple Health is available. Grant access, then import the last 12 months of running workouts into OpenRun's local analysis store."
        } else {
            availability = .unavailable
            statusMessage = "Health data is not available on this device configuration."
        }
    }

    func requestAuthorization() async {
        guard availability == .available else {
            statusMessage = BridgeError.unavailable.localizedDescription
            return
        }

        do {
            try await healthStore.requestAuthorization(toShare: [], read: buildReadTypes())
            statusMessage = "Apple Health access granted. You can import the last 12 months of running workouts now."
        } catch {
            statusMessage = "Apple Health authorization failed: \(error.localizedDescription)"
        }
    }

    func importLastYearRunningHistory() async throws -> HistoricalRunningImportPayload {
        guard availability == .available else {
            statusMessage = BridgeError.unavailable.localizedDescription
            throw BridgeError.unavailable
        }

        isImporting = true
        defer { isImporting = false }

        let importedAt = Date()
        let startDate = calendar.date(byAdding: .month, value: -12, to: importedAt) ?? importedAt

        do {
            statusMessage = "Fetching running workouts from Apple Health..."
            let workouts = try await fetchRunningWorkouts(from: startDate, to: importedAt)

            guard !workouts.isEmpty else {
                statusMessage = "No running workouts were found in Apple Health for the last 12 months."
                return HistoricalRunningImportPayload(
                    workouts: [],
                    snapshots: [],
                    importedAt: importedAt
                )
            }

            var summaries: [RunningWorkoutSummary] = []
            summaries.reserveCapacity(workouts.count)

            for (index, workout) in workouts.enumerated() {
                statusMessage = "Importing run \(index + 1) of \(workouts.count)..."
                let summary = await buildWorkoutSummary(for: workout)
                summaries.append(summary)
            }

            let snapshots = RunningAnalysisEngine.buildSnapshots(from: summaries)
            statusMessage = "Imported \(summaries.count) running workouts from the last 12 months."

            return HistoricalRunningImportPayload(
                workouts: summaries.sorted { $0.startDate > $1.startDate },
                snapshots: snapshots,
                importedAt: importedAt
            )
        } catch {
            statusMessage = "Apple Health import failed: \(error.localizedDescription)"
            throw error
        }
    }

    private func buildReadTypes() -> Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]

        let quantityIdentifiers: [HKQuantityTypeIdentifier] = [
            .heartRate,
            .distanceWalkingRunning,
            .stepCount,
            .runningPower,
            .runningSpeed,
            .vo2Max,
            .bodyMass,
            .heartRateRecoveryOneMinute,
            .runningGroundContactTime,
            .runningStrideLength,
            .runningVerticalOscillation
        ]

        for identifier in quantityIdentifiers {
            if let type = HKObjectType.quantityType(forIdentifier: identifier) {
                types.insert(type)
            }
        }

        if let routeType = HKSeriesType.workoutRoute() as HKObjectType? {
            types.insert(routeType)
        }

        return types
    }

    private func fetchRunningWorkouts(from startDate: Date, to endDate: Date) async throws -> [HKWorkout] {
        let type = HKObjectType.workoutType()
        let workoutPredicate = HKQuery.predicateForWorkouts(with: .running)
        let datePredicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [workoutPredicate, datePredicate])
        let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: sortDescriptors
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume(returning: (samples as? [HKWorkout]) ?? [])
            }

            healthStore.execute(query)
        }
    }

    private func buildWorkoutSummary(for workout: HKWorkout) async -> RunningWorkoutSummary {
        let durationMinutes = workout.duration / 60
        let midpoint = workout.startDate.addingTimeInterval(workout.duration / 2)

        async let averageHeartRate = statisticsValue(
            identifier: .heartRate,
            unit: heartRateUnit,
            options: .discreteAverage,
            workout: workout
        )
        async let maxHeartRate = statisticsValue(
            identifier: .heartRate,
            unit: heartRateUnit,
            options: .discreteMax,
            workout: workout
        )
        async let averagePower = statisticsValue(
            identifier: .runningPower,
            unit: .watt(),
            options: .discreteAverage,
            workout: workout
        )
        async let averageSpeed = statisticsValue(
            identifier: .runningSpeed,
            unit: speedUnit,
            options: .discreteAverage,
            workout: workout
        )
        async let stepCount = statisticsValue(
            identifier: .stepCount,
            unit: .count(),
            options: .cumulativeSum,
            workout: workout
        )
        async let firstHalfHeartRate = statisticsValue(
            identifier: .heartRate,
            unit: heartRateUnit,
            options: .discreteAverage,
            workout: workout,
            startDate: workout.startDate,
            endDate: midpoint
        )
        async let secondHalfHeartRate = statisticsValue(
            identifier: .heartRate,
            unit: heartRateUnit,
            options: .discreteAverage,
            workout: workout,
            startDate: midpoint,
            endDate: workout.endDate
        )
        async let bodyWeight = mostRecentQuantityValue(
            identifier: .bodyMass,
            unit: .gramUnit(with: .kilo),
            before: workout.startDate
        )
        async let vo2Max = mostRecentQuantityValue(
            identifier: .vo2Max,
            unit: vo2Unit,
            before: workout.startDate
        )
        async let heartRateDrop1Min = heartRateDrop(afterSeconds: 60, workout: workout)
        async let heartRateDrop2Min = heartRateDrop(afterSeconds: 120, workout: workout)
        async let groundContactTime = statisticsValue(
            identifier: .runningGroundContactTime,
            unit: .secondUnit(with: .milli),
            options: .discreteAverage,
            workout: workout
        )
        async let strideLength = statisticsValue(
            identifier: .runningStrideLength,
            unit: .meter(),
            options: .discreteAverage,
            workout: workout
        )
        async let verticalOscillation = statisticsValue(
            identifier: .runningVerticalOscillation,
            unit: .meterUnit(with: .centi),
            options: .discreteAverage,
            workout: workout
        )

        let resolvedAverageHeartRate = await averageHeartRate
        let resolvedMaxHeartRate = await maxHeartRate
        let resolvedAveragePower = await averagePower
        let resolvedAverageSpeed = await averageSpeed
        let resolvedStepCount = await stepCount
        let resolvedFirstHalfHeartRate = await firstHalfHeartRate
        let resolvedSecondHalfHeartRate = await secondHalfHeartRate
        let resolvedBodyWeight = await bodyWeight
        let resolvedVo2Max = await vo2Max
        let resolvedHeartRateDrop1Min = await heartRateDrop1Min
        let resolvedHeartRateDrop2Min = await heartRateDrop2Min
        let resolvedGroundContactTime = await groundContactTime
        let resolvedStrideLength = await strideLength
        let resolvedVerticalOscillation = await verticalOscillation

        let durationSeconds = workout.duration
        let distanceKm = workout.totalDistance?.doubleValue(for: .meterUnit(with: .kilo))
        let fallbackSpeed = (distanceKm.map { $0 * 1_000 } ?? 0) / max(durationSeconds, 1)
        let cadenceSpm = resolvedStepCount.map { $0 / max(durationMinutes, 0.01) }

        let titleDistance = distanceKm.map { String(format: "%.1f km", $0) } ?? "Run"
        let title = "\(titleDistance) • \(Self.shortDateFormatter.string(from: workout.startDate))"

        var gapFlags: [String] = []

        if resolvedAveragePower == nil {
            gapFlags.append("Running power not available.")
        }

        if resolvedAverageHeartRate == nil {
            gapFlags.append("Average heart rate not available.")
        }

        if resolvedStepCount == nil {
            gapFlags.append("Step count missing, so cadence could not be estimated.")
        } else {
            gapFlags.append("Cadence estimated from step count and duration.")
        }

        if resolvedBodyWeight == nil {
            gapFlags.append("Body weight missing near workout date.")
        }

        if resolvedVo2Max == nil {
            gapFlags.append("VO2 max baseline missing near workout date.")
        }

        if resolvedHeartRateDrop1Min == nil && resolvedHeartRateDrop2Min == nil {
            gapFlags.append("Post-run heart-rate recovery missing.")
        }

        if resolvedGroundContactTime == nil || resolvedStrideLength == nil || resolvedVerticalOscillation == nil {
            gapFlags.append("One or more running mechanics signals are missing.")
        }

        let airTemperatureC = metadataDoubleValue(
            for: HKMetadataKeyWeatherTemperature,
            metadata: workout.metadata,
            unit: .degreeCelsius()
        )
        let humidityPercent = metadataDoubleValue(
            for: HKMetadataKeyWeatherHumidity,
            metadata: workout.metadata,
            unit: .percent()
        )

        if airTemperatureC == nil && humidityPercent == nil {
            gapFlags.append("Weather metadata missing on this workout.")
        }

        return RunningWorkoutSummary(
            id: workout.uuid.uuidString,
            startDate: workout.startDate,
            endDate: workout.endDate,
            title: title,
            sourceName: workout.device?.name ?? workout.sourceRevision.source.name,
            durationMinutes: durationMinutes,
            distanceKm: distanceKm,
            energyBurnedKcal: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
            averageHeartRateBpm: resolvedAverageHeartRate,
            maxHeartRateBpm: resolvedMaxHeartRate,
            averagePowerWatts: resolvedAveragePower,
            averageSpeedMetersPerSecond: resolvedAverageSpeed ?? (distanceKm == nil ? nil : fallbackSpeed),
            cadenceSpm: cadenceSpm,
            firstHalfHeartRateBpm: resolvedFirstHalfHeartRate,
            secondHalfHeartRateBpm: resolvedSecondHalfHeartRate,
            vo2Max: resolvedVo2Max,
            heartRateDrop1Min: resolvedHeartRateDrop1Min,
            heartRateDrop2Min: resolvedHeartRateDrop2Min,
            bodyWeightKg: resolvedBodyWeight,
            elevationGainMeters: metadataDoubleValue(
                for: HKMetadataKeyElevationAscended,
                metadata: workout.metadata,
                unit: .meter()
            ),
            elevationLossMeters: metadataDoubleValue(
                for: HKMetadataKeyElevationDescended,
                metadata: workout.metadata,
                unit: .meter()
            ),
            airTemperatureC: airTemperatureC,
            humidityPercent: humidityPercent,
            groundContactTimeMs: resolvedGroundContactTime,
            strideLengthMeters: resolvedStrideLength,
            verticalOscillationCm: resolvedVerticalOscillation,
            gapFlags: gapFlags
        )
    }

    private func statisticsValue(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        options: HKStatisticsOptions,
        workout: HKWorkout,
        startDate: Date? = nil,
        endDate: Date? = nil
    ) async -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return nil
        }

        var predicates = [HKQuery.predicateForObjects(from: workout)]
        if startDate != nil || endDate != nil {
            predicates.append(HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: []))
        }

        let predicate = predicates.count == 1
            ? predicates[0]
            : NSCompoundPredicate(andPredicateWithSubpredicates: predicates)

        let statistics: HKStatistics? = await withCheckedContinuation { (continuation: CheckedContinuation<HKStatistics?, Never>) in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: options
            ) { _, result, error in
                if let error {
                    continuation.resume(returning: Self.shouldTreatAsMissingData(error) ? nil : nil)
                    return
                }

                continuation.resume(returning: result)
            }

            healthStore.execute(query)
        }

        guard let statistics else {
            return nil
        }

        if options.contains(.cumulativeSum) {
            return statistics.sumQuantity()?.doubleValue(for: unit)
        }

        if options.contains(.discreteMax) {
            return statistics.maximumQuantity()?.doubleValue(for: unit)
        }

        return statistics.averageQuantity()?.doubleValue(for: unit)
    }

    private func mostRecentQuantityValue(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        before date: Date
    ) async -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return nil
        }

        let predicate = HKQuery.predicateForSamples(withStart: nil, end: date, options: .strictEndDate)
        let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]

        let sample: HKQuantitySample? = await withCheckedContinuation { (continuation: CheckedContinuation<HKQuantitySample?, Never>) in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 1,
                sortDescriptors: sortDescriptors
            ) { _, samples, error in
                if let error {
                    continuation.resume(returning: Self.shouldTreatAsMissingData(error) ? nil : nil)
                    return
                }

                continuation.resume(returning: (samples?.first as? HKQuantitySample))
            }

            healthStore.execute(query)
        }

        return sample?.quantity.doubleValue(for: unit)
    }

    private func heartRateDrop(afterSeconds seconds: TimeInterval, workout: HKWorkout) async -> Double? {
        async let endHeartRate = averageQuantityAroundTime(
            identifier: .heartRate,
            unit: heartRateUnit,
            startDate: workout.endDate.addingTimeInterval(-45),
            endDate: workout.endDate.addingTimeInterval(5),
            sourceRevision: workout.sourceRevision
        )
        async let recoveryHeartRate = averageQuantityAroundTime(
            identifier: .heartRate,
            unit: heartRateUnit,
            startDate: workout.endDate.addingTimeInterval(seconds - 15),
            endDate: workout.endDate.addingTimeInterval(seconds + 15),
            sourceRevision: workout.sourceRevision
        )

        let resolvedEndHeartRate = await endHeartRate
        let resolvedRecoveryHeartRate = await recoveryHeartRate

        if let resolvedEndHeartRate, let resolvedRecoveryHeartRate {
            return max(0, resolvedEndHeartRate - resolvedRecoveryHeartRate)
        }

        if seconds == 60 {
            return await mostRecentWorkoutRecoveryQuantity(for: workout)
        }

        return nil
    }

    private func mostRecentWorkoutRecoveryQuantity(for workout: HKWorkout) async -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: .heartRateRecoveryOneMinute) else {
            return nil
        }

        let datePredicate = HKQuery.predicateForSamples(
            withStart: workout.endDate.addingTimeInterval(-600),
            end: workout.endDate.addingTimeInterval(600),
            options: []
        )
        let sourceRevisions: Set<HKSourceRevision> = [workout.sourceRevision]
        let sourcePredicate = HKQuery.predicateForObjects(from: sourceRevisions)
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [datePredicate, sourcePredicate])
        let sortDescriptors = [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]

        let sample: HKQuantitySample? = await withCheckedContinuation { (continuation: CheckedContinuation<HKQuantitySample?, Never>) in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 1,
                sortDescriptors: sortDescriptors
            ) { _, samples, error in
                if let error {
                    continuation.resume(returning: Self.shouldTreatAsMissingData(error) ? nil : nil)
                    return
                }

                continuation.resume(returning: (samples?.first as? HKQuantitySample))
            }

            healthStore.execute(query)
        }

        return sample?.quantity.doubleValue(for: heartRateUnit)
    }

    private func averageQuantityAroundTime(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        startDate: Date,
        endDate: Date,
        sourceRevision: HKSourceRevision
    ) async -> Double? {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            return nil
        }

        let datePredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: [])
        let sourceRevisions: Set<HKSourceRevision> = [sourceRevision]
        let sourcePredicate = HKQuery.predicateForObjects(from: sourceRevisions)
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [datePredicate, sourcePredicate])

        let statistics: HKStatistics? = await withCheckedContinuation { (continuation: CheckedContinuation<HKStatistics?, Never>) in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, result, error in
                if let error {
                    continuation.resume(returning: Self.shouldTreatAsMissingData(error) ? nil : nil)
                    return
                }

                continuation.resume(returning: result)
            }

            healthStore.execute(query)
        }

        guard let statistics else {
            return nil
        }

        return statistics.averageQuantity()?.doubleValue(for: unit)
    }

    private static func shouldTreatAsMissingData(_ error: Error) -> Bool {
        let message = error.localizedDescription.lowercased()
        return message.contains("no data available for the specified predicate")
            || message.contains("no data available")
    }

    private func metadataDoubleValue(for key: String, metadata: [String: Any]?, unit: HKUnit) -> Double? {
        guard let rawValue = metadata?[key] else {
            return nil
        }

        if let quantity = rawValue as? HKQuantity {
            let value = quantity.doubleValue(for: unit)
            return normalizeMetadataValue(key: key, value: value)
        }

        if let number = rawValue as? NSNumber {
            return normalizeMetadataValue(key: key, value: number.doubleValue)
        }

        return nil
    }

    private func normalizeMetadataValue(key: String, value: Double) -> Double {
        if key == HKMetadataKeyWeatherHumidity, value <= 1 {
            return value * 100
        }

        return value
    }

    private var heartRateUnit: HKUnit {
        HKUnit.count().unitDivided(by: .minute())
    }

    private var speedUnit: HKUnit {
        HKUnit.meter().unitDivided(by: .second())
    }

    private var vo2Unit: HKUnit {
        HKUnit.literUnit(with: .milli)
            .unitDivided(by: HKUnit.gramUnit(with: .kilo))
            .unitDivided(by: .minute())
    }

    private static let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
