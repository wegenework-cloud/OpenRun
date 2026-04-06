# OpenRun Validation Plan

## Goal

OpenRun cannot ship as a trust product without proving four things:

1. The core user flows work on supported devices.
2. The local-first storage model is reliable.
3. The HealthKit and import boundaries fail safely.
4. The privacy contract is visible and testable.

## Release phases

### Phase 0: Founder validation

- install and run on simulator plus at least one physical iPhone
- verify local storage, plan adaptation, and privacy surfaces
- manually test HealthKit authorization on real hardware

### Phase 1: Private alpha

- 10 to 20 runners across different iPhone sizes and OS versions
- collect onboarding friction, plan comprehension, and import pain points
- verify that users understand what stays local and what leaves the device

### Phase 2: TestFlight beta

- broader device matrix
- crash monitoring
- structured bug triage
- stability gates before App Store review

## Device coverage matrix

| Class | Devices | Why it matters | Minimum validation |
|---|---|---|---|
| Small phone | iPhone SE 3rd gen | Tight layout and keyboard pressure | Full manual pass |
| Current standard phone | iPhone 15 / 16 | Typical user profile | Full manual pass |
| Pro Max phone | iPhone 15 Pro Max / 16 Pro Max | Large-screen layout and dynamic type edge cases | Full manual pass |
| iPad support path | iPad 10th gen / Air | Confirms whether the universal target behaves acceptably before marketing it | Smoke pass only unless iPad becomes first-class |

## OS coverage matrix

| OS | Status |
|---|---|
| iOS 17 latest patch | Required |
| iOS 18 latest patch | Required |
| Current TestFlight public beta OS | Recommended before each release candidate |

## Core feature validation matrix

| Area | Scenario | Expected result | Failure signal |
|---|---|---|---|
| Launch | Cold app start | App opens to the dashboard without crash | Launch crash, blank screen, frozen tab bar |
| Local storage | Edit hydration, recovery, injury note, relaunch app | State persists locally on the same device | Values reset or partially revert |
| Plan engine | Switch weeks and inspect adaptation copy | Selected week changes and nudge reflects current state | Wrong week, stale nudge, inconsistent copy |
| Nudge logic | Lower recovery, increase hydration deficit, change injury note | Nudge changes deterministically based on local inputs | No change, wrong branch, contradictory advice |
| Privacy screen | Review promises and network policy | User can understand current local-first posture | Missing proof, vague outbound policy |
| HealthKit availability | Run on supported iPhone | App shows HealthKit action when available | Button missing on supported device |
| HealthKit permission | Accept or deny authorization | App updates status cleanly and never crashes | Freeze, misleading state, repeated permission loops |
| Imports | Add PDF / export flow in future build | Local parse succeeds or fails with readable error | Silent failure, partial ingest, unsafe crash |

## Failure-mode matrix

| Vector | Failure mechanism | User impact | Required mitigation |
|---|---|---|---|
| Persistence | UserDefaults write failure or schema drift | Lost state or corrupted preferences | Add migration versioning and integrity checks |
| HealthKit | Authorization denied | Missing data | Degrade gracefully and keep manual import path |
| HealthKit | Data type unavailable on device | Partial metrics | Make unsupported metrics explicit, not silent |
| Imports | Malformed PDF or export file | Broken onboarding or parser crash | Validate file type early and return clear parse errors |
| AI boundary | Too much data prepared for outbound inference | Privacy trust failure | Add outbound payload preview and size guardrail |
| AI boundary | Network unavailable | No insight generation | Keep app fully usable offline and queue optional retry |
| UX | Small-screen clipping | Unusable controls | Validate on SE-class screens and large Dynamic Type |
| UX | Accessibility settings change layout | Broken hierarchy | Test VoiceOver, Bold Text, Larger Text, Reduce Motion |
| Backgrounding | App killed after local edits | Lost context | Persist on change and on scene phase transitions |
| Upgrade | App update changes local schema | Data loss across versions | Version the local store and add migration tests |

## Test types

### Manual smoke suite

- fresh install
- first launch
- edit local workspace values
- kill and relaunch
- switch marathon plan weeks
- toggle nudges
- request HealthKit authorization
- deny HealthKit authorization
- allow HealthKit authorization

### UI automation

- launch and tab navigation
- persistence checks after relaunch
- plan week selection
- nudge state transitions from controlled inputs
- privacy screen visibility

### Unit tests

- local state encoding and decoding
- plan selection logic
- nudge branching logic
- failure-safe defaults when stored data is malformed

### Integration tests

- HealthKit authorization path behind injectable abstractions
- future import parser tests with real sample files
- future AI payload builder tests to confirm redaction and minimization

## Accessibility validation

- Dynamic Type: default, large, accessibility large
- VoiceOver navigation through tabs and controls
- contrast checks in light and dark environments if themes expand
- touch target size for sliders, toggles, and segmented controls

## Privacy validation

- verify no analytics SDKs are linked
- verify no network requests occur before explicit user action
- inspect outbound domains with a proxy or local logging during AI integration
- verify app remains functional offline except optional online inference

## Performance validation

- cold start under typical device conditions
- low-memory relaunch behavior
- large local data sets after multiple months of workouts
- import performance for larger health export bundles and PDFs

## Release gates

The app should not enter TestFlight unless:

- core manual smoke suite passes on at least three phone classes
- no launch or persistence regression is open
- HealthKit permission flow is stable on at least one physical device
- local-first claims still match actual network behavior

The app should not be submitted to the App Store unless:

- physical-device validation covers current small, standard, and large iPhones
- privacy copy matches implementation
- import errors are recoverable and understandable
- crash-free sessions and critical-flow completion rates are acceptable in beta

## Immediate next validation tasks

1. Run the simulator walkthrough on iPhone SE, iPhone 16, and iPhone 16 Pro Max.
2. Add Swift tests for `OpenRunStore` and the nudge logic.
3. Add a physical iPhone validation pass for HealthKit authorization.
4. Replace `UserDefaults` with a versioned local store before real data import begins.
