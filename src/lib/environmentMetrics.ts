import type { PerformanceMetricCard, SurfaceType, WorkoutSignalSnapshot } from "../types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function getSurfacePenalty(surfaceType: SurfaceType): number {
  switch (surfaceType) {
    case "track":
      return 4;
    case "treadmill":
      return 5;
    case "road":
      return 8;
    case "mixed":
      return 12;
    case "trail":
      return 18;
    case "gravel":
      return 20;
    case "snow":
      return 32;
    default:
      return 10;
  }
}

export function describeClimateProfile(snapshot: WorkoutSignalSnapshot) {
  if (snapshot.altitudeMeters >= 1500 && snapshot.airTemperatureC <= 14) {
    return {
      label: "High-altitude cool",
      narrative:
        "Thin air is likely inflating heart rate and shrinking aerobic headroom even if the temperature feels manageable.",
    };
  }

  if (snapshot.airTemperatureC >= 26 && snapshot.dewPointC <= 11) {
    return {
      label: "Hot and dry",
      narrative:
        "Evaporation is helping, but dehydration can stay hidden until durability breaks late in the run.",
    };
  }

  if (snapshot.airTemperatureC >= 24 && snapshot.dewPointC >= 16) {
    return {
      label: "Hot and humid",
      narrative:
        "Humidity is limiting evaporative cooling, so heart rate and perceived effort can rise earlier than pace suggests.",
    };
  }

  if (snapshot.airTemperatureC <= 6 && snapshot.surfaceWetnessPct >= 35) {
    return {
      label: "Cold and wet",
      narrative:
        "Cold exposure plus wetness can degrade mechanics and stiffness before the aerobic system fully shows the cost.",
    };
  }

  if (snapshot.airTemperatureC <= 8 && snapshot.dewPointC <= 0) {
    return {
      label: "Cold and dry",
      narrative:
        "The run likely starts with stiffness and respiratory dryness before the heart-rate trace tells the full story.",
    };
  }

  if (snapshot.windSpeedKph >= 20 && snapshot.airTemperatureC <= 18) {
    return {
      label: "Cool and windy",
      narrative:
        "Cardio may look decent, but wind resistance and stabilization cost can still drag pace and mechanics down.",
    };
  }

  return {
    label: "Moderate neutral",
    narrative:
      "Conditions are not perfectly neutral, but they are unlikely to dominate the session more than pacing and fueling choices.",
  };
}

function buildThermalHeadroom(snapshot: WorkoutSignalSnapshot): number {
  const heatPenalty =
    Math.max(0, snapshot.airTemperatureC - 12) * 1.7 +
    Math.max(0, snapshot.dewPointC - 10) * 1.5 +
    Math.max(0, snapshot.relativeHumidityPct - 55) * 0.18 +
    snapshot.solarLoadPct * 0.11 -
    Math.min(snapshot.windSpeedKph, 24) * 0.45;
  const coldPenalty =
    Math.max(0, 8 - snapshot.airTemperatureC) * 1.9 +
    snapshot.surfaceWetnessPct * 0.16 +
    snapshot.windSpeedKph * 0.22;
  const penalty = snapshot.airTemperatureC >= 12 ? heatPenalty : coldPenalty;

  return round(clamp(100 - penalty));
}

function buildAirflowSupport(snapshot: WorkoutSignalSnapshot): number {
  const effectiveHeadwind = snapshot.windSpeedKph * (snapshot.windExposurePct / 100);
  const stabilizationPenalty =
    effectiveHeadwind * 1.15 + Math.max(0, snapshot.windSpeedKph - effectiveHeadwind) * 0.35;
  const hotWeatherCoolingCredit =
    snapshot.airTemperatureC >= 24 ? Math.min(snapshot.windSpeedKph, 18) * 0.3 : 0;

  return round(clamp(100 - stabilizationPenalty + hotWeatherCoolingCredit));
}

function buildOxygenSupport(snapshot: WorkoutSignalSnapshot): number {
  const altitudePenalty = snapshot.altitudeMeters * 0.018;
  return round(clamp(100 - altitudePenalty));
}

function buildTerrainFriendliness(snapshot: WorkoutSignalSnapshot): number {
  const penalty =
    Math.abs(snapshot.averageGradePct) * 9 +
    snapshot.descentMeters * 0.04 +
    snapshot.surfaceWetnessPct * 0.1 +
    getSurfacePenalty(snapshot.surfaceType);

  return round(clamp(100 - penalty));
}

export function buildEnvironmentalSupport(snapshot: WorkoutSignalSnapshot): number {
  const thermalHeadroom = buildThermalHeadroom(snapshot);
  const airflowSupport = buildAirflowSupport(snapshot);
  const oxygenSupport = buildOxygenSupport(snapshot);
  const terrainFriendliness = buildTerrainFriendliness(snapshot);

  return round(
    thermalHeadroom * 0.35 +
      airflowSupport * 0.2 +
      oxygenSupport * 0.2 +
      terrainFriendliness * 0.25,
  );
}

function buildAdjustedEfficiency(snapshot: WorkoutSignalSnapshot): number {
  const rawEfficiency = safeDivide(
    snapshot.speedMetersPerSecond * 100,
    snapshot.averageHeartRateBpm,
  );
  const environmentalSupport = buildEnvironmentalSupport(snapshot);
  const adjustmentMultiplier = 1 + safeDivide(100 - environmentalSupport, 140);

  return round(rawEfficiency * adjustmentMultiplier);
}

export function buildEnvironmentalMetricCards(
  snapshot: WorkoutSignalSnapshot,
): PerformanceMetricCard[] {
  const thermalHeadroom = buildThermalHeadroom(snapshot);
  const airflowSupport = buildAirflowSupport(snapshot);
  const oxygenSupport = buildOxygenSupport(snapshot);
  const terrainFriendliness = buildTerrainFriendliness(snapshot);
  const environmentalSupport = buildEnvironmentalSupport(snapshot);
  const adjustedEfficiency = buildAdjustedEfficiency(snapshot);

  return [
    {
      id: "adjusted-efficiency",
      title: "Adjusted efficiency score",
      shortLabel: "speed / HR / env",
      unit: "score",
      value: adjustedEfficiency,
      formula: "speed / HR, normalized by environmental support",
      interpretation:
        adjustedEfficiency >= 3.25
          ? "The session stayed efficient even after climate and route penalties were accounted for."
          : adjustedEfficiency >= 2.75
            ? "The run held up reasonably well once conditions were normalized."
            : adjustedEfficiency >= 2.3
              ? "The effort was usable, but external load or internal cost still limited efficiency."
              : "Conditions and internal load combined into a session that was expensive relative to the output.",
      whyItMatters:
        "This is the first pass at comparing a humid, windy, or high-altitude run against a friendlier day without pretending the environment was neutral.",
      discipline: "running",
      sourceSignals: [
        "speed",
        "average heart rate",
        "temperature",
        "dew point",
        "wind",
        "altitude",
        "terrain",
      ],
      bands: [
        { label: "Excellent", minInclusive: 3.25, narrative: "The run graded out strongly after climate adjustment." },
        { label: "Strong", minInclusive: 2.75, narrative: "Conditions were present, but the session still held efficient output." },
        { label: "Developing", minInclusive: 2.3, narrative: "The adjusted result is serviceable, but there is still clear room to improve." },
        { label: "Costly", minInclusive: 0, narrative: "The run required too much cost for the output once conditions are considered." },
      ],
    },
    {
      id: "thermal-headroom",
      title: "Thermal headroom",
      shortLabel: "climate heat",
      unit: "score",
      value: thermalHeadroom,
      formula: "temperature, dew point, sun, and cooling wind",
      interpretation:
        thermalHeadroom >= 85
          ? "Temperature stress was low enough that heat probably was not the main limiter."
          : thermalHeadroom >= 70
            ? "Thermal strain was present but still manageable with solid pacing and fueling."
            : thermalHeadroom >= 55
              ? "Heat or cold stress was material and likely affected heart rate and durability."
              : "Thermal stress was severe enough that the environment probably dictated the session ceiling.",
      whyItMatters:
        "This separates temperature burden from the rest of the session so humid heat and cold-wet stiffness do not get flattened into one generic weather note.",
      discipline: "running",
      sourceSignals: ["air temperature", "dew point", "solar load", "wind speed", "surface wetness"],
      bands: [
        { label: "Comfortable", minInclusive: 85, narrative: "Thermal load stayed supportive." },
        { label: "Manageable", minInclusive: 70, narrative: "There was climate cost, but it was still controllable." },
        { label: "Taxing", minInclusive: 55, narrative: "Thermal load was significant enough to matter." },
        { label: "Punishing", minInclusive: 0, narrative: "Temperature burden was one of the main session drivers." },
      ],
    },
    {
      id: "airflow-support",
      title: "Airflow support",
      shortLabel: "wind support",
      unit: "score",
      value: airflowSupport,
      formula: "wind speed with exposure weighting",
      interpretation:
        airflowSupport >= 85
          ? "Wind resistance stayed low enough that pace was not heavily taxed by airflow."
          : airflowSupport >= 70
            ? "Some resistance or stabilization cost was present, but not dominant."
            : airflowSupport >= 55
              ? "Wind exposure was meaningful enough to distort pace and mechanics."
              : "Effective wind was severe enough that comparing raw pace directly would be misleading.",
      whyItMatters:
        "Headwind and crosswind cost are real external work, especially in cooler climates where the cardio trace alone can hide the penalty.",
      discipline: "running",
      sourceSignals: ["wind speed", "wind exposure"],
      bands: [
        { label: "Sheltered", minInclusive: 85, narrative: "Airflow stayed friendly." },
        { label: "Usable", minInclusive: 70, narrative: "Wind cost existed but stayed manageable." },
        { label: "Resistant", minInclusive: 55, narrative: "Wind was a real performance tax." },
        { label: "Destabilizing", minInclusive: 0, narrative: "Airflow materially interfered with the run." },
      ],
    },
    {
      id: "oxygen-support",
      title: "Oxygen support",
      shortLabel: "altitude support",
      unit: "score",
      value: oxygenSupport,
      formula: "altitude-derived aerobic headroom",
      interpretation:
        oxygenSupport >= 90
          ? "Altitude was close enough to sea-level conditions that oxygen cost was not a main issue."
          : oxygenSupport >= 75
            ? "There was a mild altitude tax, but it should be manageable with adjusted expectations."
            : oxygenSupport >= 60
              ? "Thin air likely inflated heart rate and reduced sustainable output."
              : "Altitude was a major limiter and pace should not be compared as if this were a sea-level session.",
      whyItMatters:
        "This stops the app from misreading altitude-inflated heart rate as a pure fitness failure.",
      discipline: "running",
      sourceSignals: ["altitude"],
      bands: [
        { label: "Sea-level like", minInclusive: 90, narrative: "Oxygen availability stayed strong." },
        { label: "Mild tax", minInclusive: 75, narrative: "Altitude added some cost but not a full ceiling." },
        { label: "Thin air", minInclusive: 60, narrative: "Aerobic capacity was clearly constrained." },
        { label: "Major tax", minInclusive: 0, narrative: "Altitude dominated the aerobic side of the session." },
      ],
    },
    {
      id: "terrain-friendliness",
      title: "Terrain friendliness",
      shortLabel: "route cost",
      unit: "score",
      value: terrainFriendliness,
      formula: "surface, grade, wetness, and descent burden",
      interpretation:
        terrainFriendliness >= 88
          ? "The route was friendly enough that mechanics should compare well against baseline sessions."
          : terrainFriendliness >= 72
            ? "The route added some load, but not enough to dominate the workout."
            : terrainFriendliness >= 58
              ? "Terrain and footing were meaningful contributors to session cost."
              : "Route mechanics were difficult enough that pace and cadence should be interpreted cautiously.",
      whyItMatters:
        "This is how hill load, downhill eccentric cost, wet footing, and unstable surfaces stay visible without forcing users to interpret each raw sensor separately.",
      discipline: "running",
      sourceSignals: ["surface", "surface wetness", "average grade", "descent", "elevation gain"],
      bands: [
        { label: "Friendly", minInclusive: 88, narrative: "The route was supportive." },
        { label: "Mixed", minInclusive: 72, narrative: "Some route cost was present." },
        { label: "Taxing", minInclusive: 58, narrative: "Terrain was a meaningful tax." },
        { label: "Harsh", minInclusive: 0, narrative: "Mechanical route load was high." },
      ],
    },
    {
      id: "environmental-support",
      title: "Environmental support",
      shortLabel: "overall support",
      unit: "score",
      value: environmentalSupport,
      formula: "weighted blend of thermal, airflow, oxygen, and terrain support",
      interpretation:
        environmentalSupport >= 82
          ? "The outside world was reasonably supportive, so raw performance should compare more directly."
          : environmentalSupport >= 68
            ? "The session sat in mixed conditions where some adjustment is appropriate."
            : environmentalSupport >= 55
              ? "Conditions were demanding enough that raw pace and heart-rate readings need context."
              : "External conditions were punishing enough that normalized scores matter more than raw speed.",
      whyItMatters:
        "This is the single higher-is-better summary of how cooperative the conditions were for the run.",
      discipline: "running",
      sourceSignals: [
        "temperature",
        "dew point",
        "wind speed",
        "wind exposure",
        "altitude",
        "surface",
        "grade",
      ],
      bands: [
        { label: "Supportive", minInclusive: 82, narrative: "Conditions were broadly favorable." },
        { label: "Mixed", minInclusive: 68, narrative: "There was some environmental tax." },
        { label: "Demanding", minInclusive: 55, narrative: "Conditions were materially harder than neutral." },
        { label: "Punishing", minInclusive: 0, narrative: "The outside world was one of the main opponents." },
      ],
    },
  ];
}
