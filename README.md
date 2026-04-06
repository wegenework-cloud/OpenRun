# OpenRun

OpenRun is an open-source training and health operating system for people who want more than raw workout stats. The product combines workout imports, nutrition and hydration tracking, recovery journaling, injury notes, and goal-based coaching so users can understand what is actually helping or blocking progress.

The design target is local-first:

- the user's workout and health data stays on the user's device by default
- raw files are parsed locally whenever possible
- AI calls should use a narrow, inspectable outbound payload instead of syncing the full dataset to a cloud backend

## Native-first roadmap

The current implementation direction is:

1. iPhone app first
2. Apple Watch companion second
3. Mac app and web app later for visualization, export, and deeper review

The repository now includes a SwiftUI iOS starter app in `apps/ios/OpenRunApp` plus an XcodeGen project spec in `project.yml`.

The current repository includes:

- a React + TypeScript starter app that demonstrates the core product surfaces
- a domain model for activities, goals, recovery, nutrition, and AI insights
- an architecture document for the first build phases

## Product direction

OpenRun is designed around four connected workflows:

1. Import activity data from PDFs, Apple Watch exports, Strava exports, and other devices.
2. Log daily context such as food, water, soreness, energy, mood, injury notes, and wins.
3. Set goals like mileage, pace, body composition, consistency, or recovery targets.
4. Generate AI insights that connect the imported metrics and the daily context to explain trends and suggest adjustments.

## Local development

This project is scaffolded with Vite.

```bash
npm install
npm run dev
```

## iOS development

Generate the Xcode project and build the iPhone app:

```bash
xcodegen generate
xcodebuild -project OpenRun.xcodeproj -scheme OpenRunIOS -destination "generic/platform=iOS Simulator" CODE_SIGNING_ALLOWED=NO build
```

## Near-term roadmap

- build the ingestion pipeline for PDF parsing and file-based imports
- add a native Apple Health and Apple Watch bridge for direct HealthKit access
- replace cloud persistence with local-first structured storage for raw files and logs
- connect an LLM-backed insights engine with clear evidence and guardrails
- add guided goal programs for running, walking, strength, weight management, and recovery

See [docs/architecture.md](docs/architecture.md) for the first-pass product and technical design.
See [docs/local-first-privacy.md](docs/local-first-privacy.md) for the privacy and integration strategy.
