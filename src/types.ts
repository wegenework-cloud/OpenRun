export type ImportSource =
  | "pdf"
  | "apple-watch"
  | "strava"
  | "garmin"
  | "manual";

export type GoalStatus = "on-track" | "watch" | "off-track";
export type InsightLevel = "lift" | "watch" | "risk";
export type DeliveryStatus = "ready" | "planned";

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
  date: string;
  mood: string;
  soreness: string;
  painFlag: string;
  positiveMoment: string;
  concern: string;
}

export interface Meal {
  label: string;
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

export interface LocalWorkspaceState {
  hydrationLiters: number;
  recoveryScore: number;
  injuryNote: string;
  selectedPlanWeek: number;
  aiNudgesEnabled: boolean;
}
