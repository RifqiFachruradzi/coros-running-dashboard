// Called by Vercel Cron (see vercel.json) — and safe to hit manually while
// testing. Pulls the latest COROS data, merges it into the committed JSON
// under /data, and pushes a commit to GitHub only when something actually
// changed (so redeploys track real new data, not empty polls).

import { NextRequest, NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { callCorosTool } from "@/lib/coros-mcp-client";
import {
  parseSportRecords,
  parseFitnessAssessment,
  parseTrainingLoad,
  parseBodyCondition,
} from "@/lib/coros-parsers";
import {
  readRuns,
  readFitnessHistory,
  readLoadHistory,
  readBodyHistory,
  mergeRuns,
  mergeFitnessSnapshots,
  mergeLoadSnapshots,
  mergeBodySnapshots,
} from "@/lib/data-store";
import { commitDataFiles } from "@/lib/github";
import type { SyncResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RUNNING_SPORT_CODES = [100, 101, 102, 103, 104];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured — allow (dev/local only)
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const todayCompact = format(new Date(), "yyyyMMdd");
  const twoWeeksAgoCompact = format(subDays(new Date(), 14), "yyyyMMdd");

  const result: SyncResult = {
    syncedAt: new Date().toISOString(),
    newActivities: 0,
    newSnapshots: 0,
    committed: false,
  };

  try {
    const [
      sportRecordsRaw,
      fitnessRaw,
      loadRaw,
      restingHrRaw,
      sleepRaw,
      stressRaw,
    ] = await Promise.all([
      callCorosTool<string>("querySportRecords", {
        startDate: twoWeeksAgoCompact,
        endDate: todayCompact,
        sportTypeCodes: RUNNING_SPORT_CODES,
        minDistanceKm: null,
        maxDistanceKm: null,
        minDurationMinutes: null,
        maxDurationMinutes: null,
        maxAveragePace: null,
        locationKeyword: null,
        limit: 50,
      }),
      callCorosTool<string>("queryFitnessAssessmentOverview", {}),
      callCorosTool<string>("queryTrainingLoadAssessment", { days: 30 }),
      callCorosTool<string>("queryRestingHeartRate", { days: 14 }),
      callCorosTool<string>("querySleepData", {
        days: 14,
        startDate: null,
        endDate: null,
      }),
      callCorosTool<string>("queryStressLevel", { days: 14 }),
    ]);

    const newRuns = parseSportRecords(sportRecordsRaw);
    const newFitnessSnapshot = parseFitnessAssessment(fitnessRaw, today);
    const newLoadSnapshots = parseTrainingLoad(loadRaw);
    const newBodySnapshot = parseBodyCondition({
      restingHrRaw,
      sleepRaw,
      stressRaw,
      date: today,
    });

    const [existingRuns, existingFitness, existingLoad, existingBody] =
      await Promise.all([
        readRuns(),
        readFitnessHistory(),
        readLoadHistory(),
        readBodyHistory(),
      ]);

    const runsMerge = mergeRuns(existingRuns, newRuns);
    const fitnessMerge = mergeFitnessSnapshots(existingFitness, [newFitnessSnapshot]);
    const loadMerge = mergeLoadSnapshots(existingLoad, newLoadSnapshots);
    const bodyMerge = mergeBodySnapshots(existingBody, [newBodySnapshot]);

    result.newActivities = runsMerge.addedCount;
    result.newSnapshots =
      fitnessMerge.addedCount + loadMerge.addedCount + bodyMerge.addedCount;

    const hasChanges =
      runsMerge.addedCount > 0 ||
      fitnessMerge.addedCount > 0 ||
      loadMerge.addedCount > 0 ||
      bodyMerge.addedCount > 0;

    if (hasChanges) {
      const committed = await commitDataFiles(
        [
          { path: "data/runs.json", content: JSON.stringify(runsMerge.merged, null, 2) },
          {
            path: "data/fitness.json",
            content: JSON.stringify(fitnessMerge.merged, null, 2),
          },
          {
            path: "data/training-load.json",
            content: JSON.stringify(loadMerge.merged, null, 2),
          },
          {
            path: "data/body-condition.json",
            content: JSON.stringify(bodyMerge.merged, null, 2),
          },
        ],
        `sync: +${runsMerge.addedCount} run(s), +${result.newSnapshots} snapshot(s) (${today})`
      );
      result.committed = committed;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Cron sync failed:", err);
    result.error = err.message;
    return NextResponse.json(result, { status: 500 });
  }
}
