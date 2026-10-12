// The coach's "brain": sends the latest training data to an OpenAI-compatible
// chat completions endpoint (the owner's self-hosted 9Router proxy) and gets
// back data/recommendation.json. The answer is checked with the same
// validator the dashboard uses; on failure the errors are sent back to the
// model for a fix, a limited number of times.
//
// Env vars:
//   COACH_LLM_BASE_URL  e.g. https://9router.example.com/v1
//   COACH_LLM_API_KEY   9Router API key (sk-...)
//   COACH_LLM_MODEL     model or combo name as listed in 9Router

import { addDays, daysBetween, todayInJakarta } from "./aggregate";
import { parseRecommendation, type ActiveProgram, type Recommendation } from "./coach";
import type { BodySnapshot, FitnessSnapshot, LoadSnapshot, RunActivity } from "./types";

const MAX_ATTEMPTS = 3;
// Three 90 s attempts stay inside the route's 300 s maxDuration.
const REQUEST_TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `Kamu adalah pelatih lari pribadi. Dari data latihan yang diberikan, tulis rekomendasi harian dalam bentuk SATU object JSON sesuai skema di bawah. Balas HANYA dengan JSON itu, tanpa teks lain dan tanpa code fence.

## Aturan keselamatan (wajib)
- Kalau loadRatio > 1,5, resting HR rata-rata 7 hari terakhir naik > 5 bpm dari rata-rata 4 minggu sebelumnya, atau skor tidur rendah beberapa hari berturut-turut: readiness minimal "latihan_ringan", dan jelaskan alasannya di warnings.
- Jangan ada dua sesi berat (tempo, interval, long run) di hari berurutan.
- Volume mingguan program naik maksimal ±10% per minggu, dimulai dari volume minggu tertinggi dalam 4 minggu terakhir. Setiap minggu ke-4, turunkan volume (minggu pemulihan).
- Long run di minggu pertama tidak lebih dari 1,3× lari terjauh dalam 4 minggu terakhir.
- Target pace harus berdasarkan pace lari aktual di runs. Kalau prediksi COROS jauh lebih cepat dari pace aktual, pakai pace aktual dan sebutkan di warnings.
- Kalau data kosong, kurang, atau sudah lama tidak diperbarui, katakan di warnings. Jangan mengarang angka.
- Jangan memberi diagnosis medis. Kalau data menunjukkan tanda bahaya, sarankan istirahat dan konsultasi dengan tenaga profesional.

## Isi rekomendasi
- summary: 1–2 kalimat tentang kondisi pengguna saat ini, dalam bahasa Indonesia yang ramah dan konkret (sebutkan angka).
- tomorrow: latihan untuk besok.
  - Kalau ada program aktif yang belum berakhir, ikuti sesi program untuk besok (sudah dihitung di activeProgram.tomorrowSession), kecuali aturan keselamatan meminta latihan lebih ringan. Kalau begitu, jelaskan di notes.
  - Kalau besok tidak ada sesi, isi title dengan "Istirahat" dan distanceKm/targetPace dengan null.
- programs: 2–3 tawaran program dengan karakter berbeda. Contohnya satu penguatan dasar ("6K Goals Routine"), satu target jarak ("10K Routine"), dan satu yang lebih ringan. Jarak target harus realistis: jangan menawarkan half marathon kalau lari terjauh baru 5 km.
  - Durasi 4–8 minggu, 3–4 sesi per minggu.
  - day 1 = hari pengguna menerima program. Hari tanpa sesi = istirahat. Sesi pertama sebaiknya di day 2, karena program sering diterima malam hari.
  - id: huruf kecil, angka, dan strip, unik, diakhiri tanggal hari ini (yyyyMMdd). Contoh: "10k-routine-20260915".
  - Kalau ada program aktif yang masih berjalan lebih dari 7 hari lagi, tetap tawarkan program, tapi tulis di goal kapan program itu cocok diambil.

## Skema
{
  "version": 1,
  "generatedAt": "<timestamp ISO>",
  "readiness": "siap_intensitas" | "latihan_ringan" | "istirahat",
  "summary": "…",
  "tomorrow": { "title": "Easy run", "distanceKm": 4, "targetPace": "8:15", "notes": "…" },
  "warnings": ["…"],
  "programs": [
    {
      "id": "10k-routine-20260915",
      "title": "10K Routine",
      "goal": "…",
      "durationWeeks": 8,
      "sessions": [
        { "day": 2, "title": "Easy run", "distanceKm": 3, "targetPace": "8:15", "notes": "" }
      ]
    }
  ]
}

Aturan field:
- distanceKm: angka > 0 dan ≤ 60, atau null.
- targetPace: teks "m:ss" per km, atau null.
- notes: teks, boleh "".
- warnings: array, boleh kosong.
- Maksimal satu sesi per day dalam satu program.
- day tidak boleh melebihi durationWeeks × 7.`;

export interface CoachInput {
  runs: RunActivity[];
  fitness: FitnessSnapshot[];
  load: LoadSnapshot[];
  body: BodySnapshot[];
  activeProgram: ActiveProgram | null;
}

function config() {
  const baseUrl = process.env.COACH_LLM_BASE_URL?.trim();
  // Tolerate a pasted "Bearer " prefix or stray whitespace/newlines.
  const apiKey = process.env.COACH_LLM_API_KEY?.trim().replace(/^Bearer\s+/i, "");
  const model = process.env.COACH_LLM_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      "COACH_LLM_BASE_URL, COACH_LLM_API_KEY, dan COACH_LLM_MODEL harus di-set di Vercel."
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model };
}

// Only recent history matters for tomorrow's advice, and trimming keeps the
// prompt small for whichever model 9Router routes to.
function buildUserPrompt(input: CoachInput, today: string): string {
  const tomorrow = addDays(today, 1);
  const since = addDays(today, -56);
  const recent = <T extends { date: string }>(rows: T[]) =>
    rows.filter((r) => r.date >= since).sort((a, b) => a.date.localeCompare(b.date));

  let activeProgram = null;
  if (input.activeProgram) {
    const { program, startDate } = input.activeProgram;
    const tomorrowDay = daysBetween(startDate, tomorrow) + 1;
    activeProgram = {
      ...input.activeProgram,
      endDate: addDays(startDate, program.durationWeeks * 7 - 1),
      tomorrowDay,
      tomorrowSession: program.sessions.find((s) => s.day === tomorrowDay) ?? null,
    };
  }

  const data = {
    today,
    tomorrow,
    lastRunDate: input.runs.reduce<string | null>(
      (latest, r) => (latest === null || r.date > latest ? r.date : latest),
      null
    ),
    runs: recent(input.runs).map(({ labelId, startTimestamp, calories, ...r }) => r),
    fitness: recent(input.fitness).slice(-7),
    trainingLoad: recent(input.load).slice(-35),
    bodyCondition: recent(input.body).slice(-35),
    activeProgram,
  };

  return `Hari ini (Asia/Jakarta): ${today}. Data latihan (JSON):\n\n${JSON.stringify(data)}`;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chat(messages: ChatMessage[]): Promise<string> {
  const { baseUrl, apiKey, model } = config();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, stream: false }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    // An empty 401 body says little on its own; the headers show whether
    // 9Router or a proxy in front of it answered.
    const headers = ["server", "www-authenticate", "content-type", "x-request-id"]
      .map((h) => (res.headers.get(h) ? `${h}=${res.headers.get(h)}` : null))
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `9Router ${res.status} (model "${model}", key ${apiKey.slice(0, 6)}…${apiKey.slice(-4)}, ` +
        `${headers || "tanpa header"}): ${(await res.text()).slice(0, 500) || "body kosong"}`
    );
  }
  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("9Router mengembalikan jawaban kosong");
  }
  return content;
}

// Models sometimes wrap JSON in a code fence or add a sentence around it.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("tidak ada object JSON di jawaban");
  return JSON.parse(candidate.slice(start, end + 1));
}

export interface CoachResult {
  recommendation: Recommendation;
  attempts: number;
}

export async function generateRecommendation(input: CoachInput): Promise<CoachResult> {
  const today = todayInJakarta();
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(input, today) },
  ];

  let lastErrors: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const answer = await chat(messages);

    let errors: string[];
    try {
      const raw = extractJson(answer) as Record<string, unknown>;
      // Fields the server knows better than the model.
      raw.version = 1;
      raw.generatedAt = new Date().toISOString();
      const parsed = parseRecommendation(raw);
      if (parsed.ok) return { recommendation: parsed.value, attempts: attempt };
      errors = parsed.errors;
    } catch (err) {
      errors = [`jawaban bukan JSON yang valid: ${(err as Error).message}`];
    }

    lastErrors = errors;
    messages.push(
      { role: "assistant", content: answer },
      {
        role: "user",
        content: `JSON-mu tidak lolos validasi:\n- ${errors.join("\n- ")}\n\nPerbaiki dan kirim ulang seluruh JSON saja.`,
      }
    );
  }

  throw new Error(
    `Rekomendasi tidak valid setelah ${MAX_ATTEMPTS} percobaan: ${lastErrors.join("; ")}`
  );
}
