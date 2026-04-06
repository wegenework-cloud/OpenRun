import SwiftUI

struct PlanView: View {
    @ObservedObject var store: OpenRunStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    planPickerCard
                    selectedWeekCard
                    nudgeCard
                    watchRoadmapCard
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Plan")
        }
    }

    private var planPickerCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Marathon plan engine")
                .font(.title3.bold())

            Text("The iPhone app should import a PDF plan, normalize it, and then adapt the week based on recovery, pain, hydration, and consistency.")
                .foregroundStyle(.secondary)

            Picker(
                "Selected week",
                selection: Binding(
                    get: { store.workspace.selectedPlanWeek },
                    set: { store.updateSelectedPlanWeek($0) }
                )
            ) {
                ForEach(DemoData.planWeeks) { week in
                    Text("Week \(week.id)").tag(week.id)
                }
            }
            .pickerStyle(.segmented)
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var selectedWeekCard: some View {
        let selected = store.selectedPlanWeek

        return VStack(alignment: .leading, spacing: 12) {
            Text("Week \(selected.id): \(selected.phase)")
                .font(.title2.bold())

            Text(selected.focus)
                .foregroundStyle(.secondary)

            Label(selected.mileage, systemImage: "road.lanes")
                .font(.subheadline.weight(.semibold))

            Divider()

            Text("Key sessions")
                .font(.headline)

            ForEach(selected.keySessions, id: \.self) { session in
                Label(session, systemImage: "circle.fill")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Divider()

            Text("Adaptive rule")
                .font(.headline)

            Text(selected.adaptation)
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var nudgeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Daily nudge")
                .font(.title3.bold())

            Text(store.coachNudgeTitle)
                .font(.headline)
                .foregroundStyle(.orange)

            Text(store.coachNudgeSummary)
                .foregroundStyle(.secondary)

            Divider()

            Text("Suggested next move")
                .font(.headline)

            Text(store.coachNudgeAction)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.orange.opacity(0.18), Color.blue.opacity(0.12)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var watchRoadmapCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Apple Watch app next")
                .font(.title3.bold())

            Text("The watch companion should stay narrow and useful: start workout capture, quick pain check-in, hydration nudge, and plan adherence prompts.")
                .foregroundStyle(.secondary)

            Label("Start and annotate workouts from the wrist", systemImage: "applewatch.radiowaves.left.and.right")
            Label("Post-run pain and energy check-ins", systemImage: "heart.text.square")
            Label("Minimal offline-first sync with the iPhone app", systemImage: "arrow.triangle.2.circlepath")
        }
        .font(.footnote)
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
