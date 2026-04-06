# OpenRun Local-First Privacy Model

## Goal

OpenRun should let users own their fitness and health data instead of moving that responsibility to a cloud service by default. The product can still use an online AI model, but the core workout history, food logs, hydration logs, injury notes, goals, and uploaded source files should stay on the user's device unless the user explicitly chooses otherwise.

## Practical architecture

### 1. Local storage first

- browser storage is acceptable for lightweight prototype state
- larger datasets and raw files should move into IndexedDB or OPFS
- native wrappers can reuse the same canonical schema with a local database

### 2. Narrow AI boundary

- raw health exports should not be sent to the model by default
- the app should build a deterministic summary locally first
- the user should be able to inspect what summary is about to be sent
- the model response should be stored locally alongside the evidence that produced it

### 3. Explicit proof surfaces

Privacy claims need to be testable. OpenRun should provide:

- a visible outbound network policy
- an allowlist of permitted remote endpoints
- a local log of outbound AI requests
- export and deletion controls for raw local data
- open-source code that lets users inspect the storage and network behavior

## Integration strategy

### File imports

The first release should aggressively support file imports because they are the easiest way to respect user ownership:

- PDF training plans
- GPX, FIT, TCX, and CSV workout files
- Apple Health export bundles
- Strava export files

### Apple Watch and iPhone

Direct HealthKit access should be handled by a native iOS companion. The browser app can still support manual import of exported data, but direct on-device sync from Apple Health requires a native permissioned layer.

### Strava

Strava should be optional. Users should be able to:

- sign in for selected activity sync
- import their own exported files instead
- disconnect and keep all previously imported normalized data locally

### Maps

Use an open renderer and make the tile provider a choice instead of a hidden dependency. That keeps the route viewer flexible and makes the privacy tradeoff visible.

If the web client uses MapLibre GL JS, the CSP policy will need to account for MapLibre's documented worker requirements, or use the CSP-specific MapLibre bundle and worker path.

## Security baseline

The starter app already includes:

- no application backend
- no runtime API calls
- a restrictive Content Security Policy that only permits same-origin network connections
- local browser persistence for editable workspace state

When AI inference is added, the Content Security Policy should expand only to the chosen model endpoint and only after the outbound contract is explicit in the product.
