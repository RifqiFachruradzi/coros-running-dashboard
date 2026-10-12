"use server";

// Server Actions for goals. Like app/actions.ts they are
// POSTs to dashboard pages, so proxy.ts's login check guards them. Input
// from the browser is validated here before anything is stored.

import { refresh } from "next/cache";
import { randomUUID } from "crypto";
import { todayInJakarta } from "@/lib/aggregate";
import type { Goal, GoalKind } from "@/lib/insights";
import { isStorageConfigured } from "@/lib/token-store";
import { loadGoals, saveGoals } from "@/lib/user-store";
import type { ActionResult } from "./actions";

const STORAGE_MISSING = "Upstash Redis belum dikonfigurasi, jadi data belum bisa disimpan.";
const MAX_GOALS = 20;

const GOAL_KINDS: GoalKind[] = ["weekly_km", "monthly_km", "yearly_km", "weekly_runs", "race"];

async function persist(write: () => Promise<void>, failure: string): Promise<ActionResult> {
  if (!isStorageConfigured()) return { ok: false, error: STORAGE_MISSING };
  try {
    await write();
  } catch (err) {
    console.error(failure, err);
    return { ok: false, error: `${failure} Coba lagi.` };
  }
  refresh();
  return { ok: true };
}

/** "1:05:30", "52:10" or "52" (minutes) → seconds. */
function parseDuration(text: string): number | null {
  const parts = text.trim().split(":").map((p) => p.trim());
  if (!parts.length || parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  if (n.length === 1) return n[0] * 60;
  if (n.length === 2) return n[1] < 60 ? n[0] * 60 + n[1] : null;
  if (n.length === 3) return n[1] < 60 && n[2] < 60 ? n[0] * 3600 + n[1] * 60 + n[2] : null;
  return null;
}

export async function addGoal(formData: FormData): Promise<ActionResult> {
  const kind = String(formData.get("kind")) as GoalKind;
  if (!GOAL_KINDS.includes(kind)) return { ok: false, error: "Jenis target tidak dikenal." };

  const target = Number(String(formData.get("target") ?? "").replace(",", "."));
  const maxTarget = kind === "weekly_runs" ? 14 : kind === "yearly_km" ? 10000 : kind === "race" ? 100 : 1000;
  if (!Number.isFinite(target) || target <= 0 || target > maxTarget) {
    return { ok: false, error: `Isi angka target antara 0 dan ${maxTarget}.` };
  }

  const goal: Goal = {
    id: randomUUID(),
    kind,
    target: kind === "weekly_runs" ? Math.round(target) : Math.round(target * 100) / 100,
    createdAt: new Date().toISOString(),
  };

  if (kind === "race") {
    const seconds = parseDuration(String(formData.get("targetTime") ?? ""));
    if (!seconds) return { ok: false, error: "Isi target waktu seperti 1:05:00 atau 32:30." };
    const raceDate = String(formData.get("raceDate") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raceDate) || raceDate < todayInJakarta()) {
      return { ok: false, error: "Isi tanggal race hari ini atau sesudahnya." };
    }
    goal.targetSeconds = seconds;
    goal.raceDate = raceDate;
    const name = String(formData.get("name") ?? "").trim().slice(0, 60);
    if (name) goal.name = name;
  }

  return persist(async () => {
    const goals = await loadGoals();
    if (goals.length >= MAX_GOALS) throw new Error("too many goals");
    // One goal per period kind: a new weekly target replaces the old one.
    const kept = kind === "race" ? goals : goals.filter((g) => g.kind !== kind);
    await saveGoals([...kept, goal]);
  }, "Gagal menyimpan target.");
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  return persist(async () => {
    const goals = await loadGoals();
    await saveGoals(goals.filter((g) => g.id !== id));
  }, "Gagal menghapus target.");
}
