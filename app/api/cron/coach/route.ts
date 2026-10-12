// Called by Vercel Cron (see vercel.json) after the daily data sync: asks the
// coach model on the owner's 9Router proxy for tomorrow's advice and program
// offers, then commits data/recommendation.json. Safe to hit manually with
// `Authorization: Bearer <CRON_SECRET>`.

import { NextRequest, NextResponse } from "next/server";
import { generateRecommendation } from "@/lib/coach-llm";
import {
  readRuns,
  readFitnessHistory,
  readLoadHistory,
  readBodyHistory,
} from "@/lib/data-store";
import { commitDataFiles } from "@/lib/github";
import { loadActiveProgram } from "@/lib/token-store";
import { todayInJakarta } from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Same rule as /api/cron/sync: each run spends LLM quota and pushes a commit.
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [runs, fitness, load, body, activeProgram] = await Promise.all([
      readRuns(),
      readFitnessHistory(),
      readLoadHistory(),
      readBodyHistory(),
      loadActiveProgram(),
    ]);

    const { recommendation, attempts } = await generateRecommendation({
      runs,
      fitness,
      load,
      body,
      activeProgram,
    });

    const committed = await commitDataFiles(
      [
        {
          path: "data/recommendation.json",
          content: JSON.stringify(recommendation, null, 2) + "\n",
        },
      ],
      `coach: rekomendasi ${todayInJakarta()}`
    );

    return NextResponse.json({
      committed,
      attempts,
      readiness: recommendation.readiness,
      programs: recommendation.programs.map((p) => p.title),
    });
  } catch (err: any) {
    console.error("Coach run failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
