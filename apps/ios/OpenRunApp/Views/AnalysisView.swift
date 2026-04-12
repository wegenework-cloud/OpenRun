import SwiftUI

struct AnalysisView: View {
    @ObservedObject var store: OpenRunStore
    @ObservedObject var healthBridge: AppleHealthBridge

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    importCard
                    overviewGrid
                    metricStack
                    trendStack
                    gapStack
                    historyStack
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Analysis")
        }
    }

    private var importCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Historical running analysis")
                .font(.title2.bold())

            Text("Import the last 12 months of running workouts from Apple Health into OpenRun's local store, then compute the higher-is-better metrics on device.")
                .foregroundStyle(.secondary)

            Text(healthBridge.statusMessage)
                .font(.footnote)
                .foregroundStyle(.secondary)

            if let lastHealthImportAt = store.lastHealthImportAt {
                Text("Last sync: \(lastHealthImportAt.formatted(date: .abbreviated, time: .shortened))")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.orange)
            }

            HStack(spacing: 12) {
                if healthBridge.availability == .available {
                    Button("Request Apple Health access") {
                        Task {
                            await healthBridge.requestAuthorization()
                        }
                    }
                    .buttonStyle(.bordered)

                    Button(healthBridge.isImporting ? "Importing..." : "Import last 12 months") {
                        Task {
                            await importHistory()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(healthBridge.isImporting)
                } else {
                    Label("Apple Health unavailable on this device", systemImage: "exclamationmark.triangle")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var overviewGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("12-month overview", subtitle: "Local totals and data coverage after import.")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(store.historicalOverviewStats) { stat in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(stat.label)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(stat.value)
                            .font(.title3.bold())
                        Text(stat.detail)
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
    }

    private var metricStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Latest core metrics", subtitle: "Derived from the most recent imported run with available signals.")

            if store.historicalMetricCards.isEmpty {
                emptyCard("No derived metrics yet. Import running workouts from Apple Health first.")
            } else {
                ForEach(store.historicalMetricCards) { metric in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(metric.shortLabel)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(metric.title)
                                    .font(.headline)
                            }
                            Spacer()
                            Text(metric.value)
                                .font(.headline.weight(.bold))
                        }

                        Text(metric.detail)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.orange)

                        Text(metric.interpretation)
                            .foregroundStyle(.secondary)

                        Text(metric.trend)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding(18)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                }
            }
        }
    }

    private var trendStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Trend reads", subtitle: "Recent window versus the prior 90-day window.")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(store.historicalTrendCards) { trend in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(trend.title)
                            .font(.headline)
                        Text(trend.value)
                            .font(.title3.bold())
                        Text(trend.detail)
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
    }

    private var gapStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Gap handling", subtitle: "What Apple exposes cleanly and where OpenRun falls back.")

            ForEach(store.gapNotes) { note in
                VStack(alignment: .leading, spacing: 6) {
                    Text(note.title)
                        .font(.headline)
                    Text(note.detail)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
        }
    }

    private var historyStack: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionHeading("Recent imported runs", subtitle: "Local workout-history table built from HealthKit.")

            if store.recentRunningHistory.isEmpty {
                emptyCard("The run table appears here after the first successful import.")
            } else {
                ForEach(Array(store.recentRunningHistory.prefix(12))) { workout in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(workout.title)
                                    .font(.headline)
                                Text(workout.startDate.formatted(date: .abbreviated, time: .shortened))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(workout.distanceKm.map { String(format: "%.1f km", $0) } ?? "n/a")
                                .font(.headline.weight(.bold))
                        }

                        HStack(spacing: 14) {
                            metricPill(title: "Duration", value: "\(String(format: "%.0f", workout.durationMinutes)) min")
                            metricPill(title: "Power", value: workout.averagePowerWatts.map { "\(String(format: "%.0f", $0)) W" } ?? "n/a")
                            metricPill(title: "HR", value: workout.averageHeartRateBpm.map { "\(String(format: "%.0f", $0)) bpm" } ?? "n/a")
                        }

                        if !workout.gapFlags.isEmpty {
                            Text(workout.gapFlags.prefix(2).joined(separator: " "))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(18)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                }
            }
        }
    }

    private func importHistory() async {
        do {
            let payload = try await healthBridge.importLastYearRunningHistory()
            store.replaceRunningHistory(with: payload)
        } catch {
            // The bridge already surfaces the specific failure to the UI.
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

    private func metricPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.footnote.weight(.semibold))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func emptyCard(_ message: String) -> some View {
        Text(message)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
