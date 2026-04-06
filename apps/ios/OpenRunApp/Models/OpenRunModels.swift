import Foundation

struct DashboardMetric: Identifiable {
    let id = UUID()
    let label: String
    let value: String
    let detail: String
}

struct ImportSourceCard: Identifiable {
    let id = UUID()
    let title: String
    let status: DeliveryStatus
    let detail: String
    let privacyMode: String
}

struct GoalCard: Identifiable {
    let id = UUID()
    let title: String
    let status: GoalStatus
    let metric: String
    let blockers: [String]
    let nextAction: String
}

struct PlanWeek: Identifiable, Codable, Hashable {
    let id: Int
    let phase: String
    let focus: String
    let mileage: String
    let keySessions: [String]
    let adaptation: String
}

struct PrivacyPromise: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
    let proof: String
}

struct NetworkPolicy: Identifiable {
    let id = UUID()
    let title: String
    let destination: String
    let rule: String
}

enum DeliveryStatus: String {
    case ready = "Ready"
    case planned = "Planned"
}

enum GoalStatus: String {
    case onTrack = "On Track"
    case watch = "Watch"
    case risk = "Risk"
}

struct WorkspaceState: Codable {
    var hydrationLiters: Double
    var recoveryScore: Int
    var injuryNote: String
    var selectedPlanWeek: Int
    var nudgesEnabled: Bool

    static let `default` = WorkspaceState(
        hydrationLiters: 2.1,
        recoveryScore: 76,
        injuryNote: "Left calf gets tight after harder long-run finishes.",
        selectedPlanWeek: 8,
        nudgesEnabled: true
    )
}

enum DemoData {
    static let athleteName = "Ari"
    static let hydrationTargetLiters = 3.2
    static let weeklyTargetSessions = 6
    static let completedSessions = 4

    static let importSources: [ImportSourceCard] = [
        ImportSourceCard(
            title: "PDF plans and race reports",
            status: .ready,
            detail: "Import Boston-style marathon plans, exported summaries, and other structured PDFs directly on device.",
            privacyMode: "Local parser"
        ),
        ImportSourceCard(
            title: "Apple Health export",
            status: .ready,
            detail: "Support manual Health export intake immediately while the direct HealthKit bridge is being finished.",
            privacyMode: "User-imported bundle"
        ),
        ImportSourceCard(
            title: "Strava sync or export",
            status: .planned,
            detail: "Give athletes a choice between OAuth sync and file import so OpenRun never becomes the default owner of the data.",
            privacyMode: "User-approved sync"
        ),
        ImportSourceCard(
            title: "Maps and route review",
            status: .planned,
            detail: "Use an open renderer and configurable tile source so route viewing does not silently leak movement data.",
            privacyMode: "Provider choice"
        )
    ]

    static let goals: [GoalCard] = [
        GoalCard(
            title: "Boston Marathon build",
            status: .watch,
            metric: "20-week plan imported and actively adapted",
            blockers: [
                "Hydration is under target on recent harder days",
                "Calf tightness repeats across workouts and check-ins"
            ],
            nextAction: "Keep the key long run, but soften the sharpest intensity block when recovery or pain markers worsen."
        ),
        GoalCard(
            title: "Keep the data private",
            status: .onTrack,
            metric: "Local-first storage with explicit outbound policy",
            blockers: [
                "Direct Apple Health access still needs entitlement wiring and device testing"
            ],
            nextAction: "Build the HealthKit bridge inside the iOS app, then share only derived AI payloads."
        )
    ]

    static let planWeeks: [PlanWeek] = [
        PlanWeek(
            id: 7,
            phase: "Aerobic build",
            focus: "Raise durability without adding unnecessary speed stress.",
            mileage: "41-45 miles",
            keySessions: [
                "Steady medium-long run",
                "Controlled threshold intervals",
                "Easy long run with relaxed finish"
            ],
            adaptation: "If the calf note persists, trade the threshold set for aerobic tempo and keep the long run easy."
        ),
        PlanWeek(
            id: 8,
            phase: "Strength block",
            focus: "Protect long-run quality while adding marathon-specific rhythm.",
            mileage: "45-49 miles",
            keySessions: [
                "Marathon-pace blocks in the long run",
                "Short hill session or low-impact substitute",
                "Recovery day after the biggest workload"
            ],
            adaptation: "If the calf or sleep markers worsen, remove hills first and preserve the long run on flatter terrain."
        ),
        PlanWeek(
            id: 9,
            phase: "Load consolidation",
            focus: "Hold consistency and prevent one bad day from turning into a lost week.",
            mileage: "46-50 miles",
            keySessions: [
                "Cruise intervals at controlled effort",
                "Recovery cross-training fallback",
                "Long run with negative-split finish"
            ],
            adaptation: "If hydration drops behind target, shorten total volume before cutting the full week apart."
        )
    ]

    static let privacyPromises: [PrivacyPromise] = [
        PrivacyPromise(
            title: "Your logs stay here first",
            detail: "Workouts, food notes, water intake, symptoms, and goals should default to local device storage.",
            proof: "This iOS scaffold has no backend and no analytics or cloud sync code."
        ),
        PrivacyPromise(
            title: "AI is a narrow boundary",
            detail: "The model should receive a summary, not the entire workout history or raw health export.",
            proof: "The product direction separates local feature extraction from outbound inference."
        ),
        PrivacyPromise(
            title: "Users can inspect the contract",
            detail: "Every outbound endpoint should be allowlisted and visible in the app.",
            proof: "The privacy tab surfaces the current network policy and future AI boundary."
        )
    ]

    static let networkPolicies: [NetworkPolicy] = [
        NetworkPolicy(
            title: "Current app state",
            destination: "No remote endpoints",
            rule: "No cloud sync or telemetry is wired into this iOS starter."
        ),
        NetworkPolicy(
            title: "Future AI boundary",
            destination: "Single allowlisted model endpoint",
            rule: "Only user-approved derived summaries should leave the device."
        ),
        NetworkPolicy(
            title: "Future map provider",
            destination: "User-selected tile provider",
            rule: "Route rendering should make the provider choice explicit."
        )
    ]
}
