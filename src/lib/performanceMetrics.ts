import type {
  MetricBand,
  PerformanceMetricCard,
  WorkoutSignalSnapshot,
} from "../types";

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function pickBand(value: number, bands: MetricBand[]): MetricBand {
  const sortedBands = [...bands].sort(
    (left, right) => right.minInclusive - left.minInclusive,
  );

  return sortedBands.find((band) => value >= band.minInclusive) ?? sortedBands.at(-1)!;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

const powerToWeightBands: MetricBand[] = [
  {
    label: "Elite-like",
    minInclusive: 4.6,
    narrative: "This is in the range where high-end distance power stands out immediately.",
  },
  {
    label: "Sub-3 trajectory",
    minInclusive: 4.0,
    narrative: "This is the kind of power-to-weight zone that supports ambitious marathon performance.",
  },
  {
    label: "Competitive amateur",
    minInclusive: 3.3,
    narrative: "This is already beyond general recreational fitness and trending toward serious training.",
  },
  {
    label: "Recreational",
    minInclusive: 0,
    narrative: "A solid starting zone that can move quickly with consistent aerobic and strength work.",
  },
];

const efficiencyBands: MetricBand[] = [
  {
    label: "Excellent economy",
    minInclusive: 3.2,
    narrative: "You are getting strong speed per unit of cardiovascular cost.",
  },
  {
    label: "Strong economy",
    minInclusive: 2.8,
    narrative: "The heart-rate cost of pace is moving in the right direction.",
  },
  {
    label: "Developing economy",
    minInclusive: 2.3,
    narrative: "There is useful signal here, but there is still room to get more speed from the same effort.",
  },
  {
    label: "Early baseline",
    minInclusive: 0,
    narrative: "Treat this as a reference point and improve it with aerobic durability.",
  },
];

const aerobicStabilityBands: MetricBand[] = [
  {
    label: "Excellent durability",
    minInclusive: 97,
    narrative: "Heart-rate drift stayed low, which usually points to strong aerobic control.",
  },
  {
    label: "Strong durability",
    minInclusive: 95,
    narrative: "The engine stayed stable through the effort without much fade.",
  },
  {
    label: "Watch drift",
    minInclusive: 92,
    narrative: "This is usable, but fueling, heat, or fatigue may still be nudging heart rate upward.",
  },
  {
    label: "Fade risk",
    minInclusive: 0,
    narrative: "The drift is high enough that aerobic durability or fueling likely broke down.",
  },
];

const cadenceEconomyBands: MetricBand[] = [
  {
    label: "Elastic",
    minInclusive: 1.7,
    narrative: "You are covering a lot of ground per step without losing rhythm.",
  },
  {
    label: "Efficient",
    minInclusive: 1.5,
    narrative: "Speed and cadence are cooperating well.",
  },
  {
    label: "Developing",
    minInclusive: 1.3,
    narrative: "There is still room to turn cadence into more forward travel.",
  },
  {
    label: "Short stride output",
    minInclusive: 0,
    narrative: "The stride is not yet converting cadence into much speed.",
  },
];

const powerHeartRateBands: MetricBand[] = [
  {
    label: "Excellent resilience",
    minInclusive: 2.0,
    narrative: "Power is staying high relative to heart rate, which is a strong fatigue signal in the right direction.",
  },
  {
    label: "Strong resilience",
    minInclusive: 1.8,
    narrative: "This suggests the body is still converting cardiovascular cost into useful output.",
  },
  {
    label: "Developing resilience",
    minInclusive: 1.55,
    narrative: "The ratio is workable, but it still leaves room for aerobic and muscular gains.",
  },
  {
    label: "Fatigue watch",
    minInclusive: 0,
    narrative: "If this stays low while effort feels high, fatigue or breakdown is likely.",
  },
];

const vo2Bands: MetricBand[] = [
  {
    label: "Elite-like",
    minInclusive: 65,
    narrative: "This is a rarefied aerobic ceiling.",
  },
  {
    label: "Sub-elite",
    minInclusive: 58,
    narrative: "A strong macro indicator for high-end endurance performance.",
  },
  {
    label: "Competitive",
    minInclusive: 50,
    narrative: "This supports serious amateur endurance goals.",
  },
  {
    label: "Recreational",
    minInclusive: 0,
    narrative: "A solid baseline that can trend upward with structured training.",
  },
];

const recoveryBands: MetricBand[] = [
  {
    label: "Fast reset",
    minInclusive: 38,
    narrative: "Heart rate is dropping quickly after work, which usually points to solid recovery capacity.",
  },
  {
    label: "Strong reset",
    minInclusive: 30,
    narrative: "The post-effort recovery response looks healthy.",
  },
  {
    label: "Moderate reset",
    minInclusive: 22,
    narrative: "Recovery is acceptable, but not yet snapping back quickly.",
  },
  {
    label: "Slow reset",
    minInclusive: 0,
    narrative: "Recovery is lagging and may reflect fatigue, heat, or accumulated stress.",
  },
];

export function buildPerformanceMetricCards(
  snapshot: WorkoutSignalSnapshot,
): PerformanceMetricCard[] {
  const powerToWeight = round(
    safeDivide(snapshot.averagePowerWatts, snapshot.athleteWeightKg),
  );
  const efficiencyIndex = round(
    safeDivide(snapshot.speedMetersPerSecond * 100, snapshot.averageHeartRateBpm),
  );
  const rawDecoupling = round(
    safeDivide(
      (snapshot.secondHalfHeartRateBpm - snapshot.firstHalfHeartRateBpm) * 100,
      snapshot.firstHalfHeartRateBpm,
    ),
  );
  const aerobicStability = round(Math.max(0, 100 - Math.max(rawDecoupling, 0)));
  const cadenceEconomy = round(
    safeDivide(snapshot.speedMetersPerSecond, snapshot.averageCadenceSpm / 60),
  );
  const powerHeartRate = round(
    safeDivide(snapshot.averagePowerWatts, snapshot.averageHeartRateBpm),
  );
  const recoveryIndex = round(
    (snapshot.heartRateDrop1Min + snapshot.heartRateDrop2Min) / 2,
  );

  const metrics: PerformanceMetricCard[] = [
    {
      id: "power-to-weight",
      title: "Running power-to-weight",
      shortLabel: "W/kg",
      unit: "W/kg",
      value: powerToWeight,
      formula: "average power / body weight",
      interpretation: pickBand(powerToWeight, powerToWeightBands).narrative,
      whyItMatters:
        "This is the cleanest expression of how much running output you can move per kilogram.",
      discipline: "running",
      sourceSignals: ["average power", "body weight"],
      bands: powerToWeightBands,
    },
    {
      id: "efficiency-index",
      title: "Efficiency index",
      shortLabel: "speed / HR",
      unit: "score",
      value: efficiencyIndex,
      formula: "(speed m/s / average HR bpm) * 100",
      interpretation: pickBand(efficiencyIndex, efficiencyBands).narrative,
      whyItMatters:
        "This shows how much speed you are buying with each unit of heart-rate cost.",
      discipline: "running",
      sourceSignals: ["speed", "average heart rate"],
      bands: efficiencyBands,
    },
    {
      id: "aerobic-stability",
      title: "Aerobic stability",
      shortLabel: "100 - drift",
      unit: "score",
      value: aerobicStability,
      formula: "100 - positive heart-rate drift %",
      interpretation: pickBand(aerobicStability, aerobicStabilityBands).narrative,
      whyItMatters:
        "This inverts raw aerobic decoupling so higher is better and easier to compare across the dashboard.",
      discipline: "running",
      sourceSignals: ["first-half HR", "second-half HR"],
      bands: aerobicStabilityBands,
    },
    {
      id: "cadence-economy",
      title: "Cadence efficiency ratio",
      shortLabel: "speed / cadence",
      unit: "m/step",
      value: cadenceEconomy,
      formula: "speed / steps per second",
      interpretation: pickBand(cadenceEconomy, cadenceEconomyBands).narrative,
      whyItMatters:
        "This highlights how much forward travel you get from each step when cadence stays controlled.",
      discipline: "running",
      sourceSignals: ["speed", "cadence"],
      bands: cadenceEconomyBands,
    },
    {
      id: "power-heart-rate",
      title: "Power versus heart-rate ratio",
      shortLabel: "W/HR",
      unit: "W/bpm",
      value: powerHeartRate,
      formula: "average power / average HR",
      interpretation: pickBand(powerHeartRate, powerHeartRateBands).narrative,
      whyItMatters:
        "If power fades while heart rate stays high, this ratio will fall and expose fatigue faster than pace alone.",
      discipline: "running",
      sourceSignals: ["average power", "average heart rate"],
      bands: powerHeartRateBands,
    },
    {
      id: "vo2-max-trend",
      title: "VO2 max trend",
      shortLabel: "VO2 max",
      unit: "ml/kg/min",
      value: round(snapshot.vo2Max, 1),
      formula: "device or lab VO2 max estimate",
      interpretation: pickBand(snapshot.vo2Max, vo2Bands).narrative,
      whyItMatters:
        "This stays as a macro indicator, not a daily decision metric, but it is still useful for long-horizon trend tracking.",
      discipline: "running",
      sourceSignals: ["VO2 max estimate"],
      bands: vo2Bands,
    },
    {
      id: "recovery-index",
      title: "Recovery index",
      shortLabel: "HR reset",
      unit: "bpm",
      value: recoveryIndex,
      formula: "average of 1-minute and 2-minute HR drop",
      interpretation: pickBand(recoveryIndex, recoveryBands).narrative,
      whyItMatters:
        "A faster post-session heart-rate drop usually means the system is resetting quickly after work.",
      discipline: "running",
      sourceSignals: ["1-minute HR drop", "2-minute HR drop"],
      bands: recoveryBands,
    },
  ];

  return metrics;
}

export function buildFutureMetricIdeas(): PerformanceMetricCard[] {
  return [
    {
      id: "mechanics-economy",
      title: "Mechanics economy layer",
      shortLabel: "future",
      unit: "score",
      value: 0,
      formula:
        "future composite from stride length, ground contact time, and vertical oscillation",
      interpretation:
        "This should turn raw form metrics into a single higher-is-better figure without asking users to decode each sensor independently.",
      whyItMatters:
        "Vertical oscillation and ground contact time are useful, but only if the app translates them into a directionally clear score.",
      discipline: "running",
      sourceSignals: [
        "stride length",
        "ground contact time",
        "vertical oscillation",
        "elevation-adjusted pace",
      ],
      bands: [
        {
          label: "Planned",
          minInclusive: 0,
          narrative: "This metric needs more validation before it should drive decisions.",
        },
      ],
    },
    {
      id: "jump-rope-stability",
      title: "Jump rope stability",
      shortLabel: "future",
      unit: "score",
      value: 0,
      formula: "future composite from cadence consistency, HR stability, and post-rope recovery",
      interpretation:
        "This should become a short-form movement quality and recovery screen once rope sessions are captured natively.",
      whyItMatters:
        "Jump rope can expose rhythm loss, fatigue, and recovery lag with very little time cost.",
      discipline: "jump-rope",
      sourceSignals: [
        "rope cadence consistency",
        "heart-rate stability",
        "post-rope HR drop",
      ],
      bands: [
        {
          label: "Planned",
          minInclusive: 0,
          narrative: "This metric needs jump-rope session capture before it can be scored.",
        },
      ],
    },
    {
      id: "elevation-adjusted-output",
      title: "Elevation-adjusted output",
      shortLabel: "future",
      unit: "score",
      value: 0,
      formula:
        "future score from power, pace, grade, and vertical gain to normalize hilly sessions",
      interpretation:
        "This should keep hillier runs comparable to flat runs without making the athlete mentally adjust every chart.",
      whyItMatters:
        "Power and pace are more useful when climbing load is translated into one comparable score.",
      discipline: "running",
      sourceSignals: ["average power", "pace", "elevation gain", "grade profile"],
      bands: [
        {
          label: "Planned",
          minInclusive: 0,
          narrative: "This metric needs route-grade awareness before it can be trusted.",
        },
      ],
    },
    {
      id: "cycling-economy",
      title: "Cycling economy layer",
      shortLabel: "future",
      unit: "score",
      value: 0,
      formula: "future power, HR, cadence, and decoupling ratios tuned for bike sessions",
      interpretation:
        "Cycling should reuse the same higher-is-better philosophy while staying bike-specific.",
      whyItMatters:
        "The same dashboard language should carry over to cycling without forcing athletes to relearn the system.",
      discipline: "cycling",
      sourceSignals: ["bike power", "bike heart rate", "bike cadence", "bike decoupling"],
      bands: [
        {
          label: "Planned",
          minInclusive: 0,
          narrative: "This metric needs cycling-specific signal capture before it can be scored.",
        },
      ],
    },
  ];
}
