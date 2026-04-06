import type {
  Activity,
  AthleteProfile,
  DailyCheckIn,
  Goal,
  ImportOption,
  Integration,
  Insight,
  LocalWorkspaceState,
  Meal,
  NetworkRule,
  PrivacyControl,
  ProductPillar,
  TrainingPlanWeek,
} from "../types";

export const athlete: AthleteProfile = {
  name: "Ari",
  trainingFocus: "Half marathon build with weight-loss support",
  goalHorizon: "Race day in 11 weeks",
  recoveryScore: 76,
  hydrationTargetLiters: 3.2,
  dailyHydrationLiters: 2.1,
  weeklyActivityTarget: 6,
  weeklyCompletedSessions: 4,
};

export const importOptions: ImportOption[] = [
  {
    source: "pdf",
    label: "PDF upload",
    description: "Race reports, exported summaries, lab reports, or coach plans.",
    status: "ready",
  },
  {
    source: "apple-watch",
    label: "Apple Watch",
    description: "Bring in workout summaries and close the ring-to-training gap.",
    status: "planned",
  },
  {
    source: "strava",
    label: "Strava",
    description: "Import workouts, route context, and training history.",
    status: "planned",
  },
  {
    source: "garmin",
    label: "Other devices",
    description: "Garmin, Coros, Fitbit, CSV, and future adapters.",
    status: "planned",
  },
  {
    source: "manual",
    label: "Manual log",
    description: "Quick-add a workout, symptoms, or notes when there is no device.",
    status: "ready",
  },
];

export const activities: Activity[] = [
  {
    id: "act-1",
    title: "Progression run",
    source: "strava",
    date: "Apr 4",
    type: "Run",
    distanceKm: 11.8,
    durationMinutes: 63,
    effort: "Moderate",
    note: "Felt strong until the last 2 km when cadence dropped.",
  },
  {
    id: "act-2",
    title: "Easy shakeout",
    source: "apple-watch",
    date: "Apr 3",
    type: "Run",
    distanceKm: 5.2,
    durationMinutes: 31,
    effort: "Easy",
    note: "Kept the effort low after poor sleep.",
  },
  {
    id: "act-3",
    title: "Gym session",
    source: "manual",
    date: "Apr 2",
    type: "Strength",
    distanceKm: 0,
    durationMinutes: 47,
    effort: "Moderate",
    note: "Single-leg work plus core. Left calf tightened on hops.",
  },
];

export const goals: Goal[] = [
  {
    title: "Finish sub-1:45 half marathon",
    metric: "Target pace 4:58/km",
    progress: "Aerobic fitness ahead of schedule, durability slightly behind.",
    status: "watch",
    blockers: ["Hydration under target on 4 of last 7 days", "Calf tightness after strength work"],
    nextAction: "Reduce lower-leg plyometrics for 5 days and hit 3.0L hydration daily.",
  },
  {
    title: "Train 6 sessions per week",
    metric: "4/6 sessions completed",
    progress: "Consistency is trending up after replacing one run with low-impact cardio.",
    status: "on-track",
    blockers: ["Work stress disrupted one recovery day"],
    nextAction: "Schedule the next recovery session before the long run.",
  },
];

export const checkIns: DailyCheckIn[] = [
  {
    date: "Apr 4",
    mood: "Focused",
    soreness: "Mild calves",
    painFlag: "Monitor left calf",
    positiveMoment: "Locked in my pacing during the middle block.",
    concern: "Skipped post-run protein until 90 minutes later.",
  },
  {
    date: "Apr 3",
    mood: "Tired",
    soreness: "Low",
    painFlag: "No acute pain",
    positiveMoment: "Protected recovery by slowing the run down.",
    concern: "Only 5.5 hours of sleep.",
  },
];

export const meals: Meal[] = [
  {
    label: "Greek yogurt, berries, oats",
    time: "07:30",
    calories: 460,
    proteinGrams: 28,
    hydrationMl: 450,
  },
  {
    label: "Chicken bowl with rice and greens",
    time: "12:45",
    calories: 710,
    proteinGrams: 43,
    hydrationMl: 600,
  },
  {
    label: "Recovery smoothie",
    time: "18:10",
    calories: 320,
    proteinGrams: 31,
    hydrationMl: 350,
  },
];

export const insights: Insight[] = [
  {
    title: "Your workout quality is good, but recovery support is inconsistent.",
    level: "watch",
    summary:
      "The last progression run was strong, but hydration and post-run protein timing were both below target this week.",
    evidence: "Hydration is 2.1L against a 3.2L target and one recent hard run missed timely recovery nutrition.",
    action: "Push a recovery routine prompt within 20 minutes after every quality session.",
  },
  {
    title: "The calf note matters because it repeats across systems.",
    level: "risk",
    summary:
      "Strength notes and daily check-ins both mention the left calf, which raises the chance of a load-management problem rather than a one-off complaint.",
    evidence: "Manual gym log noted calf tightness and the latest check-in still flags the same area.",
    action: "Reduce explosive lower-leg work, add a pain trend chart, and ask for a next-morning check-in.",
  },
  {
    title: "Consistency is improving because the plan adapts instead of collapsing.",
    level: "lift",
    summary:
      "Replacing one run with low-impact work preserved weekly momentum instead of turning one missed session into several.",
    evidence: "4 of 6 planned sessions are complete and the user kept training despite fatigue.",
    action: "Keep a fallback session template for high-stress days.",
  },
];

export const pillars: ProductPillar[] = [
  {
    title: "Universal intake",
    description: "Pull performance data in from PDFs, wearables, exports, and manual notes.",
    outcome: "Users do not have to abandon their existing device ecosystem.",
  },
  {
    title: "Whole-person logging",
    description: "Track food, water, sleep, pain, mood, wins, and setbacks next to workouts.",
    outcome: "The model gets enough context to explain cause instead of just charting symptoms.",
  },
  {
    title: "Goal engine",
    description: "Translate behavior and metrics into active plans with blockers and next actions.",
    outcome: "The product behaves like a coach, not a spreadsheet.",
  },
  {
    title: "Explainable AI",
    description: "Every recommendation ties back to the user's own data and uncertainty is surfaced.",
    outcome: "Users can trust the system and challenge it when it is wrong.",
  },
];

export const integrations: Integration[] = [
  {
    title: "PDF, GPX, TCX, FIT, and CSV intake",
    status: "ready",
    privacyMode: "Local file parsing",
    implementationPath: "Web parser in the local app",
    description:
      "The first import path should accept files directly on the device and normalize them into one activity schema without sending raw files anywhere.",
  },
  {
    title: "Apple Health export import",
    status: "ready",
    privacyMode: "Manual on-device import",
    implementationPath: "Import Health export bundles from iPhone",
    description:
      "This provides a privacy-preserving fallback immediately, even before a native companion app exists.",
  },
  {
    title: "Apple Watch and HealthKit companion",
    status: "planned",
    privacyMode: "Native permissioned access",
    implementationPath: "iOS companion app with HealthKit bridge",
    description:
      "Direct watch and Health app ingestion should happen through a native companion that writes into the user's local OpenRun store.",
  },
  {
    title: "Strava import",
    status: "planned",
    privacyMode: "Local token plus user-approved sync",
    implementationPath: "OAuth or export-file import",
    description:
      "Users should be able to pull their own activity history in or import exported Strava files without making OpenRun the owner of that data.",
  },
  {
    title: "Maps and route review",
    status: "planned",
    privacyMode: "Open renderer with provider choice",
    implementationPath: "MapLibre plus self-hosted or user-selected tiles",
    description:
      "Map rendering should stay open-source and should not force route telemetry through a closed vendor by default.",
  },
];

export const privacyControls: PrivacyControl[] = [
  {
    title: "Local-first storage",
    guarantee: "Workout logs, food notes, injuries, goals, and coach settings stay on the device by default.",
    proof: "This starter has no application backend and persists the editable workspace locally in the browser.",
  },
  {
    title: "Explicit outbound policy",
    guarantee: "The app should only talk to endpoints the user can inspect and approve.",
    proof: "The starter ships with a restrictive Content Security Policy and zero runtime API calls.",
  },
  {
    title: "Auditable AI boundary",
    guarantee: "Only the user-approved summary should leave the device for model inference.",
    proof: "The product plan separates deterministic feature building from model calls so outbound payloads can be shown before sending.",
  },
];

export const networkRules: NetworkRule[] = [
  {
    title: "Current starter",
    destination: "self only",
    policy: "No cloud sync, no telemetry, and no third-party fetches are wired into this build.",
  },
  {
    title: "Future AI inference",
    destination: "single allowlisted model endpoint",
    policy: "Only derived summaries or user-approved excerpts should be sent, not the raw local database.",
  },
  {
    title: "Future maps",
    destination: "user-selected or self-hosted tiles",
    policy: "The map layer should default to an open renderer and make the tile provider an explicit choice.",
  },
];

export const trainingPlanWeeks: TrainingPlanWeek[] = [
  {
    week: 7,
    phase: "Aerobic build",
    focus: "Raise durability without adding unnecessary speed stress.",
    mileage: "41-45 miles",
    keySessions: [
      "Steady medium-long run",
      "Threshold intervals with controlled recoveries",
      "Easy long run with relaxed finish",
    ],
    adaptation:
      "If the injury note persists, swap the threshold set for aerobic tempo and keep the long run easy.",
  },
  {
    week: 8,
    phase: "Strength block",
    focus: "Protect long-run quality while adding marathon-specific rhythm.",
    mileage: "45-49 miles",
    keySessions: [
      "Marathon-pace segments inside the long run",
      "Short hill session or power-based substitute",
      "Low-impact recovery day after the biggest run",
    ],
    adaptation:
      "If the calf or sleep markers worsen, remove hills first and preserve the long run with flatter terrain.",
  },
  {
    week: 9,
    phase: "Load consolidation",
    focus: "Hold consistency and avoid turning one off day into a lost week.",
    mileage: "46-50 miles",
    keySessions: [
      "Cruise intervals at controlled effort",
      "Recovery cross-training fallback",
      "Long run with negative-split finish",
    ],
    adaptation:
      "If hydration or recovery falls behind, keep the negative split but shorten the total volume.",
  },
  {
    week: 10,
    phase: "Absorb and sharpen",
    focus: "Reduce accumulated strain while keeping marathon confidence high.",
    mileage: "38-42 miles",
    keySessions: [
      "Reduced-volume quality session",
      "Extra recovery mobility day",
      "Long run cutback with strong form focus",
    ],
    adaptation:
      "If fatigue remains elevated, convert the quality day into strides and move the emphasis to sleep and fueling.",
  },
];

export const defaultWorkspaceState: LocalWorkspaceState = {
  hydrationLiters: athlete.dailyHydrationLiters,
  recoveryScore: athlete.recoveryScore,
  injuryNote: "Left calf is tight after hopping and harder long-run finishes.",
  selectedPlanWeek: 8,
  aiNudgesEnabled: true,
};
