// Reads the dashboard's committed JSON data (as of the last deploy) and
// merges in freshly-fetched COROS data, deduping so the cron job can run
// often without producing duplicate entries or needless commits.

import { readFile } from "fs/promises";
import path from "path";
import type {
  RunActivity,
  FitnessSnapshot,
  LoadSnapshot,
  BodySnapshot,
} from "./types";
import { parseRecommendation, type Recommendation } from "./coach";

const DATA_DIR = path.join(process.cwd(), "data");

export interface RecommendationFile {
  recommendation: Recommendation | null;
  /** Validation errors when the AI-written file is malformed */
  errors: string[];
}

export async function readRecommendation(): Promise<RecommendationFile> {
  let raw: string;
  try {
    raw = await readFile(path.join(DATA_DIR, "recommendation.json"), "utf-8");
  } catch {
    return { recommendation: null, errors: [] }; // routine hasn't run yet
  }
  try {
    const parsed = parseRecommendation(JSON.parse(raw));
    return parsed.ok
      ? { recommendation: parsed.value, errors: [] }
      : { recommendation: null, errors: parsed.errors };
  } catch {
    return { recommendation: null, errors: ["recommendation.json bukan JSON yang valid"] };
  }
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readRuns(): Promise<RunActivity[]> {
  return readJson<RunActivity[]>("runs.json", []);
}

export async function readFitnessHistory(): Promise<FitnessSnapshot[]> {
  return readJson<FitnessSnapshot[]>("fitness.json", []);
}

export async function readLoadHistory(): Promise<LoadSnapshot[]> {
  return readJson<LoadSnapshot[]>("training-load.json", []);
}

export async function readBodyHistory(): Promise<BodySnapshot[]> {
  return readJson<BodySnapshot[]>("body-condition.json", []);
}

/** Merge new runs in by labelId, newest first. Returns { merged, addedCount }. */
export function mergeRuns(
  existing: RunActivity[],
  incoming: RunActivity[]
): { merged: RunActivity[]; addedCount: number } {
  const byId = new Map(existing.map((r) => [r.labelId, r]));
  let added = 0;
  for (const run of incoming) {
    if (!byId.has(run.labelId)) added++;
    byId.set(run.labelId, run); // incoming wins on conflict (fresher data)
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => b.startTimestamp - a.startTimestamp
  );
  return { merged, addedCount: added };
}

/** Merge daily snapshots (fitness/load/body) by date, one entry per day. */
function mergeByDate<T extends { date: string }>(
  existing: T[],
  incoming: T[]
): { merged: T[]; addedCount: number } {
  const byDate = new Map(existing.map((s) => [s.date, s]));
  let added = 0;
  for (const snap of incoming) {
    if (!byDate.has(snap.date)) added++;
    byDate.set(snap.date, snap);
  }
  const merged = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  return { merged, addedCount: added };
}

export const mergeFitnessSnapshots = mergeByDate<FitnessSnapshot>;
export const mergeLoadSnapshots = mergeByDate<LoadSnapshot>;
export const mergeBodySnapshots = mergeByDate<BodySnapshot>;
