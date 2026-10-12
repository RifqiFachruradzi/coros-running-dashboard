// Single-admin login for the dashboard. The email and password live only in
// Vercel env vars (this repo is public): DASHBOARD_EMAIL and
// DASHBOARD_PASSWORD. Login is off while DASHBOARD_PASSWORD is empty.
//
// A session is a signed cookie "<expiry ms>.<HMAC>" — no server storage.
// The HMAC key includes the credentials, so changing the password signs
// every existing session out. Set AUTH_SECRET (any long random string) to
// make the key unguessable even if the password is weak.
//
// Web Crypto only, so this runs in proxy.ts as well as in Server Actions.

export const SESSION_COOKIE = "dashboard_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function isAuthEnabled(): boolean {
  return !!process.env.DASHBOARD_PASSWORD;
}

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const secret = [
    process.env.AUTH_SECRET ?? "",
    process.env.DASHBOARD_EMAIL ?? "",
    process.env.DASHBOARD_PASSWORD ?? "",
  ].join("\n");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// Compares digests of both sides so the time taken doesn't reveal how much of
// a guess matched.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.DASHBOARD_EMAIL ?? "").trim().toLowerCase();
  const expectedPassword = process.env.DASHBOARD_PASSWORD ?? "";
  if (!expectedPassword) return false;
  const [emailOk, passwordOk] = await Promise.all([
    // Without DASHBOARD_EMAIL any email is accepted, like the old Basic Auth.
    expectedEmail ? safeEqual(email.trim().toLowerCase(), expectedEmail) : Promise.resolve(true),
    safeEqual(password, expectedPassword),
  ]);
  return emailOk && passwordOk;
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expires}.${await hmac(`session:${expires}`)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !(Number(expires) > Date.now())) return false;
  return safeEqual(signature, await hmac(`session:${expires}`));
}

/** Only same-site paths, so ?next= can't send someone to another site. */
export function safeNextPath(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
