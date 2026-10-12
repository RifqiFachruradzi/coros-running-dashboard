// Parsers for COROS MCP tool output.
//
// IMPORTANT: the Coros tools observed in this project (via Claude's Coros
// connector) return pre-formatted, human-readable TEXT blocks — not JSON —
// e.g. querySportRecords returns:
//
//   Sport Records — 2025-06-01 to 2026-09-15 (6 records)
//   ========================
//
//   1. Outdoor Run — 2026-09-13
//      Location: East Jakarta Run
//      ...
//      Duration: 45:31 | Distance: 5.04 km
//      Average Pace: 9:02 /km | Avg HR: 139 bpm | Calories: 374 kcal
//      LabelId: 480300327464108238 | SportType: 100
//
// The parsers below are written against that exact observed format for
// querySportRecords, queryFitnessAssessmentOverview and
// queryTrainingLoadAssessment, and parseBodyHistory against the observed
// output of queryRestingHeartRate, querySleepOverview and queryStressLevel.

import type { RunActivity, FitnessSnapshot, LoadSnapshot, BodySnapshot } from "./types";

function toSeconds(mmss: string): number | null {
  const parts = mmss.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function parseSportRecords(raw: string): RunActivity[] {
  const entries = raw.split(/\n(?=\d+\.\s)/g).filter((e) => /^\d+\./.test(e.trim()));
  const activities: RunActivity[] = [];

  for (const entry of entries) {
    const dateMatch = entry.match(/—\s*(\d{4}-\d{2}-\d{2})/);
    const locationMatch = entry.match(/Location:\s*(.+)/);
    const timestampMatch = entry.match(/startTimestamp=(\d+)/);
    const durationMatch = entry.match(/Duration:\s*([\d:]+)/);
    // Runs under 1 km are listed in meters ("Distance: 432 m").
    const distanceMatch = entry.match(/Distance:\s*([\d.]+)\s*(km|m)\b/);
    const paceMatch = entry.match(/Average Pace:\s*([\d:]+)\s*\/km/);
    const hrMatch = entry.match(/Avg HR:\s*(\d+)\s*bpm/);
    const caloriesMatch = entry.match(/Calories:\s*(\d+)\s*kcal/);
    const labelIdMatch = entry.match(/LabelId:\s*(\d+)/);
    const sportTypeMatch = entry.match(/SportType:\s*(\d+)/);

    if (!labelIdMatch || !dateMatch) continue;

    activities.push({
      labelId: labelIdMatch[1],
      sportType: sportTypeMatch ? Number(sportTypeMatch[1]) : 100,
      date: dateMatch[1],
      startTimestamp: timestampMatch ? Number(timestampMatch[1]) : 0,
      location: locationMatch ? locationMatch[1].trim() : null,
      durationSeconds: durationMatch ? toSeconds(durationMatch[1]) ?? 0 : 0,
      distanceKm: distanceMatch
        ? Number(distanceMatch[1]) / (distanceMatch[2] === "m" ? 1000 : 1)
        : 0,
      avgPaceSecPerKm: paceMatch ? toSeconds(paceMatch[1]) : null,
      avgHeartRate: hrMatch ? Number(hrMatch[1]) : null,
      calories: caloriesMatch ? Number(caloriesMatch[1]) : null,
    });
  }

  return activities;
}

export function parseFitnessAssessment(
  raw: string,
  snapshotDate: string
): FitnessSnapshot {
  const vo2Match = raw.match(/VO2max:\s*(\d+)/);
  const levelMatch = raw.match(/Running Level:\s*(\d+)/);
  const thresholdMatch = raw.match(/Threshold Pace:\s*([\d:]+)\s*\/km/);
  const fiveKMatch = raw.match(/5 ?km Prediction:\s*([\d:]+)/i);
  const tenKMatch = raw.match(/10 ?km Prediction:\s*([\d:]+)/i);
  const halfMatch = raw.match(/Half Marathon Prediction:\s*([\d:]+)/i);
  const fullMatch = raw.match(/Marathon Prediction:\s*([\d:]+)/i);

  return {
    date: snapshotDate,
    vo2max: vo2Match ? Number(vo2Match[1]) : null,
    runningLevel: levelMatch ? Number(levelMatch[1]) : null,
    thresholdPaceSecPerKm: thresholdMatch ? toSeconds(thresholdMatch[1]) : null,
    predictions: {
      fiveKmSeconds: fiveKMatch ? toSeconds(fiveKMatch[1]) : null,
      tenKmSeconds: tenKMatch ? toSeconds(tenKMatch[1]) : null,
      halfMarathonSeconds: halfMatch ? toSeconds(halfMatch[1]) : null,
      marathonSeconds: fullMatch ? toSeconds(fullMatch[1]) : null,
    },
  };
}

export function parseTrainingLoad(raw: string): LoadSnapshot[] {
  // Each day is a blank-line-separated block starting with a yyyy-MM-dd line.
  const blocks = raw.split(/\n(?=\d{4}-\d{2}-\d{2}\n)/g);
  const snapshots: LoadSnapshot[] = [];

  for (const block of blocks) {
    const dateMatch = block.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const commentMatch = block.match(/Comment:\s*(.+)/);
    const shortMatch = block.match(/Short-Term Load:\s*(\d+)/);
    const longMatch = block.match(/Long-Term Load:\s*(\d+)/);
    const ratioMatch = block.match(/Load Ratio:\s*([\d.]+)/);

    snapshots.push({
      date: dateMatch[1],
      comment: commentMatch ? commentMatch[1].trim() : null,
      shortTermLoad: shortMatch ? Number(shortMatch[1]) : null,
      longTermLoad: longMatch ? Number(longMatch[1]) : null,
      loadRatio: ratioMatch ? Number(ratioMatch[1]) : null,
    });
  }

  return snapshots;
}

/** Best-effort — not verified against live output. See module header. */
// The three body-condition tools each return one entry per day (dates in the
// user's COROS timezone), observed formats:
//   queryRestingHeartRate  "2026-10-12: 58 bpm" / "2026-10-11: No data"
//   queryStressLevel       "2026-10-12:\nAverage Stress: 15 (Relaxed)"
//   querySleepOverview     "2026-10-12\nSleep Score: 93\n...Main Sleep (asleep): 7h 19min"
// Pass null for a tool that failed; its fields stay null.
export function parseBodyHistory(params: {
  restingHrRaw: string | null;
  sleepRaw: string | null;
  stressRaw: string | null;
}): BodySnapshot[] {
  const byDate = new Map<string, BodySnapshot>();
  const day = (date: string) => {
    let snap = byDate.get(date);
    if (!snap) {
      snap = {
        date,
        restingHeartRate: null,
        sleepScore: null,
        sleepDurationMinutes: null,
        stressLevel: null,
      };
      byDate.set(date, snap);
    }
    return snap;
  };

  for (const m of (params.restingHrRaw ?? "").matchAll(/(\d{4}-\d{2}-\d{2}):\s*(\d+)\s*bpm/g)) {
    day(m[1]).restingHeartRate = Number(m[2]);
  }

  for (const m of (params.stressRaw ?? "").matchAll(
    /(\d{4}-\d{2}-\d{2}):\s*\n\s*Average Stress:\s*(\d+)/g
  )) {
    day(m[1]).stressLevel = Number(m[2]);
  }

  // Split on the date lines that start each night's block.
  const sleepBlocks = (params.sleepRaw ?? "").split(/^(?=\d{4}-\d{2}-\d{2}\s*$)/m);
  for (const block of sleepBlocks) {
    const date = block.match(/^(\d{4}-\d{2}-\d{2})\s*$/m)?.[1];
    if (!date) continue;
    // A score of 0 means COROS has no sleep detail for that night yet.
    const score = Number(block.match(/Sleep Score:\s*(\d+)/i)?.[1] ?? 0);
    if (score > 0) day(date).sleepScore = score;
    const duration = block.match(/Main Sleep \(asleep\):\s*(?:(\d+)h)?\s*(?:(\d+)\s*min)?/i);
    if (duration && (duration[1] || duration[2])) {
      day(date).sleepDurationMinutes = Number(duration[1] ?? 0) * 60 + Number(duration[2] ?? 0);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
