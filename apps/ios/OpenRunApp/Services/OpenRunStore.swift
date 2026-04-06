import Foundation

@MainActor
final class OpenRunStore: ObservableObject {
    @Published var workspace: WorkspaceState {
        didSet {
            persistWorkspace()
        }
    }

    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let workspaceKey = "openrun.ios.workspace.v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        if
            let data = defaults.data(forKey: workspaceKey),
            let decoded = try? decoder.decode(WorkspaceState.self, from: data)
        {
            workspace = decoded
        } else {
            workspace = .default
        }
    }

    var selectedPlanWeek: PlanWeek {
        DemoData.planWeeks.first(where: { $0.id == workspace.selectedPlanWeek }) ?? DemoData.planWeeks[0]
    }

    var dashboardMetrics: [DashboardMetric] {
        [
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
                label: "Sessions",
                value: "\(DemoData.completedSessions)/\(DemoData.weeklyTargetSessions)",
                detail: "completed this week"
            ),
            DashboardMetric(
                label: "Plan",
                value: "Week \(selectedPlanWeek.id)",
                detail: selectedPlanWeek.phase
            )
        ]
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

        if workspace.recoveryScore < 70 {
            return "Keep the session, cut the sharpest interval block, and protect sleep tonight."
        }

        return "Stay with week \(selectedPlanWeek.id) as written and protect the recovery routine after the long run."
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

    private var hydrationGap: Double {
        max(0, DemoData.hydrationTargetLiters - workspace.hydrationLiters)
    }

    private var injuryNoteIsElevated: Bool {
        let note = workspace.injuryNote.lowercased()
        return note.contains("calf") || note.contains("pain") || note.contains("injur")
    }

    private func persistWorkspace() {
        guard let data = try? encoder.encode(workspace) else {
            return
        }

        defaults.set(data, forKey: workspaceKey)
    }
}
