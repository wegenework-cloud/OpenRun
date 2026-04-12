# Performance Metrics

OpenRun should not dump raw sensor fields onto the screen and expect the athlete to decode them. The current metric layer is designed around one rule: higher is better.

## Current running figures of merit

OpenRun now derives these running metrics from a workout signal snapshot:

- Running power-to-weight: average power divided by body weight in kilograms.
- Efficiency index: speed divided by average heart rate, scaled into a simple score.
- Aerobic stability: `100 - positive heart-rate drift %` so lower drift turns into a higher score.
- Cadence efficiency ratio: speed divided by steps per second, effectively measuring forward travel per step.
- Power versus heart-rate ratio: average power divided by average heart rate.
- VO2 max trend: the device or lab estimate, treated as a long-horizon macro metric.
- Recovery index: the average of 1-minute and 2-minute heart-rate drop.

Each metric includes interpretation bands in the app so the user sees both the number and a plain-language meaning.

## Environmental model

OpenRun should not flatten climate into one generic weather field. The current model now stores:

- air temperature
- dew point
- relative humidity
- wind speed
- wind exposure
- solar load
- altitude
- surface wetness
- surface type
- average grade
- descent

From those inputs, the app now derives:

- Thermal headroom
- Airflow support
- Oxygen support
- Terrain friendliness
- Environmental support
- Adjusted efficiency score

All of these scores keep the same direction as the rest of the dashboard: higher is better.

## Why this shape

The goal is to avoid a dashboard where some metrics improve by going up and others improve by going down. When the raw source metric moves in the opposite direction, OpenRun should invert or normalize it into a higher-is-better figure before surfacing it as a primary score.

This is why:

- aerobic decoupling is shown as aerobic stability instead of raw drift
- efficiency and resilience are shown as ratios instead of raw pace or heart-rate readings
- mechanics data stays as context until it can be converted into a directionally clear score
- climate penalties are inverted into support or headroom scores instead of shown as raw burden

## Current inputs

The current web app captures or seeds these signal fields:

- body weight
- average power
- average heart rate
- speed
- average cadence
- first-half and second-half heart rate
- VO2 max estimate
- 1-minute and 2-minute heart-rate drop
- elevation gain
- vertical oscillation
- ground contact time
- stride length
- air temperature
- dew point
- relative humidity
- wind speed and wind exposure
- solar load
- altitude
- surface type and wetness
- average grade and descent

## Planned layers

The next derived layers to validate are:

- Mechanics economy layer from stride length, ground contact time, and vertical oscillation
- Jump rope stability from cadence consistency, heart-rate stability, and post-rope recovery
- Cycling economy using the same higher-is-better philosophy with bike-specific signals
- better drift-source attribution such as heat-driven, altitude-driven, terrain-driven, and fatigue-driven decoupling

## Guardrails

- These interpretation bands are directional product heuristics, not medical or coaching claims.
- The values should be treated as longitudinal comparisons against the same athlete first.
- Import pipelines should map raw device data into the workout signal snapshot schema before any model inference happens.
