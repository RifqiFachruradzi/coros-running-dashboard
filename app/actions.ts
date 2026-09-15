"use server";

// Server Actions for the AI coach. They are POSTs to the dashboard page, so
// proxy.ts's DASHBOARD_PASSWORD check guards them exactly like the page.

import { refresh } from "next/cache";
import { todayInJakarta } from "@/lib/aggregate";
import { readRecommendation } from "@/lib/data-store";
import {
  clearActiveProgram,
  isStorageConfigured,
  saveActiveProgram,
} from "@/lib/token-store";

export type ActionResult = { ok: true } | { ok: false; error: string };

const STORAGE_MISSING = "Upstash Redis belum dikonfigurasi, jadi program belum bisa disimpan.";

export async function acceptProgram(programId: string): Promise<ActionResult> {
  if (!isStorageConfigured()) return { ok: false, error: STORAGE_MISSING };

  // Look the program up on the server rather than trusting data sent by the browser.
  const { recommendation } = await readRecommendation();
  const program = recommendation?.programs.find((p) => p.id === programId);
  if (!program) {
    return {
      ok: false,
      error: "Program tidak ditemukan — rekomendasi mungkin sudah diperbarui. Muat ulang halaman.",
    };
  }

  try {
    await saveActiveProgram({
      program,
      startDate: todayInJakarta(),
      acceptedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to save active program:", err);
    return { ok: false, error: "Gagal menyimpan program. Coba lagi." };
  }

  refresh();
  return { ok: true };
}

export async function stopProgram(): Promise<ActionResult> {
  if (!isStorageConfigured()) return { ok: false, error: STORAGE_MISSING };

  try {
    await clearActiveProgram();
  } catch (err) {
    console.error("Failed to clear active program:", err);
    return { ok: false, error: "Gagal menghentikan program. Coba lagi." };
  }

  refresh();
  return { ok: true };
}
