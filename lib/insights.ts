// Pure calculations behind the history, records, workout-analysis and goals
// pages. Everything works from the per-run summaries COROS gives us (no GPS
// tracks or laps), so "best efforts" are run averages, not splits.

import { addDays, daysBetween, todayInJakarta } from "./aggregate";
import type { BodySnapshot, FitnessSnapshot, LoadSnapshot, RunActivity } from "./types";

// Runs shorter than this are warm-ups or false starts; they would win every
// "fastest pace" record without being a real effort.
export const MIN_RECORD_KM = 1;

const byDateAsc = (a: RunActivity, b: RunActivity) =>
  a.startTimestamp - b.startTimestamp || a.date.localeCompare(b.date);

function mondayOf(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------- history

export interface DayTotal {
  date: string;
  km: number;
  runs: number;
}

/** Every day of a month (yyyy-MM) with its total km and run count. */
export function monthCalendar(runs: RunActivity[], month: string): DayTotal[] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: DayTotal[] = [];
  for (let i = 0; i < length; i++) {
    const date = addDays(first, i);
    const onDay = runs.filter((r) => r.date === date);
    days.push({ date, km: sum(onDay.map((r) => r.distanceKm)), runs: onDay.length });
  }
  return days;
}

export interface PeriodTotal {
  key: string; // yyyy-MM or yyyy
  km: number;
  runs: number;
  seconds: number;
}

function totalsBy(runs: RunActivity[], keyOf: (r: RunActivity) => string): Map<string, PeriodTotal> {
  const totals = new Map<string, PeriodTotal>();
  for (const run of runs) {
    const key = keyOf(run);
    const t = totals.get(key) ?? { key, km: 0, runs: 0, seconds: 0 };
    t.km += run.distanceKm;
    t.runs += 1;
    t.seconds += run.durationSeconds;
    totals.set(key, t);
  }
  return totals;
}

/** The last `count` months up to and including `month`, oldest first, empty months included. */
export function monthlyTotals(runs: RunActivity[], month: string, count = 12): PeriodTotal[] {
  const totals = totalsBy(runs, (r) => r.date.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const out: PeriodTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push(totals.get(key) ?? { key, km: 0, runs: 0, seconds: 0 });
  }
  return out;
}

export function yearlyTotals(runs: RunActivity[]): PeriodTotal[] {
  return Array.from(totalsBy(runs, (r) => r.date.slice(0, 4)).values()).sort((a, b) =>
    b.key.localeCompare(a.key)
  );
}

export function lifetimeTotals(runs: RunActivity[]) {
  return {
    km: sum(runs.map((r) => r.distanceKm)),
    runs: runs.length,
    seconds: sum(runs.map((r) => r.durationSeconds)),
    firstDate: runs.length ? [...runs].sort(byDateAsc)[0].date : null,
  };
}

// ---------------------------------------------------------------- records

export interface RecordEntry {
  id: string;
  label: string;
  value: string;
  detail: string;
  date: string | null;
  labelId?: string;
}

export interface RecordFacts {
  longest: RunActivity | null;
  longestDuration: RunActivity | null;
  fastestPace: RunActivity | null;
  biggestWeek: { start: string; km: number; runs: number } | null;
  biggestMonth: PeriodTotal | null;
  mostRunsWeek: { start: string; km: number; runs: number } | null;
  longestStreak: { days: number; start: string; end: string } | null;
}

export function recordFacts(runs: RunActivity[]): RecordFacts {
  const real = runs.filter((r) => r.distanceKm >= MIN_RECORD_KM);
  const pick = (list: RunActivity[], better: (a: RunActivity, b: RunActivity) => boolean) =>
    list.reduce<RunActivity | null>((best, r) => (!best || better(r, best) ? r : best), null);

  const weeks = new Map<string, { start: string; km: number; runs: number }>();
  for (const run of runs) {
    const start = mondayOf(run.date);
    const w = weeks.get(start) ?? { start, km: 0, runs: 0 };
    w.km += run.distanceKm;
    w.runs += 1;
    weeks.set(start, w);
  }
  const weekList = Array.from(weeks.values());
  const months = Array.from(totalsBy(runs, (r) => r.date.slice(0, 7)).values());

  return {
    longest: pick(runs, (a, b) => a.distanceKm > b.distanceKm),
    longestDuration: pick(runs, (a, b) => a.durationSeconds > b.durationSeconds),
    fastestPace: pick(
      real.filter((r) => r.avgPaceSecPerKm !== null),
      (a, b) => a.avgPaceSecPerKm! < b.avgPaceSecPerKm!
    ),
    biggestWeek: weekList.reduce<typeof weekList[number] | null>((b, w) => (!b || w.km > b.km ? w : b), null),
    biggestMonth: months.reduce<PeriodTotal | null>((b, m) => (!b || m.km > b.km ? m : b), null),
    mostRunsWeek: weekList.reduce<typeof weekList[number] | null>(
      (b, w) => (!b || w.runs > b.runs || (w.runs === b.runs && w.km > b.km) ? w : b),
      null
    ),
    longestStreak: longestStreak(runs),
  };
}

/** Longest run of consecutive calendar days with at least one run. */
export function longestStreak(runs: RunActivity[]): { days: number; start: string; end: string } | null {
  const days = Array.from(new Set(runs.map((r) => r.date))).sort();
  if (!days.length) return null;
  let best = { days: 1, start: days[0], end: days[0] };
  let current = { days: 1, start: days[0], end: days[0] };
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) {
      current = { days: current.days + 1, start: current.start, end: days[i] };
    } else {
      current = { days: 1, start: days[i], end: days[i] };
    }
    if (current.days > best.days) best = current;
  }
  return best;
}

/** Current streak: consecutive days with a run ending today or yesterday. */
export function currentStreak(runs: RunActivity[], today = todayInJakarta()): number {
  const days = new Set(runs.map((r) => r.date));
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export type PrKind = "longest" | "fastest_pace" | "fastest_5k" | "fastest_10k";

export interface PrEvent {
  kind: PrKind;
  date: string;
  labelId: string;
  /** km for "longest", seconds per km for the pace records */
  value: number;
  /** The previous best it beat, if any */
  previous: number | null;
}

const PR_RULES: { kind: PrKind; minKm: number; metric: (r: RunActivity) => number | null; higherIsBetter: boolean }[] = [
  { kind: "longest", minKm: 0, metric: (r) => r.distanceKm, higherIsBetter: true },
  { kind: "fastest_pace", minKm: MIN_RECORD_KM, metric: (r) => r.avgPaceSecPerKm, higherIsBetter: false },
  // GPS distance often lands slightly short of the nominal distance.
  { kind: "fastest_5k", minKm: 5 * 0.98, metric: (r) => r.avgPaceSecPerKm, higherIsBetter: false },
  { kind: "fastest_10k", minKm: 10 * 0.98, metric: (r) => r.avgPaceSecPerKm, higherIsBetter: false },
];

/** Every run that set a new personal best at the time it was run, oldest first. */
export function prTimeline(runs: RunActivity[]): PrEvent[] {
  const events: PrEvent[] = [];
  const best = new Map<PrKind, number>();
  for (const run of [...runs].sort(byDateAsc)) {
    for (const rule of PR_RULES) {
      const value = rule.metric(run);
      if (value === null || run.distanceKm < rule.minKm) continue;
      const previous = best.get(rule.kind) ?? null;
      const beats = previous === null || (rule.higherIsBetter ? value > previous : value < previous);
      if (!beats) continue;
      best.set(rule.kind, value);
      events.push({ kind: rule.kind, date: run.date, labelId: run.labelId, value, previous });
    }
  }
  return events;
}

// ------------------------------------------------------- workout analysis

/** Meters covered per heartbeat: higher means more speed for the same effort. */
export function efficiency(run: RunActivity): number | null {
  if (!run.avgPaceSecPerKm || !run.avgHeartRate) return null;
  const metersPerMinute = (1000 / run.avgPaceSecPerKm) * 60;
  return metersPerMinute / run.avgHeartRate;
}

export type Effort = "ringan" | "sedang" | "berat";

export interface WorkoutInsights {
  run: RunActivity;
  /** Averages of the runs in the 30 days before this one */
  baseline: { runs: number; paceSec: number | null; hr: number | null; km: number | null };
  paceDeltaSec: number | null; // negative = faster than baseline
  hrDelta: number | null;
  efficiency: number | null;
  efficiencyBaseline: number | null;
  /** Among runs within ±25% of this distance, 1 = fastest */
  similar: { rank: number; count: number; bestPaceSec: number | null } | null;
  /** Where this run's average HR falls among all your runs */
  effort: { level: Effort; percentile: number } | null;
  prs: PrEvent[];
  load: LoadSnapshot | null;
  body: BodySnapshot | null;
  fitness: FitnessSnapshot | null;
}

function average(values: (number | null)[]): number | null {
  const clean = values.filter((v): v is number => v !== null);
  return clean.length ? sum(clean) / clean.length : null;
}

export function analyzeWorkout(
  run: RunActivity,
  runs: RunActivity[],
  context: { load: LoadSnapshot[]; body: BodySnapshot[]; fitness: FitnessSnapshot[] }
): WorkoutInsights {
  const before = runs.filter(
    (r) =>
      r.labelId !== run.labelId &&
      r.distanceKm >= MIN_RECORD_KM &&
      r.date < run.date &&
      daysBetween(r.date, run.date) <= 30
  );
  const baseline = {
    runs: before.length,
    paceSec: average(before.map((r) => r.avgPaceSecPerKm)),
    hr: average(before.map((r) => r.avgHeartRate)),
    km: before.length ? sum(before.map((r) => r.distanceKm)) / before.length : null,
  };

  const similarRuns = runs.filter(
    (r) =>
      r.avgPaceSecPerKm !== null &&
      r.distanceKm >= MIN_RECORD_KM &&
      Math.abs(r.distanceKm - run.distanceKm) <= run.distanceKm * 0.25
  );
  let similar: WorkoutInsights["similar"] = null;
  if (run.avgPaceSecPerKm !== null && run.distanceKm >= MIN_RECORD_KM && similarRuns.length > 1) {
    const paces = similarRuns.map((r) => r.avgPaceSecPerKm!).sort((a, b) => a - b);
    similar = {
      rank: paces.filter((p) => p < run.avgPaceSecPerKm!).length + 1,
      count: paces.length,
      bestPaceSec: paces[0],
    };
  }

  const hrs = runs.map((r) => r.avgHeartRate).filter((h): h is number => h !== null);
  let effort: WorkoutInsights["effort"] = null;
  if (run.avgHeartRate !== null && hrs.length >= 5) {
    const percentile = Math.round((hrs.filter((h) => h < run.avgHeartRate!).length / hrs.length) * 100);
    effort = { level: percentile >= 67 ? "berat" : percentile >= 33 ? "sedang" : "ringan", percentile };
  }

  const ownEfficiency = efficiency(run);
  const efficiencyBaseline = average(before.map(efficiency));

  const latestOnOrBefore = <T extends { date: string }>(list: T[]) =>
    [...list].reverse().find((s) => s.date <= run.date) ?? null;

  return {
    run,
    baseline,
    paceDeltaSec:
      run.avgPaceSecPerKm !== null && baseline.paceSec !== null ? run.avgPaceSecPerKm - baseline.paceSec : null,
    hrDelta: run.avgHeartRate !== null && baseline.hr !== null ? run.avgHeartRate - baseline.hr : null,
    efficiency: ownEfficiency,
    efficiencyBaseline,
    similar,
    effort,
    prs: prTimeline(runs).filter((e) => e.labelId === run.labelId),
    load: context.load.find((s) => s.date === run.date) ?? null,
    body: context.body.find((s) => s.date === run.date) ?? null,
    fitness: latestOnOrBefore(context.fitness),
  };
}

/** One point per run (≥ 1 km with HR), oldest first, for the efficiency trend. */
export function efficiencySeries(runs: RunActivity[]): { x: string; y: number | null }[] {
  return [...runs]
    .sort(byDateAsc)
    .filter((r) => r.distanceKm >= MIN_RECORD_KM)
    .map((r) => {
      const e = efficiency(r);
      return { x: r.date, y: e === null ? null : Math.round(e * 100) / 100 };
    });
}

// ---------------------------------------------------------------- goals

export type GoalKind = "weekly_km" | "monthly_km" | "yearly_km" | "weekly_runs" | "race";

export interface Goal {
  id: string;
  kind: GoalKind;
  /** km for distance goals and races, run count for weekly_runs */
  target: number;
  /** race only */
  targetSeconds?: number;
  raceDate?: string;
  name?: string;
  createdAt: string;
}

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  weekly_km: "Jarak mingguan",
  monthly_km: "Jarak bulanan",
  yearly_km: "Jarak tahunan",
  weekly_runs: "Jumlah lari per minggu",
  race: "Target race",
};

export type GoalStatus = "tercapai" | "sesuai_jadwal" | "tertinggal";

export interface PeriodGoalProgress {
  type: "period";
  goal: Goal;
  periodLabel: string;
  start: string;
  end: string;
  actual: number;
  /** What you would have by today if spread evenly over the period */
  expected: number;
  daysLeft: number;
  /** km (or runs) per remaining day needed to hit the target */
  perDayNeeded: number;
  status: GoalStatus;
}

export interface RaceGoalProgress {
  type: "race";
  goal: Goal;
  daysLeft: number;
  requiredPaceSec: number;
  /** Riegel estimate from your best recent run */
  predictedSeconds: number | null;
  predictedFrom: RunActivity | null;
  longestRecentKm: number;
  status: GoalStatus;
}

export type GoalProgress = PeriodGoalProgress | RaceGoalProgress;

function period(kind: Exclude<GoalKind, "race">, today: string): { start: string; end: string; label: string } {
  if (kind === "weekly_km" || kind === "weekly_runs") {
    const start = mondayOf(today);
    return { start, end: addDays(start, 6), label: "minggu ini" };
  }
  if (kind === "monthly_km") {
    const start = `${today.slice(0, 7)}-01`;
    const [y, m] = today.split("-").map(Number);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { start, end, label: "bulan ini" };
  }
  return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31`, label: "tahun ini" };
}

/** Riegel's endurance formula: T2 = T1 × (D2 / D1)^1.06. */
export function riegel(seconds: number, fromKm: number, toKm: number): number {
  return seconds * Math.pow(toKm / fromKm, 1.06);
}

export function goalProgress(goal: Goal, runs: RunActivity[], today = todayInJakarta()): GoalProgress {
  if (goal.kind === "race") {
    const recent = runs.filter(
      (r) => r.distanceKm >= 3 && r.avgPaceSecPerKm !== null && daysBetween(r.date, today) <= 60
    );
    // The run that predicts the fastest race time is the best basis.
    let predictedSeconds: number | null = null;
    let predictedFrom: RunActivity | null = null;
    for (const r of recent) {
      const t = riegel(r.avgPaceSecPerKm! * r.distanceKm, r.distanceKm, goal.target);
      if (predictedSeconds === null || t < predictedSeconds) {
        predictedSeconds = t;
        predictedFrom = r;
      }
    }
    const targetSeconds = goal.targetSeconds ?? 0;
    const daysLeft = goal.raceDate ? daysBetween(today, goal.raceDate) : 0;
    const status: GoalStatus =
      predictedSeconds !== null && predictedSeconds <= targetSeconds
        ? "tercapai"
        : predictedSeconds !== null && predictedSeconds <= targetSeconds * 1.05
        ? "sesuai_jadwal"
        : "tertinggal";
    return {
      type: "race",
      goal,
      daysLeft,
      requiredPaceSec: targetSeconds / goal.target,
      predictedSeconds,
      predictedFrom,
      longestRecentKm: Math.max(0, ...runs.filter((r) => daysBetween(r.date, today) <= 60).map((r) => r.distanceKm)),
      status,
    };
  }

  const { start, end, label } = period(goal.kind, today);
  const inPeriod = runs.filter((r) => r.date >= start && r.date <= end);
  const actual = goal.kind === "weekly_runs" ? inPeriod.length : sum(inPeriod.map((r) => r.distanceKm));
  const totalDays = daysBetween(start, end) + 1;
  const elapsedDays = daysBetween(start, today) + 1; // today counts as available
  const daysLeft = Math.max(totalDays - elapsedDays + 1, 1);
  const expected = (goal.target * (elapsedDays - 1)) / totalDays; // by the start of today
  const remaining = Math.max(goal.target - actual, 0);
  const status: GoalStatus =
    actual >= goal.target ? "tercapai" : actual >= expected * 0.9 ? "sesuai_jadwal" : "tertinggal";

  return {
    type: "period",
    goal,
    periodLabel: label,
    start,
    end,
    actual: goal.kind === "weekly_runs" ? actual : round1(actual),
    expected: round1(expected),
    daysLeft,
    perDayNeeded: remaining / daysLeft,
    status,
  };
}

// ---------------------------------------------------------------- routes

export type RouteShape = "oneway" | "loop" | "outback";

export const ROUTE_SHAPE_LABEL: Record<RouteShape, string> = {
  oneway: "Satu arah",
  loop: "Loop ke titik awal",
  outback: "Pulang-pergi",
};

export interface SavedRoute {
  id: string;
  name: string;
  /** [lat, lng] pairs in drawing order */
  points: [number, number][];
  shape: RouteShape;
  /** One full lap, including the way back for loop and out-and-back */
  distanceKm: number;
  createdAt: string;
}

/** Great-circle distance in km between two [lat, lng] points. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function routeDistanceKm(points: [number, number][], shape: RouteShape): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  if (shape === "outback") return km * 2;
  if (shape === "loop" && points.length > 2) km += haversineKm(points[points.length - 1], points[0]);
  return km;
}

export interface RouteSuggestion {
  route: SavedRoute;
  laps: number;
  totalKm: number;
  /** total minus target, km */
  diffKm: number;
  estimatedSeconds: number | null;
}

/**
 * Saved routes ranked by how close a whole number of laps comes to the
 * target distance.
 */
export function suggestRoutes(
  routes: SavedRoute[],
  targetKm: number,
  paceSecPerKm: number | null,
  limit = 3
): RouteSuggestion[] {
  return routes
    .filter((r) => r.distanceKm > 0.1)
    .map((route) => {
      const laps = Math.max(1, Math.round(targetKm / route.distanceKm));
      const totalKm = laps * route.distanceKm;
      return {
        route,
        laps,
        totalKm,
        diffKm: totalKm - targetKm,
        estimatedSeconds: paceSecPerKm ? totalKm * paceSecPerKm : null,
      };
    })
    .sort((a, b) => Math.abs(a.diffKm) - Math.abs(b.diffKm) || a.laps - b.laps)
    .slice(0, limit);
}
