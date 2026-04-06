import Foundation
import HealthKit

@MainActor
final class AppleHealthBridge: ObservableObject {
    enum Availability {
        case available
        case unavailable
    }

    @Published private(set) var availability: Availability
    @Published private(set) var statusMessage: String

    private let healthStore = HKHealthStore()

    init() {
        if HKHealthStore.isHealthDataAvailable() {
            availability = .available
            statusMessage = "Apple Health can be connected from the iPhone app. The direct permission flow is the next native implementation step."
        } else {
            availability = .unavailable
            statusMessage = "Health data is not available on this device configuration."
        }
    }

    func requestAuthorization() async {
        guard availability == .available else {
            return
        }

        let readTypes = Set<HKObjectType>([
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
            HKObjectType.quantityType(forIdentifier: .heartRate),
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)
        ]
        .compactMap { $0 })

        do {
            try await healthStore.requestAuthorization(toShare: [], read: readTypes)
            statusMessage = "Apple Health authorization was requested. The next step is to map those records into OpenRun's local schema."
        } catch {
            statusMessage = "Apple Health authorization failed: \(error.localizedDescription)"
        }
    }
}
