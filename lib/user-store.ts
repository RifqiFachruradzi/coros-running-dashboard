// Things the runner creates in the dashboard (goals and drawn routes), kept in
// the same Upstash Redis as the OAuth tokens. Each list is one JSON value:
// both stay small (a handful of goals, a few dozen routes).

import { Redis } from "@upstash/redis";
import type { Goal, SavedRoute } from "./insights";
import { isStorageConfigured } from "./token-store";

const GOALS_KEY = "user:goals";
const ROUTES_KEY = "user:routes";

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
export const loadRoutes = () => readList<SavedRoute>(ROUTES_KEY);

export async function saveGoals(goals: Goal[]): Promise<void> {
  await kv().set(GOALS_KEY, goals);
}

export async function saveRoutes(routes: SavedRoute[]): Promise<void> {
  await kv().set(ROUTES_KEY, routes);
}
