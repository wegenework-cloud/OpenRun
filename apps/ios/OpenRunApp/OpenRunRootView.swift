import SwiftUI

struct OpenRunRootView: View {
    @ObservedObject var store: OpenRunStore
    @StateObject private var healthBridge = AppleHealthBridge()

    var body: some View {
        TabView {
            DashboardView(store: store, healthBridge: healthBridge)
                .tabItem {
                    Label("Home", systemImage: "figure.run")
                }

            PlanView(store: store)
                .tabItem {
                    Label("Plan", systemImage: "calendar.badge.clock")
                }

            PrivacyView(healthBridge: healthBridge)
                .tabItem {
                    Label("Privacy", systemImage: "lock.shield")
                }
        }
        .tint(Color.orange)
    }
}
