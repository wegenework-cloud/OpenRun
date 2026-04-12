import type {
  Activity,
  DailyCheckIn,
  LocalAppState,
  LocalWorkspaceState,
  Meal,
  SurfaceType,
  WorkoutSignalSnapshot,
} from "../types";

const LOCAL_APP_KEY = "openrun.app.v1";
const LEGACY_WORKSPACE_KEY = "openrun.workspace.v1";

function normalizeWorkspace(
  value: unknown,
  defaultValue: LocalWorkspaceState,
): LocalWorkspaceState {
  if (!value || typeof value !== "object") {
    return defaultValue;
  }

  return {
    ...defaultValue,
    ...(value as Partial<LocalWorkspaceState>),
  };
}

function normalizeActivities(
  value: unknown,
  fallback: Activity[],
): Activity[] {
  return Array.isArray(value) ? (value as Activity[]) : fallback;
}

function normalizeCheckIns(
  value: unknown,
  fallback: DailyCheckIn[],
): DailyCheckIn[] {
  return Array.isArray(value) ? (value as DailyCheckIn[]) : fallback;
}

function normalizeMeals(
  value: unknown,
  fallback: Meal[],
): Meal[] {
  return Array.isArray(value) ? (value as Meal[]) : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function surfaceTypeOr(value: unknown, fallback: SurfaceType): SurfaceType {
  const allowedValues: SurfaceType[] = [
    "road",
    "track",
    "trail",
    "gravel",
    "treadmill",
    "snow",
    "mixed",
  ];

  return allowedValues.includes(value as SurfaceType)
    ? (value as SurfaceType)
    : fallback;
}

function normalizeWorkoutSignalSnapshots(
  value: unknown,
  fallback: WorkoutSignalSnapshot[],
): WorkoutSignalSnapshot[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((entry, index) => {
    const snapshot = entry as Partial<WorkoutSignalSnapshot>;
    const seededFallback = fallback[index] ?? fallback[0];

    return {
      id:
        typeof snapshot.id === "string" && snapshot.id.trim()
          ? snapshot.id
          : `signal-${index}`,
      label:
        typeof snapshot.label === "string" && snapshot.label.trim()
          ? snapshot.label
          : "Workout signal snapshot",
      date:
        typeof snapshot.date === "string" && snapshot.date.trim()
          ? snapshot.date
          : seededFallback?.date ?? "",
      athleteWeightKg: numberOr(
        snapshot.athleteWeightKg,
        seededFallback?.athleteWeightKg ?? 75,
      ),
      averagePowerWatts: numberOr(
        snapshot.averagePowerWatts,
        seededFallback?.averagePowerWatts ?? 0,
      ),
      averageHeartRateBpm: numberOr(
        snapshot.averageHeartRateBpm,
        seededFallback?.averageHeartRateBpm ?? 0,
      ),
      speedMetersPerSecond: numberOr(
        snapshot.speedMetersPerSecond,
        seededFallback?.speedMetersPerSecond ?? 0,
      ),
      averageCadenceSpm: numberOr(
        snapshot.averageCadenceSpm,
        seededFallback?.averageCadenceSpm ?? 0,
      ),
      firstHalfHeartRateBpm: numberOr(
        snapshot.firstHalfHeartRateBpm,
        seededFallback?.firstHalfHeartRateBpm ?? 0,
      ),
      secondHalfHeartRateBpm: numberOr(
        snapshot.secondHalfHeartRateBpm,
        seededFallback?.secondHalfHeartRateBpm ?? 0,
      ),
      vo2Max: numberOr(snapshot.vo2Max, seededFallback?.vo2Max ?? 0),
      heartRateDrop1Min: numberOr(
        snapshot.heartRateDrop1Min,
        seededFallback?.heartRateDrop1Min ?? 0,
      ),
      heartRateDrop2Min: numberOr(
        snapshot.heartRateDrop2Min,
        seededFallback?.heartRateDrop2Min ?? 0,
      ),
      elevationGainMeters: numberOr(
        snapshot.elevationGainMeters,
        seededFallback?.elevationGainMeters ?? 0,
      ),
      verticalOscillationCm: numberOr(
        snapshot.verticalOscillationCm,
        seededFallback?.verticalOscillationCm ?? 0,
      ),
      groundContactTimeMs: numberOr(
        snapshot.groundContactTimeMs,
        seededFallback?.groundContactTimeMs ?? 0,
      ),
      strideLengthMeters: numberOr(
        snapshot.strideLengthMeters,
        seededFallback?.strideLengthMeters ?? 0,
      ),
      airTemperatureC: numberOr(
        snapshot.airTemperatureC,
        seededFallback?.airTemperatureC ?? 16,
      ),
      dewPointC: numberOr(snapshot.dewPointC, seededFallback?.dewPointC ?? 8),
      relativeHumidityPct: numberOr(
        snapshot.relativeHumidityPct,
        seededFallback?.relativeHumidityPct ?? 55,
      ),
      windSpeedKph: numberOr(
        snapshot.windSpeedKph,
        seededFallback?.windSpeedKph ?? 8,
      ),
      windExposurePct: numberOr(
        snapshot.windExposurePct,
        seededFallback?.windExposurePct ?? 25,
      ),
      solarLoadPct: numberOr(
        snapshot.solarLoadPct,
        seededFallback?.solarLoadPct ?? 40,
      ),
      altitudeMeters: numberOr(
        snapshot.altitudeMeters,
        seededFallback?.altitudeMeters ?? 0,
      ),
      surfaceWetnessPct: numberOr(
        snapshot.surfaceWetnessPct,
        seededFallback?.surfaceWetnessPct ?? 0,
      ),
      surfaceType: surfaceTypeOr(
        snapshot.surfaceType,
        seededFallback?.surfaceType ?? "road",
      ),
      averageGradePct: numberOr(
        snapshot.averageGradePct,
        seededFallback?.averageGradePct ?? 0,
      ),
      descentMeters: numberOr(
        snapshot.descentMeters,
        seededFallback?.descentMeters ?? 0,
      ),
    };
  });
}

export function normalizeLocalAppState(
  value: unknown,
  defaultValue: LocalAppState,
): LocalAppState {
  if (!value || typeof value !== "object") {
    return defaultValue;
  }

  const parsed = value as Partial<LocalAppState>;

  return {
    workspace: normalizeWorkspace(parsed.workspace, defaultValue.workspace),
    activities: normalizeActivities(parsed.activities, defaultValue.activities),
    checkIns: normalizeCheckIns(parsed.checkIns, defaultValue.checkIns),
    meals: normalizeMeals(parsed.meals, defaultValue.meals),
    workoutSignalSnapshots: normalizeWorkoutSignalSnapshots(
      parsed.workoutSignalSnapshots,
      defaultValue.workoutSignalSnapshots,
    ),
  };
}

export function loadLocalAppState(defaultValue: LocalAppState): LocalAppState {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const storedValue = window.localStorage.getItem(LOCAL_APP_KEY);

    if (storedValue) {
      return normalizeLocalAppState(JSON.parse(storedValue), defaultValue);
    }

    const legacyWorkspace = window.localStorage.getItem(LEGACY_WORKSPACE_KEY);

    if (!legacyWorkspace) {
      return defaultValue;
    }

    return {
      ...defaultValue,
      workspace: normalizeWorkspace(
        JSON.parse(legacyWorkspace),
        defaultValue.workspace,
      ),
    };
  } catch {
    return defaultValue;
  }
}

export function saveLocalAppState(value: LocalAppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_APP_KEY, JSON.stringify(value));
}

export function clearLocalAppState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_APP_KEY);
  window.localStorage.removeItem(LEGACY_WORKSPACE_KEY);
}
