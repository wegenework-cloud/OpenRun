import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  activities as seededActivities,
  athlete,
  checkIns as seededCheckIns,
  defaultWorkspaceState,
  importOptions,
  integrations,
  meals as seededMeals,
  networkRules,
  pillars,
  privacyControls,
  trainingPlanWeeks,
  workoutSignalSnapshots as seededWorkoutSignalSnapshots,
} from "./data/mockData";
import { parseActivitiesCsv } from "./lib/importers";
import {
  clearLocalAppState,
  loadLocalAppState,
  normalizeLocalAppState,
  saveLocalAppState,
} from "./lib/localAppState";
import {
  buildEnvironmentalMetricCards,
  buildEnvironmentalSupport,
  describeClimateProfile,
} from "./lib/environmentMetrics";
import {
  buildFutureMetricIdeas,
  buildPerformanceMetricCards,
} from "./lib/performanceMetrics";
import type {
  Activity,
  DailyCheckIn,
  DeliveryStatus,
  Goal,
  GoalStatus,
  ImportSource,
  Insight,
  InsightLevel,
  LocalAppState,
  LocalWorkspaceState,
  Meal,
  PerformanceMetricCard,
  SurfaceType,
  WorkoutSignalSnapshot,
} from "./types";

const sourceLabel: Record<ImportSource, string> = {
  pdf: "PDF",
  "apple-watch": "Apple Watch",
  strava: "Strava",
  garmin: "Device",
  manual: "Manual",
};

const goalClass: Record<GoalStatus, string> = {
  "on-track": "status status-good",
  watch: "status status-watch",
  "off-track": "status status-risk",
};

const insightClass: Record<InsightLevel, string> = {
  lift: "insight insight-lift",
  watch: "insight insight-watch",
  risk: "insight insight-risk",
};

const deliveryClass: Record<DeliveryStatus, string> = {
  ready: "badge badge-ready",
  planned: "badge badge-planned",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function getTodayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function createDefaultLocalAppState(): LocalAppState {
  return {
    workspace: { ...defaultWorkspaceState },
    activities: seededActivities.map((activity) => ({ ...activity })),
    checkIns: seededCheckIns.map((entry) => ({ ...entry })),
    meals: seededMeals.map((meal) => ({ ...meal })),
    workoutSignalSnapshots: seededWorkoutSignalSnapshots.map((snapshot) => ({
      ...snapshot,
    })),
  };
}

function createSignalSnapshotDraft() {
  const seed = seededWorkoutSignalSnapshots[0];

  return {
    label: "",
    date: getTodayIso(),
    athleteWeightKg: String(seed?.athleteWeightKg ?? ""),
    averagePowerWatts: String(seed?.averagePowerWatts ?? ""),
    averageHeartRateBpm: String(seed?.averageHeartRateBpm ?? ""),
    speedMetersPerSecond: String(seed?.speedMetersPerSecond ?? ""),
    averageCadenceSpm: String(seed?.averageCadenceSpm ?? ""),
    firstHalfHeartRateBpm: String(seed?.firstHalfHeartRateBpm ?? ""),
    secondHalfHeartRateBpm: String(seed?.secondHalfHeartRateBpm ?? ""),
    vo2Max: String(seed?.vo2Max ?? ""),
    heartRateDrop1Min: String(seed?.heartRateDrop1Min ?? ""),
    heartRateDrop2Min: String(seed?.heartRateDrop2Min ?? ""),
    elevationGainMeters: String(seed?.elevationGainMeters ?? ""),
    verticalOscillationCm: String(seed?.verticalOscillationCm ?? ""),
    groundContactTimeMs: String(seed?.groundContactTimeMs ?? ""),
    strideLengthMeters: String(seed?.strideLengthMeters ?? ""),
    airTemperatureC: String(seed?.airTemperatureC ?? ""),
    dewPointC: String(seed?.dewPointC ?? ""),
    relativeHumidityPct: String(seed?.relativeHumidityPct ?? ""),
    windSpeedKph: String(seed?.windSpeedKph ?? ""),
    windExposurePct: String(seed?.windExposurePct ?? ""),
    solarLoadPct: String(seed?.solarLoadPct ?? ""),
    altitudeMeters: String(seed?.altitudeMeters ?? ""),
    surfaceWetnessPct: String(seed?.surfaceWetnessPct ?? ""),
    surfaceType: (seed?.surfaceType ?? "road") as SurfaceType,
    averageGradePct: String(seed?.averageGradePct ?? ""),
    descentMeters: String(seed?.descentMeters ?? ""),
  };
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDateValue(value: string): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(
    value.includes("T") ? value : `${value}T12:00:00`,
  ).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDisplayDate(value: string): string {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return value || "Undated";
  }

  return dateFormatter.format(parsed);
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatMetricNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return trimTrailingZeros(value.toFixed(digits));
}

function formatMetricDelta(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMetricNumber(value)}`;
}

function getMetricDeltaTone(value: number): string {
  if (value > 0.03) {
    return "delta-positive";
  }

  if (value < -0.03) {
    return "delta-negative";
  }

  return "delta-neutral";
}

function getActiveMetricBand(metric: PerformanceMetricCard) {
  return (
    [...metric.bands]
      .sort((left, right) => right.minInclusive - left.minInclusive)
      .find((band) => metric.value >= band.minInclusive) ?? metric.bands.at(-1)!
  );
}

function formatBandScale(bands: PerformanceMetricCard["bands"]): string {
  return [...bands]
    .sort((left, right) => left.minInclusive - right.minInclusive)
    .map((band) => `${band.label} ${formatMetricNumber(band.minInclusive)}`)
    .join(" · ");
}

function formatPaceFromSpeed(speedMetersPerSecond: number): string {
  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond <= 0) {
    return "n/a";
  }

  const totalSeconds = Math.round(1000 / speedMetersPerSecond);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

function sortActivitiesDesc(left: Activity, right: Activity): number {
  return parseDateValue(right.date) - parseDateValue(left.date);
}

function sortCheckInsDesc(left: DailyCheckIn, right: DailyCheckIn): number {
  return parseDateValue(right.date) - parseDateValue(left.date);
}

function sortMealsDesc(left: Meal, right: Meal): number {
  const leftValue = parseDateValue(`${left.date}T${left.time || "00:00"}`);
  const rightValue = parseDateValue(`${right.date}T${right.time || "00:00"}`);
  return rightValue - leftValue;
}

function sortWorkoutSignalSnapshotsDesc(
  left: WorkoutSignalSnapshot,
  right: WorkoutSignalSnapshot,
): number {
  return parseDateValue(right.date) - parseDateValue(left.date);
}

function countRecentActivities(activities: Activity[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return activities.filter((activity) => parseDateValue(activity.date) >= cutoff)
    .length;
}

function buildCombinedMetricCardMap(
  snapshot?: WorkoutSignalSnapshot,
): Map<string, PerformanceMetricCard> {
  if (!snapshot) {
    return new Map();
  }

  return new Map(
    [...buildPerformanceMetricCards(snapshot), ...buildEnvironmentalMetricCards(snapshot)].map(
      (metric) => [metric.id, metric],
    ),
  );
}

function buildCoachNudge(
  workspace: LocalWorkspaceState,
  selectedPlanWeek: (typeof trainingPlanWeeks)[number],
) {
  const hydrationGap = athlete.hydrationTargetLiters - workspace.hydrationLiters;
  const injuryText = workspace.injuryNote.toLowerCase();

  if (!workspace.aiNudgesEnabled) {
    return {
      title: "Nudges are paused",
      summary:
        "The workspace is still updating locally on this device, but the coach is not pushing reminders right now.",
      action: "Re-enable nudges when you want the app to actively challenge missed habits.",
    };
  }

  if (
    injuryText.includes("calf") ||
    injuryText.includes("pain") ||
    injuryText.includes("injur")
  ) {
    return {
      title: "Protect the next key session",
      summary:
        "Your injury note points to a repeat signal, so the plan should adapt before it becomes a forced shutdown.",
      action: selectedPlanWeek.adaptation,
    };
  }

  if (hydrationGap > 0.6) {
    return {
      title: "Close the hydration gap before tonight",
      summary:
        "You are behind the daily target enough that tomorrow's recovery quality is likely to slip.",
      action: `Add ${hydrationGap.toFixed(1)}L across the rest of the day and pair it with the next meal.`,
    };
  }

  if (workspace.recoveryScore < 70) {
    return {
      title: "Convert intensity into control",
      summary:
        "The current recovery score says keep the habit alive without pretending this is an ideal hard day.",
      action: "Keep the session, reduce the sharpest interval block, and protect sleep tonight.",
    };
  }

  return {
    title: "Momentum is intact",
    summary:
      "The current signals support staying on the selected marathon build without forcing unnecessary changes.",
    action: `Stay with week ${selectedPlanWeek.week} as written and keep the recovery routine after the long run.`,
  };
}

function buildLiveGoals(
  workspace: LocalWorkspaceState,
  recentActivityCount: number,
): Goal[] {
  const hydrationGap = Math.max(
    0,
    athlete.hydrationTargetLiters - workspace.hydrationLiters,
  );
  const recoveryRisk =
    workspace.recoveryScore < 70 ||
    /calf|pain|injur/i.test(workspace.injuryNote);

  return [
    {
      title: "Hit daily hydration target",
      metric: `${workspace.hydrationLiters.toFixed(1)}L / ${athlete.hydrationTargetLiters.toFixed(1)}L`,
      progress:
        hydrationGap === 0
          ? "Hydration target is already covered for today."
          : `${hydrationGap.toFixed(1)}L is still missing from today's target.`,
      status:
        hydrationGap === 0 ? "on-track" : hydrationGap <= 0.7 ? "watch" : "off-track",
      blockers:
        hydrationGap === 0
          ? ["Target reached"]
          : ["Intake is still below the daily target"],
      nextAction:
        hydrationGap === 0
          ? "Hold the routine and attach one more glass of water to the next meal."
          : `Add ${hydrationGap.toFixed(1)}L before the end of the day.`,
    },
    {
      title: "Protect weekly consistency",
      metric: `${recentActivityCount}/${athlete.weeklyActivityTarget} sessions in the last 7 days`,
      progress:
        recentActivityCount >= athlete.weeklyActivityTarget
          ? "The workload target for the week is already covered."
          : "The recent session count is still below the target pace for the week.",
      status:
        recentActivityCount >= athlete.weeklyActivityTarget
          ? "on-track"
          : recentActivityCount >= athlete.weeklyActivityTarget - 1
            ? "watch"
            : "off-track",
      blockers:
        recentActivityCount >= athlete.weeklyActivityTarget
          ? ["No current consistency blocker"]
          : ["Recent volume is below the target session count"],
      nextAction:
        recentActivityCount >= athlete.weeklyActivityTarget
          ? "Keep the recovery day protected so the streak does not spill into fatigue."
          : "Schedule the next easiest viable session first so the week does not collapse.",
    },
    {
      title: "Keep recovery risk visible",
      metric: `Recovery ${workspace.recoveryScore} with pain note tracking`,
      progress: recoveryRisk
        ? "The current signals say the plan should stay adaptive instead of rigid."
        : "The current recovery and injury signals support staying on script.",
      status: recoveryRisk ? "watch" : "on-track",
      blockers: recoveryRisk
        ? ["Recovery or injury signal is elevated"]
        : ["No elevated recovery blocker right now"],
      nextAction: recoveryRisk
        ? "Use the lighter adaptation rule before the next hard session."
        : "Keep the current week intact and review the next-morning check-in.",
    },
  ];
}

function buildLiveInsights(
  workspace: LocalWorkspaceState,
  activities: Activity[],
  checkIns: DailyCheckIn[],
  meals: Meal[],
  selectedPlanWeek: (typeof trainingPlanWeeks)[number],
  workoutSignalSnapshots: WorkoutSignalSnapshot[],
): Insight[] {
  const insights: Insight[] = [];
  const hydrationGap = Math.max(
    0,
    athlete.hydrationTargetLiters - workspace.hydrationLiters,
  );
  const recentActivityCount = countRecentActivities(activities, 7);
  const latestCheckIn = [...checkIns].sort(sortCheckInsDesc)[0];
  const elevatedPainSignal =
    /calf|pain|injur/i.test(workspace.injuryNote) ||
    /calf|pain|injur|monitor/i.test(latestCheckIn?.painFlag ?? "");
  const todayProtein = meals
    .filter((meal) => meal.date === getTodayIso())
    .reduce((sum, meal) => sum + meal.proteinGrams, 0);
  const recentSignalSnapshots = [...workoutSignalSnapshots].sort(
    sortWorkoutSignalSnapshotsDesc,
  );
  const latestSignalSnapshot = recentSignalSnapshots[0];
  const previousSignalSnapshot = recentSignalSnapshots[1];
  const latestMetricCardMap = buildCombinedMetricCardMap(latestSignalSnapshot);
  const previousMetricCardMap = buildCombinedMetricCardMap(previousSignalSnapshot);
  const aerobicStabilityMetric = latestMetricCardMap.get("aerobic-stability");
  const powerToWeightMetric = latestMetricCardMap.get("power-to-weight");
  const powerHeartRateMetric = latestMetricCardMap.get("power-heart-rate");
  const thermalHeadroomMetric = latestMetricCardMap.get("thermal-headroom");
  const oxygenSupportMetric = latestMetricCardMap.get("oxygen-support");
  const environmentalSupportMetric = latestMetricCardMap.get("environmental-support");
  const previousPowerToWeightMetric = previousMetricCardMap.get("power-to-weight");
  const previousPowerHeartRateMetric = previousMetricCardMap.get("power-heart-rate");

  if (latestSignalSnapshot && aerobicStabilityMetric && powerHeartRateMetric) {
    const powerHeartRateDelta =
      powerHeartRateMetric.value - (previousPowerHeartRateMetric?.value ?? powerHeartRateMetric.value);
    const climateProfile = describeClimateProfile(latestSignalSnapshot);

    if (
      thermalHeadroomMetric &&
      aerobicStabilityMetric.value < 95 &&
      thermalHeadroomMetric.value < 70
    ) {
      insights.push({
        title: "Drift looks climate-driven, not only fitness-driven",
        level: thermalHeadroomMetric.value < 55 ? "risk" : "watch",
        summary:
          "The durability drop matches a thermal penalty profile, so the fade should not be treated as a pure fitness failure.",
        evidence: `${climateProfile.label} conditions with thermal headroom ${formatMetricNumber(thermalHeadroomMetric.value)} and aerobic stability ${formatMetricNumber(aerobicStabilityMetric.value)}.`,
        action:
          "Adjust expectations for heat or cold strain first, then evaluate fueling and pacing before changing the training conclusion.",
      });
    } else if (
      oxygenSupportMetric &&
      powerHeartRateDelta < -0.05 &&
      oxygenSupportMetric.value < 75
    ) {
      insights.push({
        title: "Altitude likely inflated the cardiovascular cost",
        level: oxygenSupportMetric.value < 60 ? "risk" : "watch",
        summary:
          "Power relative to heart rate fell in a thin-air profile, which often reflects oxygen limitation before deeper fatigue.",
        evidence: `Oxygen support ${formatMetricNumber(oxygenSupportMetric.value)} with power versus heart-rate ${formatMetricNumber(powerHeartRateMetric.value)} W/bpm.`,
        action:
          "Compare this session against altitude-aware baselines rather than sea-level pace expectations.",
      });
    } else if (aerobicStabilityMetric.value < 95 || powerHeartRateDelta < -0.05) {
      insights.push({
        title: "Durability is the main limiter in the latest signal snapshot",
        level:
          aerobicStabilityMetric.value < 92 || powerHeartRateDelta < -0.12
            ? "risk"
            : "watch",
        summary:
          "The latest ratios say the engine is spending more cardiovascular cost to hold output later in the effort.",
        evidence: `${latestSignalSnapshot.label} logged aerobic stability ${formatMetricNumber(aerobicStabilityMetric.value)} and power versus heart-rate ${formatMetricNumber(powerHeartRateMetric.value)} W/bpm.`,
        action:
          "Treat fueling, heat, and aerobic durability as first-class debugging targets before forcing more intensity.",
      });
    } else if (
      powerToWeightMetric &&
      previousPowerToWeightMetric &&
      powerToWeightMetric.value > previousPowerToWeightMetric.value
    ) {
      insights.push({
        title: "Power per kilogram is moving in the right direction",
        level: "lift",
        summary:
          "The latest workout signal says output is rising without asking you to carry more body mass.",
        evidence: `${latestSignalSnapshot.label} moved from ${formatMetricNumber(previousPowerToWeightMetric.value)} to ${formatMetricNumber(powerToWeightMetric.value)} W/kg.`,
        action:
          "Keep building around the sessions and recovery habits that produced this cleaner power-to-weight profile.",
      });
    }
  }

  if (latestSignalSnapshot && environmentalSupportMetric) {
    const climateProfile = describeClimateProfile(latestSignalSnapshot);

    insights.push({
      title: `Environment profile: ${climateProfile.label}`,
      level:
        environmentalSupportMetric.value >= 82
          ? "lift"
          : environmentalSupportMetric.value >= 68
            ? "watch"
            : "risk",
      summary: climateProfile.narrative,
      evidence: `Environmental support scored ${formatMetricNumber(environmentalSupportMetric.value)} for ${latestSignalSnapshot.label}.`,
      action:
        environmentalSupportMetric.value >= 82
          ? "Use this session as a cleaner baseline when comparing fitness trends."
          : "Keep the climate and route score visible before drawing big conclusions from raw pace or heart rate.",
    });
  }

  if (elevatedPainSignal) {
    const painText = latestCheckIn?.painFlag || "No recent pain flag logged.";
    insights.push({
      title: "Pain signals need to drive the next decision",
      level: /calf|pain|injur/i.test(workspace.injuryNote) ? "risk" : "watch",
      summary:
        "The current note and latest check-in should influence the next key session instead of being treated as background noise.",
      evidence: `Injury note: "${workspace.injuryNote}". Latest pain flag: "${painText}".`,
      action: selectedPlanWeek.adaptation,
    });
  }

  if (hydrationGap > 0) {
    insights.push({
      title: "Hydration is still behind the target",
      level: hydrationGap > 0.7 ? "risk" : "watch",
      summary:
        "The local workspace says hydration is lagging, which makes tomorrow's recovery harder than it needs to be.",
      evidence: `${workspace.hydrationLiters.toFixed(1)}L logged against a ${athlete.hydrationTargetLiters.toFixed(1)}L target.`,
      action: `Add ${hydrationGap.toFixed(1)}L before tonight and pair the final intake with food.`,
    });
  }

  insights.push({
    title:
      recentActivityCount >= athlete.weeklyActivityTarget
        ? "Consistency is holding"
        : "Consistency still needs one more session",
    level:
      recentActivityCount >= athlete.weeklyActivityTarget
        ? "lift"
        : recentActivityCount >= athlete.weeklyActivityTarget - 1
          ? "watch"
          : "risk",
    summary:
      recentActivityCount >= athlete.weeklyActivityTarget
        ? "The recent activity count supports keeping the current plan week in motion."
        : "The recent activity count is still short of the weekly target, so the next easiest session matters.",
    evidence: `${recentActivityCount} activities are logged in the last 7 days against a ${athlete.weeklyActivityTarget}-session target.`,
    action:
      recentActivityCount >= athlete.weeklyActivityTarget
        ? "Protect the recovery day so the momentum stays durable."
        : "Schedule the smallest viable session now instead of waiting for the perfect workout slot.",
  });

  if (todayProtein > 0) {
    insights.push({
      title: "Nutrition logs are now part of the evidence",
      level: todayProtein >= 80 ? "lift" : "watch",
      summary:
        "Meal entries are no longer demo content, so the app can start grounding recommendations in your own intake.",
      evidence: `${todayProtein}g of protein is logged for today across ${meals.filter((meal) => meal.date === getTodayIso()).length} meals.`,
      action:
        todayProtein >= 80
          ? "Keep the current recovery meal pattern."
          : "Add a protein-forward meal or snack after the next session.",
    });
  }

  return insights.slice(0, 4);
}

function App() {
  const [appState, setAppState] = useState<LocalAppState>(() =>
    loadLocalAppState(createDefaultLocalAppState()),
  );
  const [storageMessage, setStorageMessage] = useState(
    "Local changes save automatically on this device.",
  );
  const [activityDraft, setActivityDraft] = useState({
    title: "",
    date: getTodayIso(),
    type: "Run",
    source: "manual" as ImportSource,
    distanceKm: "",
    durationMinutes: "",
    effort: "Moderate",
    note: "",
  });
  const [mealDraft, setMealDraft] = useState({
    label: "",
    date: getTodayIso(),
    time: "12:00",
    calories: "",
    proteinGrams: "",
    hydrationMl: "",
  });
  const [checkInDraft, setCheckInDraft] = useState({
    date: getTodayIso(),
    mood: "Focused",
    soreness: "",
    painFlag: "",
    positiveMoment: "",
    concern: "",
  });
  const [signalSnapshotDraft, setSignalSnapshotDraft] = useState(
    createSignalSnapshotDraft,
  );
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveLocalAppState(appState);
  }, [appState]);

  const workspace = appState.workspace;
  const recentActivities = [...appState.activities].sort(sortActivitiesDesc);
  const recentCheckIns = [...appState.checkIns].sort(sortCheckInsDesc);
  const recentMeals = [...appState.meals].sort(sortMealsDesc);
  const recentWorkoutSignalSnapshots = [...appState.workoutSignalSnapshots].sort(
    sortWorkoutSignalSnapshotsDesc,
  );
  const recentActivityCount = countRecentActivities(appState.activities, 7);
  const selectedPlanWeek =
    trainingPlanWeeks.find((week) => week.week === workspace.selectedPlanWeek) ??
    trainingPlanWeeks[0];
  const latestWorkoutSignalSnapshot = recentWorkoutSignalSnapshots[0];
  const previousWorkoutSignalSnapshot = recentWorkoutSignalSnapshots[1];
  const performanceMetricCards = latestWorkoutSignalSnapshot
    ? buildPerformanceMetricCards(latestWorkoutSignalSnapshot)
    : [];
  const environmentalMetricCards = latestWorkoutSignalSnapshot
    ? buildEnvironmentalMetricCards(latestWorkoutSignalSnapshot)
    : [];
  const allMetricCards = [...performanceMetricCards, ...environmentalMetricCards];
  const previousMetricCardMap = buildCombinedMetricCardMap(
    previousWorkoutSignalSnapshot,
  );
  const climateProfile = latestWorkoutSignalSnapshot
    ? describeClimateProfile(latestWorkoutSignalSnapshot)
    : null;
  const environmentalSupport = latestWorkoutSignalSnapshot
    ? buildEnvironmentalSupport(latestWorkoutSignalSnapshot)
    : 0;
  const futureMetricIdeas = buildFutureMetricIdeas();
  const coachNudge = buildCoachNudge(workspace, selectedPlanWeek);
  const liveGoals = buildLiveGoals(workspace, recentActivityCount);
  const liveInsights = buildLiveInsights(
    workspace,
    appState.activities,
    appState.checkIns,
    appState.meals,
    selectedPlanWeek,
    appState.workoutSignalSnapshots,
  );
  const todayMeals = appState.meals.filter((meal) => meal.date === getTodayIso());
  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = todayMeals.reduce(
    (sum, meal) => sum + meal.proteinGrams,
    0,
  );
  const totalHydrationMl = todayMeals.reduce(
    (sum, meal) => sum + meal.hydrationMl,
    0,
  );

  function updateWorkspace(
    updater: (current: LocalWorkspaceState) => LocalWorkspaceState,
  ) {
    setAppState((current) => ({
      ...current,
      workspace: updater(current.workspace),
    }));
  }

  function handleActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = activityDraft.title.trim() || `${activityDraft.type} entry`;
    const nextActivity: Activity = {
      id: makeId("activity"),
      title,
      source: activityDraft.source,
      date: activityDraft.date,
      type: activityDraft.type.trim() || "Workout",
      distanceKm: Number(activityDraft.distanceKm) || 0,
      durationMinutes: Number(activityDraft.durationMinutes) || 0,
      effort: activityDraft.effort.trim() || "Unspecified",
      note: activityDraft.note.trim(),
    };

    setAppState((current) => ({
      ...current,
      activities: [nextActivity, ...current.activities].sort(sortActivitiesDesc),
    }));
    setActivityDraft((current) => ({
      ...current,
      title: "",
      distanceKm: "",
      durationMinutes: "",
      note: "",
    }));
    setStorageMessage("Added a local activity entry.");
  }

  function handleMealSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMeal: Meal = {
      id: makeId("meal"),
      label: mealDraft.label.trim() || "Meal entry",
      date: mealDraft.date,
      time: mealDraft.time,
      calories: Number(mealDraft.calories) || 0,
      proteinGrams: Number(mealDraft.proteinGrams) || 0,
      hydrationMl: Number(mealDraft.hydrationMl) || 0,
    };

    setAppState((current) => ({
      ...current,
      meals: [nextMeal, ...current.meals].sort(sortMealsDesc),
    }));
    setMealDraft((current) => ({
      ...current,
      label: "",
      calories: "",
      proteinGrams: "",
      hydrationMl: "",
    }));
    setStorageMessage("Added a local meal entry.");
  }

  function handleCheckInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextCheckIn: DailyCheckIn = {
      id: makeId("checkin"),
      date: checkInDraft.date,
      mood: checkInDraft.mood.trim() || "Steady",
      soreness: checkInDraft.soreness.trim() || "Unspecified",
      painFlag: checkInDraft.painFlag.trim() || "No active pain flag",
      positiveMoment: checkInDraft.positiveMoment.trim() || "No win logged yet.",
      concern: checkInDraft.concern.trim() || "No concern logged yet.",
    };

    setAppState((current) => ({
      ...current,
      checkIns: [nextCheckIn, ...current.checkIns].sort(sortCheckInsDesc),
    }));
    setCheckInDraft((current) => ({
      ...current,
      soreness: "",
      painFlag: "",
      positiveMoment: "",
      concern: "",
    }));
    setStorageMessage("Added a local check-in.");
  }

  function handleSignalSnapshotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSnapshot: WorkoutSignalSnapshot = {
      id: makeId("signal"),
      label: signalSnapshotDraft.label.trim() || "Workout signal snapshot",
      date: signalSnapshotDraft.date,
      athleteWeightKg: Number(signalSnapshotDraft.athleteWeightKg) || 0,
      averagePowerWatts: Number(signalSnapshotDraft.averagePowerWatts) || 0,
      averageHeartRateBpm: Number(signalSnapshotDraft.averageHeartRateBpm) || 0,
      speedMetersPerSecond: Number(signalSnapshotDraft.speedMetersPerSecond) || 0,
      averageCadenceSpm: Number(signalSnapshotDraft.averageCadenceSpm) || 0,
      firstHalfHeartRateBpm: Number(signalSnapshotDraft.firstHalfHeartRateBpm) || 0,
      secondHalfHeartRateBpm: Number(signalSnapshotDraft.secondHalfHeartRateBpm) || 0,
      vo2Max: Number(signalSnapshotDraft.vo2Max) || 0,
      heartRateDrop1Min: Number(signalSnapshotDraft.heartRateDrop1Min) || 0,
      heartRateDrop2Min: Number(signalSnapshotDraft.heartRateDrop2Min) || 0,
      elevationGainMeters: Number(signalSnapshotDraft.elevationGainMeters) || 0,
      verticalOscillationCm: Number(signalSnapshotDraft.verticalOscillationCm) || 0,
      groundContactTimeMs: Number(signalSnapshotDraft.groundContactTimeMs) || 0,
      strideLengthMeters: Number(signalSnapshotDraft.strideLengthMeters) || 0,
      airTemperatureC: Number(signalSnapshotDraft.airTemperatureC) || 0,
      dewPointC: Number(signalSnapshotDraft.dewPointC) || 0,
      relativeHumidityPct: Number(signalSnapshotDraft.relativeHumidityPct) || 0,
      windSpeedKph: Number(signalSnapshotDraft.windSpeedKph) || 0,
      windExposurePct: Number(signalSnapshotDraft.windExposurePct) || 0,
      solarLoadPct: Number(signalSnapshotDraft.solarLoadPct) || 0,
      altitudeMeters: Number(signalSnapshotDraft.altitudeMeters) || 0,
      surfaceWetnessPct: Number(signalSnapshotDraft.surfaceWetnessPct) || 0,
      surfaceType: signalSnapshotDraft.surfaceType,
      averageGradePct: Number(signalSnapshotDraft.averageGradePct) || 0,
      descentMeters: Number(signalSnapshotDraft.descentMeters) || 0,
    };

    setAppState((current) => ({
      ...current,
      workoutSignalSnapshots: [
        nextSnapshot,
        ...current.workoutSignalSnapshots,
      ].sort(sortWorkoutSignalSnapshotsDesc),
    }));
    setSignalSnapshotDraft(createSignalSnapshotDraft());
    setStorageMessage("Added a local workout signal snapshot.");
  }

  function handleBackupDownload() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openrun-backup-${getTodayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStorageMessage("Downloaded a local backup JSON file.");
  }

  async function handleBackupImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextState = normalizeLocalAppState(
        parsed,
        createDefaultLocalAppState(),
      );
      setAppState(nextState);
      setStorageMessage("Restored local state from backup JSON.");
    } catch {
      setStorageMessage("Backup import failed. Check that the JSON file came from OpenRun.");
    } finally {
      input.value = "";
    }
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const importedActivities = parseActivitiesCsv(text);

      if (importedActivities.length === 0) {
        setStorageMessage("CSV import completed, but no activity rows were recognized.");
        return;
      }

      setAppState((current) => ({
        ...current,
        activities: [...importedActivities, ...current.activities].sort(
          sortActivitiesDesc,
        ),
      }));
      setStorageMessage(
        `Imported ${importedActivities.length} activity rows from CSV.`,
      );
    } catch {
      setStorageMessage("CSV import failed. Use a comma-separated file with a header row.");
    } finally {
      input.value = "";
    }
  }

  function handleResetLocalData() {
    if (!window.confirm("Reset local OpenRun data on this device?")) {
      return;
    }

    clearLocalAppState();
    setAppState(createDefaultLocalAppState());
    setStorageMessage("Reset local OpenRun data back to the starter seed set.");
  }

  function removeActivity(id: string) {
    setAppState((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== id),
    }));
  }

  function removeMeal(id: string) {
    setAppState((current) => ({
      ...current,
      meals: current.meals.filter((meal) => meal.id !== id),
    }));
  }

  function removeCheckIn(id: string) {
    setAppState((current) => ({
      ...current,
      checkIns: current.checkIns.filter((entry) => entry.id !== id),
    }));
  }

  function removeWorkoutSignalSnapshot(id: string) {
    setAppState((current) => ({
      ...current,
      workoutSignalSnapshots: current.workoutSignalSnapshots.filter(
        (snapshot) => snapshot.id !== id,
      ),
    }));
  }

  return (
    <div className="shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Open-source training intelligence</p>
          <h1>OpenRun is now a real local logging workspace, not just a pitch deck.</h1>
          <p className="hero-text">
            Log workouts, meals, hydration, and check-ins locally on this device,
            export a backup JSON file, restore it later, and import activity rows
            from CSV while the broader native ingestion stack is still being built.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#dashboard">
              Use local workspace
            </a>
            <a className="button button-secondary" href="#pillars">
              See product pillars
            </a>
          </div>
        </div>

        <aside className="command-panel">
          <div className="panel-header">
            <span>Current athlete workspace</span>
            <strong>{athlete.name}</strong>
          </div>
          <div className="metric-grid">
            <article>
              <span>Recovery</span>
              <strong>{workspace.recoveryScore}</strong>
              <small>readiness score</small>
            </article>
            <article>
              <span>Hydration</span>
              <strong>{workspace.hydrationLiters.toFixed(1)}L</strong>
              <small>target {athlete.hydrationTargetLiters}L</small>
            </article>
            <article>
              <span>Sessions</span>
              <strong>
                {recentActivityCount}/{athlete.weeklyActivityTarget}
              </strong>
              <small>logged in the last 7 days</small>
            </article>
            <article>
              <span>Focus</span>
              <strong>Week {selectedPlanWeek.week}</strong>
              <small>{selectedPlanWeek.phase}</small>
            </article>
          </div>
        </aside>
      </header>

      <main id="dashboard" className="dashboard">
        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Import pipeline</p>
              <h2>Working now: local backup restore and activity CSV import</h2>
            </div>
            <span className="chip">usable today</span>
          </div>

          <div className="import-grid">
            {importOptions.map((option) => (
              <article className="import-card" key={option.source}>
                <div className="import-row">
                  <strong>{option.label}</strong>
                  <span
                    className={
                      option.status === "ready"
                        ? "badge badge-ready"
                        : "badge badge-planned"
                    }
                  >
                    {option.status}
                  </span>
                </div>
                <p>{option.description}</p>
              </article>
            ))}
          </div>

          <div className="integration-grid">
            <article className="integration-card">
              <div className="import-row">
                <strong>Local backup and restore</strong>
                <span className="badge badge-ready">ready</span>
              </div>
              <p>
                Export the whole local workspace to JSON, restore it later, or
                reset the device copy back to the starter seed set.
              </p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={handleBackupDownload}
                >
                  Download backup JSON
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                >
                  Restore backup JSON
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  onClick={handleResetLocalData}
                >
                  Reset local data
                </button>
              </div>
              <input
                ref={backupInputRef}
                className="hidden-input"
                type="file"
                accept="application/json,.json"
                onChange={handleBackupImport}
              />
            </article>

            <article className="integration-card">
              <div className="import-row">
                <strong>Activity CSV import</strong>
                <span className="badge badge-ready">ready</span>
              </div>
              <p>
                Import workouts into the local activity timeline from a simple
                CSV file while GPX, FIT, TCX, PDF, and Health export adapters
                are still on the roadmap.
              </p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                >
                  Import activities CSV
                </button>
              </div>
              <p className="helper-text">
                CSV header example:{" "}
                <code className="helper-code">
                  title,date,type,distance_km,duration_minutes,effort,note,source
                </code>
              </p>
              <input
                ref={csvInputRef}
                className="hidden-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvImport}
              />
            </article>
          </div>

          <p className="helper-text">{storageMessage}</p>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Local-first mode</p>
              <h2>Keep the working set on this device</h2>
            </div>
            <span className="chip">persisted locally</span>
          </div>

          <div className="control-stack">
            <label className="field">
              <span>Hydration today</span>
              <div className="field-inline">
                <input
                  className="range-input"
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={workspace.hydrationLiters}
                  onChange={(event) =>
                    updateWorkspace((current) => ({
                      ...current,
                      hydrationLiters: Number(event.target.value),
                    }))
                  }
                />
                <strong>{workspace.hydrationLiters.toFixed(1)}L</strong>
              </div>
            </label>

            <label className="field">
              <span>Recovery score</span>
              <div className="field-inline">
                <input
                  className="range-input"
                  type="range"
                  min="30"
                  max="100"
                  step="1"
                  value={workspace.recoveryScore}
                  onChange={(event) =>
                    updateWorkspace((current) => ({
                      ...current,
                      recoveryScore: Number(event.target.value),
                    }))
                  }
                />
                <strong>{workspace.recoveryScore}</strong>
              </div>
            </label>

            <label className="field">
              <span>Current injury or concern</span>
              <textarea
                className="text-area"
                rows={4}
                value={workspace.injuryNote}
                onChange={(event) =>
                  updateWorkspace((current) => ({
                    ...current,
                    injuryNote: event.target.value,
                  }))
                }
              />
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={workspace.aiNudgesEnabled}
                onChange={(event) =>
                  updateWorkspace((current) => ({
                    ...current,
                    aiNudgesEnabled: event.target.checked,
                  }))
                }
              />
              <span>Allow daily AI nudges on this device</span>
            </label>
          </div>

          <p className="helper-text">
            This is now persisted as one local app state object with activities,
            meals, and check-ins, not only the old workspace sliders.
          </p>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Performance lab</p>
              <h2>Higher-is-better running metrics from your own signal snapshots</h2>
            </div>
            <span className="chip">directionally consistent</span>
          </div>

          <div className="macro-strip">
            <article>
              <span>Latest snapshot</span>
              <strong>
                {latestWorkoutSignalSnapshot
                  ? formatDisplayDate(latestWorkoutSignalSnapshot.date)
                  : "n/a"}
              </strong>
            </article>
            <article>
              <span>Active ratios</span>
              <strong>{allMetricCards.length}</strong>
            </article>
            <article>
              <span>Climate profile</span>
              <strong>{climateProfile?.label ?? "n/a"}</strong>
            </article>
            <article>
              <span>Environmental support</span>
              <strong>{formatMetricNumber(environmentalSupport)}</strong>
            </article>
            <article>
              <span>Design rule</span>
              <strong>Higher is better</strong>
            </article>
          </div>

          <div className="performance-layout">
            <div className="performance-grid">
              {allMetricCards.length === 0 ? (
                <article className="performance-card empty-state">
                  Add a workout signal snapshot to start computing performance ratios.
                </article>
              ) : (
                allMetricCards.map((metric) => {
                  const previousMetric = previousMetricCardMap.get(metric.id);
                  const delta = previousMetric
                    ? Number((metric.value - previousMetric.value).toFixed(2))
                    : null;
                  const activeBand = getActiveMetricBand(metric);

                  return (
                    <article className="performance-card" key={metric.id}>
                      <div className="event-row">
                        <div>
                          <p className="label-inline">{metric.shortLabel}</p>
                          <strong>{metric.title}</strong>
                        </div>
                        <span
                          className={`delta-pill ${getMetricDeltaTone(delta ?? 0)}`}
                        >
                          {delta === null
                            ? "baseline"
                            : `${formatMetricDelta(delta)} vs prior`}
                        </span>
                      </div>
                      <div className="performance-value-row">
                        <strong className="performance-value">
                          {formatMetricNumber(metric.value)}
                        </strong>
                        <span className="performance-unit">{metric.unit}</span>
                      </div>
                      <p className="muted">{metric.formula}</p>
                      <p className="label">Current band</p>
                      <p>
                        {activeBand.label}: {metric.interpretation}
                      </p>
                      <p className="label">Why it matters</p>
                      <p>{metric.whyItMatters}</p>
                      <p className="label">Band ladder</p>
                      <p className="muted">{formatBandScale(metric.bands)}</p>
                    </article>
                  );
                })
              )}
            </div>

            <div className="signal-stack">
              <article className="signal-card">
                <div className="event-row">
                  <strong>Latest signal context</strong>
                  <span className="chip">
                    {latestWorkoutSignalSnapshot?.label ?? "No snapshot yet"}
                  </span>
                </div>

                {climateProfile ? (
                  <>
                    <p className="label">Climate interpretation</p>
                    <p>
                      {climateProfile.label}: {climateProfile.narrative}
                    </p>
                  </>
                ) : null}

                {latestWorkoutSignalSnapshot ? (
                  <div className="signal-grid">
                    <article>
                      <span>Pace</span>
                      <strong>
                        {formatPaceFromSpeed(
                          latestWorkoutSignalSnapshot.speedMetersPerSecond,
                        )}
                      </strong>
                    </article>
                    <article>
                      <span>Power</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.averagePowerWatts,
                          0,
                        )}
                        W
                      </strong>
                    </article>
                    <article>
                      <span>Avg HR</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.averageHeartRateBpm,
                          0,
                        )}
                        bpm
                      </strong>
                    </article>
                    <article>
                      <span>Cadence</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.averageCadenceSpm,
                          0,
                        )}
                        spm
                      </strong>
                    </article>
                    <article>
                      <span>Elevation gain</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.elevationGainMeters,
                          0,
                        )}
                        m
                      </strong>
                    </article>
                    <article>
                      <span>Temp / dew point</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.airTemperatureC,
                          0,
                        )}
                        C /{" "}
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.dewPointC,
                          0,
                        )}
                        C
                      </strong>
                    </article>
                    <article>
                      <span>Wind / exposure</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.windSpeedKph,
                          0,
                        )}
                        kph /{" "}
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.windExposurePct,
                          0,
                        )}
                        %
                      </strong>
                    </article>
                    <article>
                      <span>Humidity / solar</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.relativeHumidityPct,
                          0,
                        )}
                        % /{" "}
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.solarLoadPct,
                          0,
                        )}
                        %
                      </strong>
                    </article>
                    <article>
                      <span>Altitude / grade</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.altitudeMeters,
                          0,
                        )}
                        m /{" "}
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.averageGradePct,
                        )}
                        %
                      </strong>
                    </article>
                    <article>
                      <span>Surface</span>
                      <strong>
                        {latestWorkoutSignalSnapshot.surfaceType} /{" "}
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.surfaceWetnessPct,
                          0,
                        )}
                        % wet
                      </strong>
                    </article>
                    <article>
                      <span>Stride length</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.strideLengthMeters,
                        )}
                        m
                      </strong>
                    </article>
                    <article>
                      <span>Ground contact</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.groundContactTimeMs,
                          0,
                        )}
                        ms
                      </strong>
                    </article>
                    <article>
                      <span>Vertical oscillation</span>
                      <strong>
                        {formatMetricNumber(
                          latestWorkoutSignalSnapshot.verticalOscillationCm,
                        )}
                        cm
                      </strong>
                    </article>
                  </div>
                ) : (
                  <p className="empty-state">
                    The ratios appear here once a workout signal snapshot exists.
                  </p>
                )}

                <p className="helper-text">
                  Raw biomechanics and terrain signals stay visible as context, but
                  the app prioritizes derived scores that move in one direction.
                </p>
              </article>

              <article className="signal-card">
                <div className="event-row">
                  <strong>Next metric layers</strong>
                  <span className="chip">planned</span>
                </div>
                <div className="future-grid">
                  {futureMetricIdeas.map((metric) => (
                    <article className="future-card" key={metric.id}>
                      <strong>{metric.title}</strong>
                      <p>{metric.whyItMatters}</p>
                      <p className="label">Signals</p>
                      <p className="muted">{metric.sourceSignals.join(", ")}</p>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          </div>

          <p className="label">Add workout signal snapshot</p>
          <p className="helper-text">
            Use this manual form while Apple Health, watch, and FIT imports are still
            being wired in. The metrics above update immediately from these local values.
          </p>

          <form className="form-grid" onSubmit={handleSignalSnapshotSubmit}>
            <input
              className="field-input"
              type="text"
              placeholder="Snapshot label"
              value={signalSnapshotDraft.label}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="date"
              value={signalSnapshotDraft.date}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.1"
              placeholder="Weight kg"
              value={signalSnapshotDraft.athleteWeightKg}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  athleteWeightKg: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Avg power W"
              value={signalSnapshotDraft.averagePowerWatts}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  averagePowerWatts: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Avg HR bpm"
              value={signalSnapshotDraft.averageHeartRateBpm}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  averageHeartRateBpm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Speed m/s"
              value={signalSnapshotDraft.speedMetersPerSecond}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  speedMetersPerSecond: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Cadence spm"
              value={signalSnapshotDraft.averageCadenceSpm}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  averageCadenceSpm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="1st-half HR"
              value={signalSnapshotDraft.firstHalfHeartRateBpm}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  firstHalfHeartRateBpm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="2nd-half HR"
              value={signalSnapshotDraft.secondHalfHeartRateBpm}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  secondHalfHeartRateBpm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.1"
              placeholder="VO2 max"
              value={signalSnapshotDraft.vo2Max}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  vo2Max: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="1-min HR drop"
              value={signalSnapshotDraft.heartRateDrop1Min}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  heartRateDrop1Min: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="2-min HR drop"
              value={signalSnapshotDraft.heartRateDrop2Min}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  heartRateDrop2Min: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Elevation gain m"
              value={signalSnapshotDraft.elevationGainMeters}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  elevationGainMeters: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.1"
              placeholder="Vertical osc cm"
              value={signalSnapshotDraft.verticalOscillationCm}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  verticalOscillationCm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Ground contact ms"
              value={signalSnapshotDraft.groundContactTimeMs}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  groundContactTimeMs: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Stride length m"
              value={signalSnapshotDraft.strideLengthMeters}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  strideLengthMeters: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              step="1"
              placeholder="Air temp C"
              value={signalSnapshotDraft.airTemperatureC}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  airTemperatureC: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              step="1"
              placeholder="Dew point C"
              value={signalSnapshotDraft.dewPointC}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  dewPointC: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="Humidity %"
              value={signalSnapshotDraft.relativeHumidityPct}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  relativeHumidityPct: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Wind kph"
              value={signalSnapshotDraft.windSpeedKph}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  windSpeedKph: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="Wind exposure %"
              value={signalSnapshotDraft.windExposurePct}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  windExposurePct: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="Solar load %"
              value={signalSnapshotDraft.solarLoadPct}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  solarLoadPct: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Altitude m"
              value={signalSnapshotDraft.altitudeMeters}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  altitudeMeters: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="Surface wetness %"
              value={signalSnapshotDraft.surfaceWetnessPct}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  surfaceWetnessPct: event.target.value,
                }))
              }
            />
            <select
              className="select-input"
              value={signalSnapshotDraft.surfaceType}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  surfaceType: event.target.value as SurfaceType,
                }))
              }
            >
              <option value="road">Road</option>
              <option value="track">Track</option>
              <option value="trail">Trail</option>
              <option value="gravel">Gravel</option>
              <option value="treadmill">Treadmill</option>
              <option value="snow">Snow</option>
              <option value="mixed">Mixed</option>
            </select>
            <input
              className="field-input"
              type="number"
              step="0.1"
              placeholder="Avg grade %"
              value={signalSnapshotDraft.averageGradePct}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  averageGradePct: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Descent m"
              value={signalSnapshotDraft.descentMeters}
              onChange={(event) =>
                setSignalSnapshotDraft((current) => ({
                  ...current,
                  descentMeters: event.target.value,
                }))
              }
            />
            <button className="button button-secondary form-submit" type="submit">
              Add signal snapshot
            </button>
          </form>

          <div className="signal-history">
            {recentWorkoutSignalSnapshots.length === 0 ? (
              <article className="signal-history-row empty-state">
                No workout signal snapshots logged yet.
              </article>
            ) : (
              recentWorkoutSignalSnapshots.map((snapshot) => (
                <article className="signal-history-row" key={snapshot.id}>
                  <div>
                    <strong>{snapshot.label}</strong>
                    <p>
                      {formatDisplayDate(snapshot.date)} · {formatPaceFromSpeed(snapshot.speedMetersPerSecond)} ·{" "}
                      {formatMetricNumber(snapshot.averagePowerWatts, 0)}W
                    </p>
                  </div>
                  <div>
                    <strong>
                      {formatMetricNumber(snapshot.averageHeartRateBpm, 0)} bpm
                    </strong>
                    <p>
                      {formatMetricNumber(snapshot.averageCadenceSpm, 0)} spm ·{" "}
                      {formatMetricNumber(snapshot.athleteWeightKg)} kg
                    </p>
                  </div>
                  <div>
                    <p>
                      VO2 {formatMetricNumber(snapshot.vo2Max, 1)} · HR drop{" "}
                      {formatMetricNumber(snapshot.heartRateDrop1Min, 0)}/
                      {formatMetricNumber(snapshot.heartRateDrop2Min, 0)}
                    </p>
                    <p className="muted">
                      {describeClimateProfile(snapshot).label} · env support{" "}
                      {formatMetricNumber(buildEnvironmentalSupport(snapshot))}
                    </p>
                    <button
                      className="button-quiet"
                      type="button"
                      onClick={() => removeWorkoutSignalSnapshot(snapshot.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Privacy proof</p>
              <h2>Trust has to be enforceable, not branding</h2>
            </div>
          </div>

          <div className="stack">
            {privacyControls.map((control) => (
              <article className="proof-card" key={control.title}>
                <strong>{control.title}</strong>
                <p>{control.guarantee}</p>
                <p className="label">Proof surface</p>
                <p>{control.proof}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Goals</p>
              <h2>Progress is now derived from your local records</h2>
            </div>
          </div>

          <div className="stack">
            {liveGoals.map((goal) => (
              <article className="goal-card" key={goal.title}>
                <div className="goal-row">
                  <strong>{goal.title}</strong>
                  <span className={goalClass[goal.status]}>{goal.status}</span>
                </div>
                <p className="muted">{goal.metric}</p>
                <p>{goal.progress}</p>
                <p className="label">Blockers</p>
                <ul className="plain-list">
                  {goal.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
                <p className="label">Next action</p>
                <p>{goal.nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Daily operating system</p>
              <h2>Log meals and hydration context directly</h2>
            </div>
          </div>

          <div className="macro-strip">
            <article>
              <span>Today calories</span>
              <strong>{totalCalories}</strong>
            </article>
            <article>
              <span>Today protein</span>
              <strong>{totalProtein}g</strong>
            </article>
            <article>
              <span>Meal hydration</span>
              <strong>{totalHydrationMl}ml</strong>
            </article>
          </div>

          <form className="form-grid" onSubmit={handleMealSubmit}>
            <input
              className="field-input"
              type="text"
              placeholder="Meal label"
              value={mealDraft.label}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="date"
              value={mealDraft.date}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="time"
              value={mealDraft.time}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              placeholder="Calories"
              value={mealDraft.calories}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  calories: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              placeholder="Protein g"
              value={mealDraft.proteinGrams}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  proteinGrams: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              placeholder="Hydration ml"
              value={mealDraft.hydrationMl}
              onChange={(event) =>
                setMealDraft((current) => ({
                  ...current,
                  hydrationMl: event.target.value,
                }))
              }
            />
            <button className="button button-secondary form-submit" type="submit">
              Add meal log
            </button>
          </form>

          <div className="stack">
            {recentMeals.length === 0 ? (
              <article className="event-card empty-state">
                No meals logged yet.
              </article>
            ) : (
              recentMeals.map((meal) => (
                <article className="event-card" key={meal.id}>
                  <div className="event-row">
                    <strong>{meal.label}</strong>
                    <span>
                      {formatDisplayDate(meal.date)} at {meal.time}
                    </span>
                  </div>
                  <p>
                    {meal.calories} kcal, {meal.proteinGrams}g protein,{" "}
                    {meal.hydrationMl}ml fluids
                  </p>
                  <button
                    className="button-quiet"
                    type="button"
                    onClick={() => removeMeal(meal.id)}
                  >
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Integration roadmap</p>
              <h2>What is planned after the local logging base is stable</h2>
            </div>
            <span className="chip">roadmap</span>
          </div>

          <div className="integration-grid">
            {integrations.map((integration) => (
              <article className="integration-card" key={integration.title}>
                <div className="import-row">
                  <strong>{integration.title}</strong>
                  <span className={deliveryClass[integration.status]}>
                    {integration.status}
                  </span>
                </div>
                <p>{integration.description}</p>
                <p className="label">Privacy mode</p>
                <p>{integration.privacyMode}</p>
                <p className="label">Implementation path</p>
                <p>{integration.implementationPath}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Marathon plan engine</p>
              <h2>Keep the adaptive plan logic, but now feed it real local inputs</h2>
            </div>
            <select
              className="select-input"
              value={workspace.selectedPlanWeek}
              onChange={(event) =>
                updateWorkspace((current) => ({
                  ...current,
                  selectedPlanWeek: Number(event.target.value),
                }))
              }
            >
              {trainingPlanWeeks.map((week) => (
                <option key={week.week} value={week.week}>
                  Week {week.week}
                </option>
              ))}
            </select>
          </div>

          <div className="plan-layout">
            <article className="plan-focus-card">
              <p className="section-kicker">Selected week</p>
              <h3>
                Week {selectedPlanWeek.week}: {selectedPlanWeek.phase}
              </h3>
              <p>{selectedPlanWeek.focus}</p>
              <p className="label">Target load</p>
              <p>{selectedPlanWeek.mileage}</p>
              <p className="label">Key sessions</p>
              <ul className="plain-list">
                {selectedPlanWeek.keySessions.map((session) => (
                  <li key={session}>{session}</li>
                ))}
              </ul>
              <p className="label">AI adaptation</p>
              <p>{selectedPlanWeek.adaptation}</p>
            </article>

            <article className="nudge-card">
              <p className="section-kicker">Daily nudge</p>
              <h3>{coachNudge.title}</h3>
              <p>{coachNudge.summary}</p>
              <p className="label">Suggested next move</p>
              <p>{coachNudge.action}</p>
              <p className="helper-text">
                This is still deterministic rule logic, but it now reads your
                live local workspace values rather than a fixed demo state.
              </p>
            </article>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Check-ins</p>
              <h2>Capture what the sensors miss</h2>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCheckInSubmit}>
            <input
              className="field-input"
              type="date"
              value={checkInDraft.date}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Mood"
              value={checkInDraft.mood}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  mood: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Soreness"
              value={checkInDraft.soreness}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  soreness: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Pain flag"
              value={checkInDraft.painFlag}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  painFlag: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Positive moment"
              value={checkInDraft.positiveMoment}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  positiveMoment: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Concern"
              value={checkInDraft.concern}
              onChange={(event) =>
                setCheckInDraft((current) => ({
                  ...current,
                  concern: event.target.value,
                }))
              }
            />
            <button className="button button-secondary form-submit" type="submit">
              Add check-in
            </button>
          </form>

          <div className="stack">
            {recentCheckIns.length === 0 ? (
              <article className="journal-card empty-state">
                No check-ins logged yet.
              </article>
            ) : (
              recentCheckIns.map((entry) => (
                <article className="journal-card" key={entry.id}>
                  <div className="event-row">
                    <strong>{formatDisplayDate(entry.date)}</strong>
                    <span>{entry.mood}</span>
                  </div>
                  <p>
                    <span className="label-inline">Soreness:</span>{" "}
                    {entry.soreness}
                  </p>
                  <p>
                    <span className="label-inline">Pain flag:</span>{" "}
                    {entry.painFlag}
                  </p>
                  <p>
                    <span className="label-inline">Positive:</span>{" "}
                    {entry.positiveMoment}
                  </p>
                  <p>
                    <span className="label-inline">Concern:</span>{" "}
                    {entry.concern}
                  </p>
                  <button
                    className="button-quiet"
                    type="button"
                    onClick={() => removeCheckIn(entry.id)}
                  >
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Recent activity stream</p>
              <h2>Normalize local workouts into one timeline</h2>
            </div>
            <span className="chip">real local records</span>
          </div>

          <form className="form-grid" onSubmit={handleActivitySubmit}>
            <input
              className="field-input"
              type="text"
              placeholder="Workout title"
              value={activityDraft.title}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="date"
              value={activityDraft.date}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Type"
              value={activityDraft.type}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
            />
            <select
              className="select-input"
              value={activityDraft.source}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  source: event.target.value as ImportSource,
                }))
              }
            >
              {Object.entries(sourceLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="field-input"
              type="number"
              min="0"
              step="0.1"
              placeholder="Distance km"
              value={activityDraft.distanceKm}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  distanceKm: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              placeholder="Duration min"
              value={activityDraft.durationMinutes}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Effort"
              value={activityDraft.effort}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  effort: event.target.value,
                }))
              }
            />
            <input
              className="field-input"
              type="text"
              placeholder="Note"
              value={activityDraft.note}
              onChange={(event) =>
                setActivityDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
            <button className="button button-secondary form-submit" type="submit">
              Add activity
            </button>
          </form>

          <div className="activity-table">
            {recentActivities.length === 0 ? (
              <article className="activity-row empty-state">
                No activities logged yet.
              </article>
            ) : (
              recentActivities.map((activity) => (
                <article className="activity-row" key={activity.id}>
                  <div>
                    <strong>{activity.title}</strong>
                    <p>
                      {activity.type} · {formatDisplayDate(activity.date)} ·{" "}
                      {sourceLabel[activity.source]}
                    </p>
                  </div>
                  <div>
                    <strong>
                      {activity.distanceKm > 0
                        ? `${activity.distanceKm} km`
                        : `${activity.durationMinutes} min`}
                    </strong>
                    <p>{activity.effort}</p>
                  </div>
                  <div>
                    <p>{activity.note || "No note added."}</p>
                    <button
                      className="button-quiet"
                      type="button"
                      onClick={() => removeActivity(activity.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">AI coach surface</p>
              <h2>Recommendations now derive from your local state</h2>
            </div>
          </div>

          <div className="insight-grid">
            {liveInsights.map((insight) => (
              <article className={insightClass[insight.level]} key={insight.title}>
                <div className="event-row">
                  <strong>{insight.title}</strong>
                  <span>{insight.level}</span>
                </div>
                <p>{insight.summary}</p>
                <p className="label">Evidence</p>
                <p>{insight.evidence}</p>
                <p className="label">Action</p>
                <p>{insight.action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Outbound network policy</p>
              <h2>Users should be able to inspect what leaves the device</h2>
            </div>
            <span className="chip">proof before promise</span>
          </div>

          <div className="network-grid">
            {networkRules.map((rule) => (
              <article className="proof-card" key={rule.title}>
                <strong>{rule.title}</strong>
                <p className="label">Destination</p>
                <p>{rule.destination}</p>
                <p className="label">Policy</p>
                <p>{rule.policy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pillars" className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Product pillars</p>
              <h2>What still differentiates OpenRun from a workout-only tracker</h2>
            </div>
          </div>

          <div className="pillar-grid">
            {pillars.map((pillar) => (
              <article className="pillar-card" key={pillar.title}>
                <strong>{pillar.title}</strong>
                <p>{pillar.description}</p>
                <small>{pillar.outcome}</small>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
