// Step 2 of the OAuth handshake: COROS redirects back here with ?code&state.
// Exchanges the code for tokens and stores them in KV for the cron job.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/coros-oauth";
import { consumePendingAuth, saveTokens } from "@/lib/token-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.json(
      { error: "COROS returned an OAuth error", detail: errorParam },
      { status: 400 }
    );
  }
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state in callback." },
      { status: 400 }
    );
  }

  const pending = await consumePendingAuth(state);
  if (!pending) {
    return NextResponse.json(
      { error: "Unknown or expired state — restart at /api/coros/authorize." },
      { status: 400 }
    );
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: pending.redirectUri,
      codeVerifier: pending.codeVerifier,
    });

    await saveTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    });

    return NextResponse.json({
      ok: true,
      message:
        "COROS account connected. The dashboard will start syncing on the next cron run (or trigger /api/cron/sync manually).",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Token exchange failed", detail: err.message },
      { status: 500 }
    );
  }
}
