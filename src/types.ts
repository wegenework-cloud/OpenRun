export type ImportSource =
  | "pdf"
  | "apple-watch"
  | "strava"
  | "garmin"
  | "manual";

export type GoalStatus = "on-track" | "watch" | "off-track";
export type InsightLevel = "lift" | "watch" | "risk";
export type DeliveryStatus = "ready" | "planned";
export type SurfaceType =
  | "road"
  | "track"
  | "trail"
  | "gravel"
  | "treadmill"
  | "snow"
  | "mixed";

export interface AthleteProfile {
  name: string;
  trainingFocus: string;
  goalHorizon: string;
  recoveryScore: number;
  hydrationTargetLiters: number;
  dailyHydrationLiters: number;
  weeklyActivityTarget: number;
  weeklyCompletedSessions: number;
}

export interface ImportOption {
  source: ImportSource;
  label: string;
  description: string;
  status: "ready" | "planned";
}

export interface Activity {
  id: string;
  title: string;
  source: ImportSource;
  date: string;
  type: string;
  distanceKm: number;
  durationMinutes: number;
  effort: string;
  note: string;
}

export interface Goal {
  title: string;
  metric: string;
  progress: string;
  status: GoalStatus;
  blockers: string[];
  nextAction: string;
}

export interface DailyCheckIn {
  id: string;
  date: string;
  mood: string;
  soreness: string;
  painFlag: string;
  positiveMoment: string;
  concern: string;
}

export interface Meal {
  id: string;
  label: string;
  date: string;
  time: string;
  calories: number;
  proteinGrams: number;
  hydrationMl: number;
}

export interface Insight {
  title: string;
  level: InsightLevel;
  summary: string;
  evidence: string;
  action: string;
}

export interface ProductPillar {
  title: string;
  description: string;
  outcome: string;
}

export interface Integration {
  title: string;
  status: DeliveryStatus;
  privacyMode: string;
  implementationPath: string;
  description: string;
}

export interface PrivacyControl {
  title: string;
  guarantee: string;
  proof: string;
}

export interface NetworkRule {
  title: string;
  destination: string;
  policy: string;
}

export interface TrainingPlanWeek {
  week: number;
  phase: string;
  focus: string;
  mileage: string;
  keySessions: string[];
  adaptation: string;
}

export interface MetricBand {
  label: string;
  minInclusive: number;
  narrative: string;
}

export interface WorkoutSignalSnapshot {
  id: string;
  label: string;
  date: string;
  athleteWeightKg: number;
  averagePowerWatts: number;
  averageHeartRateBpm: number;
  speedMetersPerSecond: number;
  averageCadenceSpm: number;
  firstHalfHeartRateBpm: number;
  secondHalfHeartRateBpm: number;
  vo2Max: number;
  heartRateDrop1Min: number;
  heartRateDrop2Min: number;
  elevationGainMeters: number;
  verticalOscillationCm: number;
  groundContactTimeMs: number;
  strideLengthMeters: number;
  airTemperatureC: number;
  dewPointC: number;
  relativeHumidityPct: number;
  windSpeedKph: number;
  windExposurePct: number;
  solarLoadPct: number;
  altitudeMeters: number;
  surfaceWetnessPct: number;
  surfaceType: SurfaceType;
  averageGradePct: number;
  descentMeters: number;
}

export interface PerformanceMetricCard {
  id: string;
  title: string;
  shortLabel: string;
  unit: string;
  value: number;
  formula: string;
  interpretation: string;
  whyItMatters: string;
  discipline: "running" | "jump-rope" | "cycling";
  sourceSignals: string[];
  bands: MetricBand[];
}

export interface LocalWorkspaceState {
  hydrationLiters: number;
  recoveryScore: number;
  injuryNote: string;
  selectedPlanWeek: number;
  aiNudgesEnabled: boolean;
}

export interface LocalAppState {
  workspace: LocalWorkspaceState;
  activities: Activity[];
  checkIns: DailyCheckIn[];
  meals: Meal[];
  workoutSignalSnapshots: WorkoutSignalSnapshot[];
}
