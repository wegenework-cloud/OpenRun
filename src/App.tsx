import { useEffect, useState } from "react";
import {
  activities,
  athlete,
  checkIns,
  defaultWorkspaceState,
  goals,
  importOptions,
  integrations,
  insights,
  meals,
  networkRules,
  pillars,
  privacyControls,
  trainingPlanWeeks,
} from "./data/mockData";
import { loadLocalWorkspaceState, saveLocalWorkspaceState } from "./lib/localState";
import type {
  DeliveryStatus,
  GoalStatus,
  ImportSource,
  InsightLevel,
  LocalWorkspaceState,
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

  if (injuryText.includes("calf") || injuryText.includes("pain")) {
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

function App() {
  const [workspace, setWorkspace] = useState<LocalWorkspaceState>(() =>
    loadLocalWorkspaceState(defaultWorkspaceState),
  );

  useEffect(() => {
    saveLocalWorkspaceState(workspace);
  }, [workspace]);

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.proteinGrams, 0);
  const totalHydrationMl = meals.reduce((sum, meal) => sum + meal.hydrationMl, 0);
  const selectedPlanWeek =
    trainingPlanWeeks.find((week) => week.week === workspace.selectedPlanWeek) ??
    trainingPlanWeeks[0];
  const coachNudge = buildCoachNudge(workspace, selectedPlanWeek);

  return (
    <div className="shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Open-source training intelligence</p>
          <h1>
            OpenRun turns fragmented health data into an AI coach people can
            actually use.
          </h1>
          <p className="hero-text">
            Import workouts from files and devices, log food, water, pain,
            emotions, and consistency, then convert that signal into explainable
            insights and next actions while keeping the user's core data on
            their own device.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#dashboard">
              View MVP dashboard
            </a>
            <a className="button button-secondary" href="#architecture">
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
                {athlete.weeklyCompletedSessions}/{athlete.weeklyActivityTarget}
              </strong>
              <small>completed this week</small>
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
              <h2>Bring data in from wherever the athlete already lives</h2>
            </div>
            <span className="chip">source normalization</span>
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
                    setWorkspace((current) => ({
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
                    setWorkspace((current) => ({
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
                  setWorkspace((current) => ({
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
                  setWorkspace((current) => ({
                    ...current,
                    aiNudgesEnabled: event.target.checked,
                  }))
                }
              />
              <span>Allow daily AI nudges on this device</span>
            </label>
          </div>

          <p className="helper-text">
            This prototype persists the editable workspace in browser storage.
            The product architecture moves larger local datasets and raw files
            into IndexedDB or OPFS next.
          </p>
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
              <h2>Progress should stay tied to actual blockers</h2>
            </div>
          </div>

          <div className="stack">
            {goals.map((goal) => (
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
              <h2>Combine nutrition, hydration, and recovery context</h2>
            </div>
          </div>

          <div className="macro-strip">
            <article>
              <span>Calories</span>
              <strong>{totalCalories}</strong>
            </article>
            <article>
              <span>Protein</span>
              <strong>{totalProtein}g</strong>
            </article>
            <article>
              <span>Hydration</span>
              <strong>{totalHydrationMl}ml</strong>
            </article>
          </div>

          <div className="stack">
            {meals.map((meal) => (
              <article className="event-card" key={`${meal.time}-${meal.label}`}>
                <div className="event-row">
                  <strong>{meal.label}</strong>
                  <span>{meal.time}</span>
                </div>
                <p>
                  {meal.calories} kcal, {meal.proteinGrams}g protein,{" "}
                  {meal.hydrationMl}ml fluids
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Integrations</p>
              <h2>Meet athletes where they already track their data</h2>
            </div>
            <span className="chip">local-first import stack</span>
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
              <h2>Import a plan PDF and adapt it instead of just displaying it</h2>
            </div>
            <select
              className="select-input"
              value={workspace.selectedPlanWeek}
              onChange={(event) =>
                setWorkspace((current) => ({
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
                This is the behavior you described: not just logging the plan,
                but nudging the athlete when hydration, pain, or recovery makes
                the original schedule a bad idea.
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

          <div className="stack">
            {checkIns.map((entry) => (
              <article className="journal-card" key={entry.date}>
                <div className="event-row">
                  <strong>{entry.date}</strong>
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
              </article>
            ))}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Recent activity stream</p>
              <h2>Normalize training data into one timeline</h2>
            </div>
            <span className="chip">canonical activity schema</span>
          </div>

          <div className="activity-table">
            {activities.map((activity) => (
              <article className="activity-row" key={activity.id}>
                <div>
                  <strong>{activity.title}</strong>
                  <p>
                    {activity.type} · {activity.date} · {sourceLabel[activity.source]}
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
                <p>{activity.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">AI coach surface</p>
              <h2>Recommendations need evidence, not vague encouragement</h2>
            </div>
          </div>

          <div className="insight-grid">
            {insights.map((insight) => (
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

        <section id="architecture" className="card card-wide">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Product pillars</p>
              <h2>What makes OpenRun different from a workout-only tracker</h2>
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
