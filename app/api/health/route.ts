// Quick status check: are tokens stored, are the required env vars set.
// Visit /api/health after deploying to confirm setup before waiting for cron.

import { NextResponse } from "next/server";
import { loadTokens } from "@/lib/token-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = await loadTokens();

  return NextResponse.json({
    corosAuthorized: !!tokens,
    corosTokenExpiresAt: tokens ? new Date(tokens.expiresAt).toISOString() : null,
    envConfigured: {
      COROS_REDIRECT_URI: !!process.env.COROS_REDIRECT_URI,
      GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
      GITHUB_OWNER: !!process.env.GITHUB_OWNER,
      GITHUB_REPO: !!process.env.GITHUB_REPO,
      CRON_SECRET: !!process.env.CRON_SECRET,
      KV: !!process.env.KV_REST_API_URL,
    },
  });
}
