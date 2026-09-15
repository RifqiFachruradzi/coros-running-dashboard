import { startOfWeek, format } from "date-fns";
import type { RunActivity } from "./types";

export function weeklyVolume(
  runs: RunActivity[],
  weeks = 8
): { week: string; km: number }[] {
  const byWeek = new Map<string, number>();
  for (const run of runs) {
    const weekStart = format(
      startOfWeek(new Date(run.date), { weekStartsOn: 1 }),
      "dd/MM"
    );
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + run.distanceKm);
  }
  return Array.from(byWeek.entries())
    .map(([week, km]) => ({ week, km: Math.round(km * 10) / 10 }))
    .slice(-weeks);
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
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
