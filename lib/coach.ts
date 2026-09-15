// Daily advice and training programs written by the scheduled Claude Code
// routine (see docs/coach-routine.md) into data/recommendation.json, plus
// progress tracking for the program the user accepted.
//
// The file is written by an AI, so the dashboard validates it before trusting
// it. Keep this module free of server-only imports: the routine runs it via
// scripts/validate-recommendation.ts before committing.

import { addDays, daysBetween, todayInJakarta } from "./aggregate";
import type { RunActivity } from "./types";

export const READINESS = ["siap_intensitas", "latihan_ringan", "istirahat"] as const;
export type Readiness = (typeof READINESS)[number];

export interface PlannedSession {
  /** 1 = the day the user accepts the program; days without a session are rest days. */
  day: number;
  title: string;
  distanceKm: number | null;
  /** "m:ss" per km */
  targetPace: string | null;
  notes: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  goal: string;
  durationWeeks: number;
  sessions: PlannedSession[];
}

export interface Recommendation {
  version: 1;
  generatedAt: string; // ISO timestamp
  readiness: Readiness;
  summary: string;
  tomorrow: Omit<PlannedSession, "day">;
  warnings: string[];
  programs: TrainingProgram[];
}

export interface ActiveProgram {
  program: TrainingProgram;
  startDate: string; // yyyy-MM-dd (Jakarta)
  acceptedAt: string; // ISO timestamp
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const PACE_RE = /^\d{1,2}:[0-5]\d$/;
const PROGRAM_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_PROGRAMS = 3;
const MAX_WEEKS = 16;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseRecommendation(raw: unknown): ParseResult<Recommendation> {
  const errors: string[] = [];

  const text = (v: unknown, path: string, allowEmpty = false): string => {
    if (typeof v === "string" && (allowEmpty || v.trim() !== "")) return v;
    errors.push(`${path} harus teks${allowEmpty ? "" : " yang tidak kosong"}`);
    return "";
  };
  const distance = (v: unknown, path: string): number | null => {
    if (v === null) return null;
    if (typeof v === "number" && v > 0 && v <= 60) return v;
    errors.push(`${path} harus angka 0–60 (km) atau null`);
    return null;
  };
  const pace = (v: unknown, path: string): string | null => {
    if (v === null) return null;
    if (typeof v === "string" && PACE_RE.test(v)) return v;
    errors.push(`${path} harus format "m:ss" atau null`);
    return null;
  };
  const session = (v: unknown, path: string, maxDay: number | null): PlannedSession | null => {
    if (!isObject(v)) {
      errors.push(`${path} harus object`);
      return null;
    }
    let day = 1;
    if (maxDay !== null) {
      if (typeof v.day === "number" && Number.isInteger(v.day) && v.day >= 1 && v.day <= maxDay) {
        day = v.day;
      } else {
        errors.push(`${path}.day harus bilangan bulat 1–${maxDay}`);
      }
    }
    return {
      day,
      title: text(v.title, `${path}.title`),
      distanceKm: distance(v.distanceKm, `${path}.distanceKm`),
      targetPace: pace(v.targetPace, `${path}.targetPace`),
      notes: text(v.notes, `${path}.notes`, true),
    };
  };

  if (!isObject(raw)) return { ok: false, errors: ["isi file harus object JSON"] };

  if (raw.version !== 1) errors.push("version harus 1");

  const generatedAt = text(raw.generatedAt, "generatedAt");
  if (generatedAt && Number.isNaN(Date.parse(generatedAt))) {
    errors.push("generatedAt harus timestamp ISO");
  }

  let readiness: Readiness = "latihan_ringan";
  if (READINESS.includes(raw.readiness as Readiness)) {
    readiness = raw.readiness as Readiness;
  } else {
    errors.push(`readiness harus salah satu dari: ${READINESS.join(", ")}`);
  }

  const tomorrow = session(raw.tomorrow, "tomorrow", null);

  const warnings: string[] = [];
  if (Array.isArray(raw.warnings)) {
    raw.warnings.forEach((w, i) => warnings.push(text(w, `warnings[${i}]`)));
  } else {
    errors.push("warnings harus array (boleh kosong)");
  }

  const programs: TrainingProgram[] = [];
  if (!Array.isArray(raw.programs) || raw.programs.length < 1 || raw.programs.length > MAX_PROGRAMS) {
    errors.push(`programs harus array berisi 1–${MAX_PROGRAMS} program`);
  } else {
    const seenIds = new Set<string>();
    raw.programs.forEach((p, i) => {
      const path = `programs[${i}]`;
      if (!isObject(p)) {
        errors.push(`${path} harus object`);
        return;
      }

      const id = text(p.id, `${path}.id`);
      if (id && !PROGRAM_ID_RE.test(id)) errors.push(`${path}.id hanya boleh huruf kecil, angka, dan strip`);
      if (seenIds.has(id)) errors.push(`${path}.id "${id}" dipakai lebih dari sekali`);
      seenIds.add(id);

      let durationWeeks = 1;
      if (
        typeof p.durationWeeks === "number" &&
        Number.isInteger(p.durationWeeks) &&
        p.durationWeeks >= 1 &&
        p.durationWeeks <= MAX_WEEKS
      ) {
        durationWeeks = p.durationWeeks;
      } else {
        errors.push(`${path}.durationWeeks harus bilangan bulat 1–${MAX_WEEKS}`);
      }

      const sessions: PlannedSession[] = [];
      if (!Array.isArray(p.sessions) || p.sessions.length === 0) {
        errors.push(`${path}.sessions harus array yang tidak kosong`);
      } else {
        const seenDays = new Set<number>();
        p.sessions.forEach((s, j) => {
          const parsed = session(s, `${path}.sessions[${j}]`, durationWeeks * 7);
          if (!parsed) return;
          if (seenDays.has(parsed.day)) {
            errors.push(`${path}.sessions[${j}].day ${parsed.day} sudah punya sesi lain`);
          }
          seenDays.add(parsed.day);
          sessions.push(parsed);
        });
      }

      programs.push({
        id,
        title: text(p.title, `${path}.title`),
        goal: text(p.goal, `${path}.goal`),
        durationWeeks,
        sessions: sessions.sort((a, b) => a.day - b.day),
      });
    });
  }

  if (errors.length > 0 || !tomorrow) return { ok: false, errors };

  const { day: _day, ...tomorrowWithoutDay } = tomorrow;
  return {
    ok: true,
    value: {
      version: 1,
      generatedAt,
      readiness,
      summary: text(raw.summary, "summary"),
      tomorrow: tomorrowWithoutDay,
      warnings,
      programs,
    },
  };
}

export type SessionStatus = "selesai" | "terlewat" | "hari_ini" | "akan_datang";

export interface SessionProgress extends PlannedSession {
  date: string; // yyyy-MM-dd
  status: SessionStatus;
  /** km run on that date */
  actualKm: number;
}

export interface ProgramProgress {
  sessions: SessionProgress[];
  completedCount: number;
  missedCount: number;
  endDate: string;
  finished: boolean;
  /** 1-based, clamped to the program length */
  currentWeek: number;
  week: {
    start: string;
    end: string;
    plannedKm: number;
    actualKm: number;
    /** Days left in the program week, counting today */
    daysLeft: number;
    sessions: SessionProgress[];
  };
}

// A session counts as done when that day's runs cover at least 90% of the
// planned distance — GPS drift and cool-down walks rarely match exactly.
const DONE_RATIO = 0.9;

export function programProgress(
  active: ActiveProgram,
  runs: RunActivity[],
  today = todayInJakarta()
): ProgramProgress {
  const { program, startDate } = active;
  const endDate = addDays(startDate, program.durationWeeks * 7 - 1);

  const kmByDate = new Map<string, number>();
  for (const run of runs) {
    if (run.date < startDate || run.date > endDate) continue;
    kmByDate.set(run.date, (kmByDate.get(run.date) ?? 0) + run.distanceKm);
  }

  const sessions = program.sessions.map((s): SessionProgress => {
    const date = addDays(startDate, s.day - 1);
    const actualKm = kmByDate.get(date) ?? 0;
    const done = s.distanceKm === null ? actualKm > 0 : actualKm >= s.distanceKm * DONE_RATIO;
    const status: SessionStatus = done
      ? "selesai"
      : date < today
      ? "terlewat"
      : date === today
      ? "hari_ini"
      : "akan_datang";
    return { ...s, date, actualKm, status };
  });

  const elapsedWeeks = Math.floor(daysBetween(startDate, today) / 7);
  const currentWeek = Math.min(Math.max(elapsedWeeks + 1, 1), program.durationWeeks);
  const weekStart = addDays(startDate, (currentWeek - 1) * 7);
  const weekEnd = addDays(weekStart, 6);
  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  let weekActualKm = 0;
  kmByDate.forEach((km, date) => {
    if (date >= weekStart && date <= weekEnd) weekActualKm += km;
  });

  return {
    sessions,
    completedCount: sessions.filter((s) => s.status === "selesai").length,
    missedCount: sessions.filter((s) => s.status === "terlewat").length,
    endDate,
    finished: today > endDate,
    currentWeek,
    week: {
      start: weekStart,
      end: weekEnd,
      plannedKm: weekSessions.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0),
      actualKm: weekActualKm,
      daysLeft: Math.max(daysBetween(today, weekEnd) + 1, 0),
      sessions: weekSessions,
    },
  };
}
