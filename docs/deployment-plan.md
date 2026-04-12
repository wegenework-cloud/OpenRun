# OpenRun Deployment Plan

## Status on April 11, 2026

OpenRun now has a genuinely usable local-first web workspace for:

- local activity logging
- local meal logging
- local daily check-ins
- local JSON backup and restore
- local CSV activity import
- deterministic coaching summaries derived from local state

That makes the web app deployable as an internal preview on this machine today.

The iPhone app is still a native scaffold with local state and HealthKit permission wiring, but it is not ready for public distribution as a primary product build yet.

## Current blockers

### Repository and machine blockers

- the web app still has no auth, sync, or multi-device story, so deployment should stay private/internal
- the iPhone app still depends on starter local state and HealthKit permission wiring rather than real HealthKit ingestion
- simulator validation should target the currently installed Xcode SDK instead of a stale hard-coded simulator version

These are deployment-shape blockers rather than architectural dead ends, but they still need to be cleared before anything beyond an internal preview makes sense.

## Recommended deployment sequence

### Phase 1: Ship the web preview first

Use the web app as the immediate internal product because:

- it now supports real local logging and backup
- it has no backend dependency
- it fits static hosting cleanly
- it is the fastest way to let you use the product while native ingestion catches up

### Phase 2: Move the iPhone app into internal TestFlight

Use TestFlight only after:

- local structured storage is stable
- HealthKit import does more than permission request
- physical-device validation passes
- signing, entitlements, and App Store Connect setup are complete

### Phase 3: Keep the web app as preview and support surface

Even if iPhone becomes the primary product, keep the deployed web app for:

- internal demos
- architecture and privacy proof
- local import experiments
- backup and export tooling

## Web deployment plan

### Target shape

Deploy the Vite app as a static site. The current app has no application backend and no runtime API dependency, so it should be hosted as a static bundle.

### Preconditions

1. Run `npm install`.
2. Run `npm run build`.
3. Verify the generated `dist/` bundle locally.
4. Keep the deployment scoped to private/internal usage until a stronger persistence story exists.

### Hosting model

Use any static host that can serve the Vite output directory directly. The deployment artifact is the `dist/` directory produced by `npm run build`.

### Configuration checklist

- keep the current restrictive Content Security Policy unless a future AI endpoint is added intentionally
- add HTTPS only
- disable any host-provided analytics injection unless explicitly wanted
- configure the app as a private preview until the product messaging matches the actual feature set
- treat the web deployment as local-first and single-device unless backup/restore UX is clear

### Suggested CI for web preview

1. On push to `main`, install dependencies.
2. Run `npm run build`.
3. Publish `dist/` to the preview environment.
4. Block production deployment on a successful build and a manual approval step.

### Release label

Call the first web deployment an internal preview, not beta and not production.

## iPhone deployment plan

### Preconditions

1. Fix bundle identifier, signing team, and provisioning.
2. Create the app in App Store Connect.
3. Add required privacy descriptions and HealthKit capability review material.
4. Validate on at least one physical iPhone before upload.
5. Standardize the local Xcode build command around the currently installed simulator SDK, for example `iphonesimulator26.4` on this machine.

### Internal TestFlight path

1. Build an archive from Xcode.
2. Upload the archive to App Store Connect.
3. Create an internal TestFlight group first.
4. Keep the first cycle internal only until HealthKit and persistence behavior are validated on device.

### External TestFlight should wait for

- versioned local storage instead of starter persistence only
- import error handling for real files
- device validation across small, standard, and large iPhones
- clear privacy copy that matches actual network behavior

### App Store submission should wait for

- real HealthKit ingestion into the local OpenRun schema
- recovery and import flows backed by real records instead of starter/demo content
- crash and regression monitoring
- explicit deletion and export controls in the native app

## Deployment architecture decisions

### Web

- static-only hosting
- no backend by default
- local storage remains device-local
- optional future AI endpoint should be added behind a single explicit allowlist

### iPhone

- local database on device
- HealthKit bridge and import adapters inside the app
- no default cloud sync
- optional future backup should be opt-in and separate from the core product

## Immediate next engineering tasks before deployment

1. Add a versioned local app store for the web app.
2. Add tests for local state loading, CSV import, backup restore, and rule-based insight generation.
3. Add tests for the new workout signal snapshot and performance-metric layer.
4. Standardize the Xcode validation command so simulator builds are repeatable across machine upgrades.
5. Decide whether the first user-facing deployment is web-preview-first or iPhone-internal-first.

## Recommendation

The fastest path to something you can personally use this week is:

1. deploy the web app as a private internal preview
2. keep using it for local logging and backup
3. continue iPhone development in parallel until HealthKit ingestion and native local storage are real
4. move the iPhone build into internal TestFlight only after device validation passes

## Official references

- Vite deployment guide: https://vite.dev/guide/static-deploy.html
- Apple TestFlight overview: https://developer.apple.com/testflight
