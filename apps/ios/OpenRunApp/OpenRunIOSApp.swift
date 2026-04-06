import SwiftUI

@main
struct OpenRunIOSApp: App {
    @StateObject private var store = OpenRunStore()

    var body: some Scene {
        WindowGroup {
            OpenRunRootView(store: store)
        }
    }
}
