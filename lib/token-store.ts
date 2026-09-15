// Persists OAuth tokens (and the short-lived PKCE state during the login
// handshake) across serverless invocations using Vercel KV.
//
// Why KV and not an env var: COROS's OAuth 2.0 authorization server may
// rotate refresh tokens on each use (standard practice for public/DCR
// clients). A static env var can't absorb that rotation — KV can, because
// the callback/refresh code writes the newest token set back on every use.
//
// Setup: install the "Upstash Redis" storage integration (free tier) from
// the Vercel Marketplace on this project. It injects KV_REST_API_URL and
// KV_REST_API_TOKEN automatically — no extra config needed here. (The
// older "Vercel KV" product is deprecated in favor of this Marketplace
// integration; same underlying Upstash Redis, same env var names.)

import { Redis } from "@upstash/redis";

const kv = Redis.fromEnv();

const TOKEN_KEY = "coros:oauth:tokens";
const CLIENT_KEY = "coros:oauth:client";
const PENDING_PREFIX = "coros:oauth:pending:"; // + state

export interface CorosTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // unix ms
  tokenType: string;
  scope?: string;
}

export interface CorosClientRegistration {
  clientId: string;
  clientSecret?: string;
  registeredAt: number;
}

export interface PendingAuth {
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

export async function saveTokens(tokens: CorosTokenSet): Promise<void> {
  await kv.set(TOKEN_KEY, tokens);
}

export async function loadTokens(): Promise<CorosTokenSet | null> {
  return (await kv.get<CorosTokenSet>(TOKEN_KEY)) ?? null;
}

export async function clearTokens(): Promise<void> {
  await kv.del(TOKEN_KEY);
}

export async function saveClientRegistration(
  reg: CorosClientRegistration
): Promise<void> {
  await kv.set(CLIENT_KEY, reg);
}

export async function loadClientRegistration(): Promise<CorosClientRegistration | null> {
  return (await kv.get<CorosClientRegistration>(CLIENT_KEY)) ?? null;
}

export async function savePendingAuth(
  state: string,
  pending: PendingAuth
): Promise<void> {
  // Expires in 10 minutes — the login round trip should never take longer.
  await kv.set(PENDING_PREFIX + state, pending, { ex: 600 });
}

export async function consumePendingAuth(
  state: string
): Promise<PendingAuth | null> {
  const key = PENDING_PREFIX + state;
  const value = await kv.get<PendingAuth>(key);
  if (value) await kv.del(key);
  return value ?? null;
}
