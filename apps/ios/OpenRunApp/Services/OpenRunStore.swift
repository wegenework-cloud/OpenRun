import Foundation

@MainActor
final class OpenRunStore: ObservableObject {
    @Published var workspace: WorkspaceState {
        didSet { persistState() }
    }

    @Published private(set) var runningHistory: [RunningWorkoutSummary] {
        didSet { persistState() }
    }

    @Published private(set) var runningSnapshots: [RunningSignalSnapshot] {
        didSet { persistState() }
    }

    @Published private(set) var lastHealthImportAt: Date? {
        didSet { persistState() }
    }

    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let appStateKey = "openrun.ios.app-state.v2"
    private let legacyWorkspaceKey = "openrun.ios.workspace.v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        if
            let data = defaults.data(forKey: appStateKey),
            let decoded = try? decoder.decode(PersistedAppState.self, from: data)
        {
            workspace = decoded.workspace
            runningHistory = decoded.runningHistory.sorted { $0.startDate > $1.startDate }
            runningSnapshots = decoded.runningSnapshots.sorted { $0.date > $1.date }
            lastHealthImportAt = decoded.lastHealthImportAt
            return
        }

        if
            let data = defaults.data(forKey: legacyWorkspaceKey),
            let decoded = try? decoder.decode(WorkspaceState.self, from: data)
        {
            workspace = decoded
        } else {
            workspace = .default
        }

        runningHistory = []
        runningSnapshots = []
        lastHealthImportAt = nil
    }

    var selectedPlanWeek: PlanWeek {
        DemoData.planWeeks.first(where: { $0.id == workspace.selectedPlanWeek }) ?? DemoData.planWeeks[0]
    }

    var dashboardMetrics: [DashboardMetric] {
        var base = [
            DashboardMetric(
                label: "Recovery",
                value: "\(workspace.recoveryScore)",
                detail: "readiness score"
            ),
            DashboardMetric(
                label: "Hydration",
                value: String(format: "%.1fL", workspace.hydrationLiters),
                detail: "target \(String(format: "%.1f", DemoData.hydrationTargetLiters))L"
            ),
            DashboardMetric(
                label: "Plan",
                value: "Week \(selectedPlanWeek.id)",
                detail: selectedPlanWeek.phase
            )
        ]

        if runningHistory.isEmpty {
            base.append(
                DashboardMetric(
                    label: "History",
                    value: "0",
                    detail: "runs imported"
                )
            )
        } else {
            base.append(
                DashboardMetric(
                    label: "Runs",
                    value: "\(runningHistory.count)",
                    detail: "last 12 months"
                )
            )
        }

        return base
    }

    var coachNudgeTitle: String {
        if !workspace.nudgesEnabled {
            return "Nudges are paused"
        }

        if injuryNoteIsElevated {
            return "Protect the next key session"
        }

        if hydrationGap > 0.6 {
            return "Close the hydration gap today"
        }

        if let latestSnapshot, let durability = latestSnapshot.aerobicStability, durability < 92 {
            return "Recent durability faded"
        }

        if workspace.recoveryScore < 70 {
            return "Convert intensity into control"
        }

        return "Momentum is intact"
    }

    var coachNudgeSummary: String {
        if !workspace.nudgesEnabled {
            return "The plan is still stored locally on this phone, but the coach is not interrupting the athlete right now."
        }

        if injuryNoteIsElevated {
            return "The injury note looks like a repeat signal instead of a one-off complaint, so the schedule should bend before it breaks."
        }

        if hydrationGap > 0.6 {
            return "You are far enough behind the hydration target that tomorrow's recovery quality is likely to suffer."
        }

        if let latestSnapshot, let durability = latestSnapshot.aerobicStability, durability < 92 {
            return "The latest imported run faded enough to suggest heat, fueling, or fatigue cost you control late in the session."
        }

        if workspace.recoveryScore < 70 {
            return "Recovery is below the threshold for pretending this is a perfect hard day."
        }

        return "The current signals support staying on the selected marathon week without forcing changes."
    }

    var coachNudgeAction: String {
        if !workspace.nudgesEnabled {
            return "Turn nudges back on when you want the app to actively challenge missed habits."
        }

        if injuryNoteIsElevated {
            return selectedPlanWeek.adaptation
        }

        if hydrationGap > 0.6 {
            return "Add \(String(format: "%.1f", hydrationGap))L across the rest of the day and attach it to your next meal."
        }

        if let latestSnapshot, let recovery = latestSnapshot.recoveryIndex, recovery < 24 {
            return "Keep the next session easy and treat fueling plus sleep as part of the workout, not cleanup after it."
        }

        if workspace.recoveryScore < 70 {
            return "Keep the session, cut the sharpest interval block, and protect sleep tonight."
        }

        return "Stay with week \(selectedPlanWeek.id) as written and protect the recovery routine after the long run."
    }

    var latestSnapshot: RunningSignalSnapshot? {
        runningSnapshots.sorted { $0.date > $1.date }.first
    }

    var historicalOverviewStats: [RunningOverviewStat] {
        RunningAnalysisEngine.buildOverviewStats(
            from: runningHistory,
            snapshots: runningSnapshots,
            lastImportAt: lastHealthImportAt
        )
    }

    var historicalMetricCards: [RunningMetricCard] {
        RunningAnalysisEngine.buildMetricCards(from: runningSnapshots)
    }

    var historicalTrendCards: [RunningTrendCard] {
        RunningAnalysisEngine.buildTrendCards(from: runningSnapshots, workouts: runningHistory)
    }

    var gapNotes: [RunningGapNote] {
        RunningAnalysisEngine.buildGapNotes(from: runningHistory, snapshots: runningSnapshots)
    }

    var recentRunningHistory: [RunningWorkoutSummary] {
        runningHistory.sorted { $0.startDate > $1.startDate }
    }

    func updateHydration(_ value: Double) {
        workspace.hydrationLiters = value
    }

    func updateRecovery(_ value: Int) {
        workspace.recoveryScore = value
    }

    func updateInjuryNote(_ value: String) {
        workspace.injuryNote = value
    }

    func updateSelectedPlanWeek(_ value: Int) {
        workspace.selectedPlanWeek = value
    }

    func updateNudgesEnabled(_ value: Bool) {
        workspace.nudgesEnabled = value
    }

    func replaceRunningHistory(with payload: HistoricalRunningImportPayload) {
        runningHistory = payload.workouts.sorted { $0.startDate > $1.startDate }
        runningSnapshots = payload.snapshots.sorted { $0.date > $1.date }
        lastHealthImportAt = payload.importedAt
    }

    private var hydrationGap: Double {
        max(0, DemoData.hydrationTargetLiters - workspace.hydrationLiters)
    }

    private var injuryNoteIsElevated: Bool {
        let note = workspace.injuryNote.lowercased()
        return note.contains("calf") || note.contains("pain") || note.contains("injur")
    }

    private func persistState() {
        let state = PersistedAppState(
            workspace: workspace,
            runningHistory: runningHistory,
            runningSnapshots: runningSnapshots,
            lastHealthImportAt: lastHealthImportAt
        )

        guard let data = try? encoder.encode(state) else {
            return
        }

        defaults.set(data, forKey: appStateKey)
    }
}
