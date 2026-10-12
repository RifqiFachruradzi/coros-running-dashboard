// Goals the runner sets in the dashboard, kept in the same Upstash Redis as
// the OAuth tokens as one small JSON list.

import { Redis } from "@upstash/redis";
import type { Goal } from "./insights";
import { isStorageConfigured } from "./token-store";

const GOALS_KEY = "user:goals";

let client: Redis | null = null;
function kv(): Redis {
  client ??= Redis.fromEnv();
  return client;
}

/** Reads a list, treating missing storage as empty so pages still render. */
async function readList<T>(key: string): Promise<T[]> {
  if (!isStorageConfigured()) return [];
  try {
    return (await kv().get<T[]>(key)) ?? [];
  } catch (err) {
    console.error(`Failed to read ${key}:`, err);
    return [];
  }
}

export const loadGoals = () => readList<Goal>(GOALS_KEY);

export async function saveGoals(goals: Goal[]): Promise<void> {
  await kv().set(GOALS_KEY, goals);
}
