# OpenRun Architecture

## Positioning

OpenRun is an open-source alternative to fragmented fitness trackers. Instead of focusing only on workouts, it combines activity data, nutrition, hydration, recovery context, injuries, and personal goals in one place so AI can reason about why a user is progressing or stalling.

The name can stay OpenRun for the first release and broaden to Open Exercise later if the product expands beyond endurance athletes.

## MVP product pillars

### 1. Ingestion

Support multiple ways to create a canonical activity record:

- PDF uploads from race results, fitness reports, or exported summaries
- Apple Watch or Apple Health derived exports
- Strava exports or API sync
- Other device files from Garmin, Coros, Fitbit, or manual CSV
- Manual activity entry when a device is unavailable

The ingestion system should normalize all sources into a single internal activity schema.

### 2. Daily operating system

Users should be able to log:

- workouts and rest days
- water intake
- meals and macro estimates
- body metrics such as weight, age, height, sex, and training age
- soreness, motivation, mood, sleep quality, and pain level
- injuries, setbacks, and positive moments

This gives the model the context needed to connect performance trends to behavior.

### 3. Goal engine

Goals should support:

- race preparation
- weekly mileage or consistency
- fat loss or body composition changes
- hydration and nutrition compliance
- return-to-running after injury

Goals need progress tracking, blockers, and dynamic suggestions.

### 4. AI insights

The AI layer should:

- summarize recent performance trends
- explain likely causes behind performance changes
- identify recovery risks and injury signals
- suggest next actions grounded in user data
- expose evidence behind each suggestion to keep the system trustworthy

## Proposed domain model

### AthleteProfile

- identity and preferences
- demographic and baseline training context
- device connections
- coach settings and risk tolerance

### Activity

- source metadata
- workout type
- duration, distance, pace, heart rate, elevation, effort
- raw file references
- normalized metrics

### DailyCheckIn

- energy, mood, soreness, sleep quality
- pain areas and injury status
- notes about wins, frustrations, and unusual context

### NutritionLog

- meals, snack entries, macros, estimated calories
- hydration totals
- caffeine and alcohol, if the user chooses to track them

### Goal

- metric or outcome target
- timeframe
- progress snapshots
- blockers
- suggested adjustments

### Insight

- title and category
- severity or confidence
- evidence references
- recommendation text
- generated timestamp

## Technical direction

### Frontend

- React + TypeScript web app
- dashboard-oriented UX
- import queue, daily check-in flow, goal board, and AI insight center
- local-first persistence for the editable workspace
- installable web shell plus native bridges where browser permissions are insufficient

### Backend

Planned services:

- file ingestion and document parsing pipeline
- insight generation service

Important constraint: this should not become a default cloud-sync architecture. The long-term storage layer should live on the user's device unless the user explicitly opts into backup or sharing.

### Local-first storage model

- small and fast state can live in browser storage initially
- structured logs and larger datasets should move to IndexedDB or OPFS
- raw files should remain local and be deleted or exported by the user on demand
- future native wrappers can store the same canonical data model in a local database on desktop or mobile

### Integration adapters

- PDF parser for workout plans, race reports, and exported summaries
- file adapters for GPX, TCX, FIT, CSV, and Health export bundles
- native Apple Health adapter for direct watch or phone health imports
- Strava adapter for user-approved sync or export import
- map adapter built around an open renderer with a configurable tile source

### AI pipeline

The first version should avoid a single opaque prompt. A better approach:

1. Normalize records and compute deterministic features first.
2. Build recent summaries for training load, recovery, nutrition, hydration, and consistency.
3. Feed only the relevant evidence into the model.
4. Ask the model for explanations, risks, and concrete actions with citations back to source metrics.

This makes the AI output easier to debug and safer to trust.

## Privacy and trust

- users should be able to delete raw uploads
- health and demographic data should be optional and permissioned
- AI output should distinguish facts, inferences, and uncertainty
- insight cards should show which inputs were used
- outbound endpoints should be allowlisted and inspectable
- the product should offer a clear proof story for what stays local and what leaves the device

## Next implementation steps

1. Replace browser-only storage with a local structured data layer that can hold raw files safely.
2. Implement file upload UX with per-source import adapters.
3. Build the first marathon-plan ingestion flow from PDF to adaptive weekly schedule.
4. Add an iOS companion for HealthKit while keeping the core store local.
5. Replace mock insights with model-backed insight generation.
