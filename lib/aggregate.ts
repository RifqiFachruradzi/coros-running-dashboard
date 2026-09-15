import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { RunActivity } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Run dates are local calendar days (yyyy-MM-dd). Doing week math on them as
// UTC midnights gives the same answer on a WIB laptop and a UTC server.
function dayToUtcMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return utcMsToDay(dayToUtcMs(day) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / DAY_MS);
}

function mondayOf(day: string): number {
  const ms = dayToUtcMs(day);
  const daysSinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return ms - daysSinceMonday * DAY_MS;
}

/** Today's calendar date in Jakarta, whatever timezone the server runs in. */
export function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

/** Total km per Monday-started week, oldest first, including empty weeks. */
export function weeklyVolume(
  runs: RunActivity[],
  weeks = 8,
  today = todayInJakarta()
): { week: string; km: number }[] {
  const firstMonday = mondayOf(today) - (weeks - 1) * WEEK_MS;
  const totals = new Array<number>(weeks).fill(0);

  for (const run of runs) {
    const index = (mondayOf(run.date) - firstMonday) / WEEK_MS;
    if (index >= 0 && index < weeks) totals[index] += run.distanceKm;
  }

  return totals.map((km, i) => {
    const [, month, day] = utcMsToDay(firstMonday + i * WEEK_MS).split("-");
    return { week: `${day}/${month}`, km: Math.round(km * 10) / 10 };
  });
}

export interface WeekProgress {
  km: number;
  targetKm: number;
  /** Days left in the week, counting today (Sunday = 1). */
  daysLeft: number;
  weekStart: string; // yyyy-MM-dd (Monday)
}

export function weekProgress(
  runs: RunActivity[],
  targetKm: number,
  today = todayInJakarta()
): WeekProgress {
  const monday = mondayOf(today);
  const km = runs
    .filter((r) => dayToUtcMs(r.date) >= monday)
    .reduce((sum, r) => sum + r.distanceKm, 0);
  const daysLeft = 7 - Math.round((dayToUtcMs(today) - monday) / DAY_MS);

  return { km, targetKm, daysLeft, weekStart: utcMsToDay(monday) };
}

const RECORD_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half marathon", km: 21.0975 },
];

export interface DistanceRecord {
  label: string;
  seconds: number | null;
  paceSecPerKm: number | null;
  date: string | null;
}

/**
 * COROS only gives us per-run averages (no best-effort splits), so a "fastest
 * 5K" is the best average pace among runs at least 5 km long, times 5 km.
 */
export function personalRecords(runs: RunActivity[]): {
  longest: RunActivity | null;
  fastest: DistanceRecord[];
} {
  const longest = runs.reduce<RunActivity | null>(
    (best, r) => (!best || r.distanceKm > best.distanceKm ? r : best),
    null
  );

  const fastest = RECORD_DISTANCES.map(({ label, km }) => {
    let best: { pace: number; date: string } | null = null;
    for (const run of runs) {
      // GPS distance often lands slightly short of the nominal distance.
      if (run.avgPaceSecPerKm === null || run.distanceKm < km * 0.98) continue;
      if (!best || run.avgPaceSecPerKm < best.pace) {
        best = { pace: run.avgPaceSecPerKm, date: run.date };
      }
    }
    return {
      label,
      seconds: best ? Math.round(best.pace * km) : null,
      paceSecPerKm: best?.pace ?? null,
      date: best?.date ?? null,
    };
  });

  return { longest, fastest };
}

export function summarize(runs: RunActivity[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const inWindow = runs.filter((r) => r.startTimestamp * 1000 >= cutoff);
  const totalKm = inWindow.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalRuns = inWindow.length;
  const paces = inWindow
    .map((r) => r.avgPaceSecPerKm)
    .filter((p): p is number => p !== null);
  const avgPace =
    paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;

  return { totalKm, totalRuns, avgPace };
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null) return "—";
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "2026-09-13" → "13 Sep 2026" */
export function formatDay(day: string): string {
  return format(new Date(`${day}T00:00:00`), "d MMM yyyy", { locale: id });
}

/** "2026-09-13" → "13 Sep" (axis ticks) */
export function formatShortDay(day: string): string {
  return format(new Date(`${day}T00:00:00`), "d MMM", { locale: id });
}

/** "2026-09-13" → "Min" */
export function formatWeekdayShort(day: string): string {
  return format(new Date(`${day}T00:00:00`), "EEE", { locale: id });
}
