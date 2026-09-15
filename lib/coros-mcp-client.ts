// Thin wrapper that opens an authenticated MCP session against
// https://mcp.coros.com/mcp and calls its tools, mirroring the tool names
// COROS exposes for running data (same tool set used by the AI-assistant
// integration: querySportRecords, queryFitnessAssessmentOverview,
// queryTrainingLoadAssessment, queryRestingHeartRate, querySleepData,
// queryStressLevel). Verify exact tool names once you can inspect a live
// tools/list response — COROS may version or rename fields.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { COROS_MCP_URL, refreshTokens } from "./coros-oauth";
import { loadTokens, saveTokens, type CorosTokenSet } from "./token-store";

const REDIRECT_URI = process.env.COROS_REDIRECT_URI!;

async function getValidAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens) {
    throw new Error(
      "No COROS tokens stored yet — visit /api/coros/authorize once to complete the OAuth consent."
    );
  }

  const expiresInMs = tokens.expiresAt - Date.now();
  if (expiresInMs > 60_000) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    throw new Error(
      "COROS access token expired and no refresh token is stored — re-authorize via /api/coros/authorize."
    );
  }

  const refreshed = await refreshTokens(tokens.refreshToken, REDIRECT_URI);
  const newTokens: CorosTokenSet = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
    tokenType: refreshed.token_type,
    scope: refreshed.scope,
  };
  await saveTokens(newTokens);
  return newTokens.accessToken;
}

async function withMcpClient<T>(
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const accessToken = await getValidAccessToken();

  const transport = new StreamableHTTPClientTransport(new URL(COROS_MCP_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const client = new Client({ name: "coros-running-dashboard", version: "0.1.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export async function callCorosTool<T = unknown>(
  name: string,
  args: Record<string, unknown>
): Promise<T> {
  return withMcpClient(async (client) => {
    const result = await client.callTool({ name, arguments: args });
    // MCP tool results come back as content blocks; COROS's tools return a
    // single text block containing JSON (mirroring the human-readable +
    // structured payload pattern used elsewhere in their API).
    const content = (result as any).content;
    const firstText = Array.isArray(content)
      ? content.find((c: any) => c.type === "text")?.text
      : undefined;
    if (!firstText) return result as T;
    try {
      return JSON.parse(firstText) as T;
    } catch {
      return firstText as T;
    }
  });
}
