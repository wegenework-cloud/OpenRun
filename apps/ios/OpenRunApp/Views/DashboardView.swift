import SwiftUI

struct DashboardView: View {
    @ObservedObject var store: OpenRunStore
    @ObservedObject var healthBridge: AppleHealthBridge

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    heroCard
                    metricsGrid
                    localControlsCard
                    importStack
                    goalsStack
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("OpenRun")
        }
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Private training intelligence")
                .font(.caption)
                .textCase(.uppercase)
                .foregroundStyle(.orange)

            Text("Build the iPhone app first, keep the athlete's data local, and make trust visible.")
                .font(.system(size: 30, weight: .bold, design: .rounded))

            Text("This native app is the privacy-first control center for imports, recovery context, goal tracking, and narrow AI coaching.")
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                Image(systemName: "iphone")
                Text("Primary surface now")
                Spacer()
                Image(systemName: "chart.line.uptrend.xyaxis")
                Text("12-month running analysis live")
            }
            .font(.footnote.weight(.semibold))
            .padding(12)
            .background(.white.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(20)
        .foregroundStyle(.white)
        .background(
            LinearGradient(
                colors: [Color(red: 0.98, green: 0.43, blue: 0.18), Color(red: 0.09, green: 0.17, blue: 0.27)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
    }

    private var metricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(store.dashboardMetrics) { metric in
                VStack(alignment: .leading, spacing: 6) {
                    Text(metric.label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(metric.value)
                        .font(.title3.bold())
                    Text(metric.detail)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
        }
    }

    private var localControlsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeading("On-device workspace", subtitle: "The editable state persists locally on this phone.")

            VStack(alignment: .leading, spacing: 8) {
                Text("Hydration today: \(String(format: "%.1f", store.workspace.hydrationLiters))L")
                    .font(.subheadline.weight(.semibold))
                Slider(value: Binding(
                    get: { store.workspace.hydrationLiters },
                    set: { store.updateHydration($0) }
                ), in: 0 ... 5, step: 0.1)
                .tint(.orange)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Recovery score: \(store.workspace.recoveryScore)")
                    .font(.subheadline.weight(.semibold))
                Slider(value: Binding(
                    get: { Double(store.workspace.recoveryScore) },
                    set: { store.updateRecovery(Int($0)) }
                ), in: 30 ... 100, step: 1)
                .tint(.orange)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Current injury or concern")
                    .font(.subheadline.weight(.semibold))
                TextField(
                    "Describe the current signal",
                    text: Binding(
                        get: { store.workspace.injuryNote },
                        set: { store.updateInjuryNote($0) }
                    ),
                    axis: .vertical
                )
                .textFieldStyle(.roundedBorder)
            }

            Toggle(
                "Allow daily AI nudges on this device",
                isOn: Binding(
                    get: { store.workspace.nudgesEnabled },
                    set: { store.updateNudgesEnabled($0) }
                )
            )

            Divider()

            VStack(alignment: .leading, spacing: 6) {
                Text("Apple Health bridge")
                    .font(.subheadline.weight(.semibold))
                Text(healthBridge.statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if healthBridge.availability == .available {
                    HStack(spacing: 12) {
                        Button("Request Apple Health access") {
                            Task {
                                await healthBridge.requestAuthorization()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)

                        if !store.runningHistory.isEmpty {
                            Text("\(store.runningHistory.count) runs synced")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var importStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Import stack", subtitle: "Start with formats users already own.")

            ForEach(DemoData.importSources) { source in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(source.title)
                            .font(.headline)
                        Spacer()
                        Text(source.status.rawValue)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(source.status == .ready ? Color.green.opacity(0.16) : Color.orange.opacity(0.16))
                            .foregroundStyle(source.status == .ready ? Color.green : Color.orange)
                            .clipShape(Capsule())
                    }

                    Text(source.detail)
                        .foregroundStyle(.secondary)

                    Label(source.privacyMode, systemImage: "lock")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(18)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            }
        }
    }

    private var goalsStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Goals", subtitle: "Progress should stay attached to blockers and next actions.")

            ForEach(DemoData.goals) { goal in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(goal.title)
                            .font(.headline)
                        Spacer()
                        Text(goal.status.rawValue)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(statusColor(goal.status).opacity(0.16))
                            .foregroundStyle(statusColor(goal.status))
                            .clipShape(Capsule())
                    }

                    Text(goal.metric)
                        .foregroundStyle(.secondary)

                    Text("Blockers")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)

                    ForEach(goal.blockers, id: \.self) { blocker in
                        Label(blocker, systemImage: "exclamationmark.circle")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Text("Next action")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)

                    Text(goal.nextAction)
                }
                .padding(18)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            }
        }
    }

    private func sectionHeading(_ title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title3.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func statusColor(_ status: GoalStatus) -> Color {
        switch status {
        case .onTrack:
            return .green
        case .watch:
            return .orange
        case .risk:
            return .red
        }
    }
}
