import SwiftUI

struct PrivacyView: View {
    @ObservedObject var healthBridge: AppleHealthBridge

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    privacyHero
                    promisesCard
                    networkCard
                    platformCard
                }
                .padding(20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Privacy")
        }
    }

    private var privacyHero: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AAA trust product")
                .font(.caption.weight(.semibold))
                .textCase(.uppercase)
                .foregroundStyle(.orange)

            Text("The differentiator is not just AI quality. It is owning the data, proving where it lives, and making the network contract inspectable.")
                .font(.title2.bold())

            Text(healthBridge.statusMessage)
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var promisesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Privacy promises")
                .font(.title3.bold())

            ForEach(DemoData.privacyPromises) { promise in
                VStack(alignment: .leading, spacing: 8) {
                    Text(promise.title)
                        .font(.headline)
                    Text(promise.detail)
                        .foregroundStyle(.secondary)
                    Text("Proof")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.orange)
                    Text(promise.proof)
                        .font(.footnote)
                }
                .padding(16)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var networkCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Network policy")
                .font(.title3.bold())

            ForEach(DemoData.networkPolicies) { policy in
                VStack(alignment: .leading, spacing: 6) {
                    Text(policy.title)
                        .font(.headline)
                    Text(policy.destination)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.orange)
                    Text(policy.rule)
                        .foregroundStyle(.secondary)
                }
                .padding(16)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var platformCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Platform sequence")
                .font(.title3.bold())

            Label("iPhone first: local data vault, HealthKit bridge, import parser, AI boundary", systemImage: "1.circle.fill")
            Label("Apple Watch second: quick capture, workout companion, pain and hydration prompts", systemImage: "2.circle.fill")
            Label("Mac and web later: visualization, exports, coaching review, route analysis", systemImage: "3.circle.fill")
        }
        .font(.footnote)
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
