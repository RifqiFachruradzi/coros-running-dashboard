// Step 1 of the OAuth handshake: redirect the user to COROS's consent
// screen. Visit /api/coros/authorize once after deploying (and again any
// time you see "no refresh token stored" in the cron logs).

import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  generatePkcePair,
  generateState,
} from "@/lib/coros-oauth";
import { savePendingAuth } from "@/lib/token-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const redirectUri = process.env.COROS_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.json(
      { error: "COROS_REDIRECT_URI env var is not set." },
      { status: 500 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = generateState();

  await savePendingAuth(state, {
    codeVerifier,
    redirectUri,
    createdAt: Date.now(),
  });

  try {
    const authUrl = await buildAuthorizationUrl({
      redirectUri,
      state,
      codeChallenge,
    });
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to start COROS OAuth flow", detail: err.message },
      { status: 500 }
    );
  }
}
