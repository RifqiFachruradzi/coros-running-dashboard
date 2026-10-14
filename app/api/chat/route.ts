// Chat with the AI coach. The browser sends only the conversation; the
// training data is read here on the server so the coach always sees the same
// numbers as the dashboard. Replies stream back as plain text from the
// OpenAI-compatible endpoint on 9Router (COACH_LLM_* env vars; set
// COACH_CHAT_MODEL to use a different model for chat). proxy.ts requires a
// logged-in session for this route.

import { NextRequest, NextResponse } from "next/server";
import { buildCoachContext, llmConfig } from "@/lib/coach-llm";
import {
  readRuns,
  readFitnessHistory,
  readLoadHistory,
  readBodyHistory,
  readRecommendation,
} from "@/lib/data-store";
import { loadActiveProgram } from "@/lib/token-store";
import { loadGoals } from "@/lib/user-store";
import { goalProgress } from "@/lib/insights";
import { todayInJakarta } from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

const SYSTEM_PROMPT = `Kamu adalah "Coach", pelatih lari pribadi di dashboard lari pengguna. Data latihan pengguna dari jam COROS diberikan di bawah dalam bentuk JSON.

Tugasmu:
- Menjawab pertanyaan seputar latihan lari, pace, volume, pemulihan, persiapan race, dan program latihan.
- Selalu dasarkan jawaban pada data pengguna. Sebut angka nyata (tanggal, km, pace m:ss/km, HR) dari data.
- Pace dalam data berupa detik per km (avgPaceSecPerKm, thresholdPaceSecPerKm); ubah ke format m:ss saat menyebutnya. Prediksi race dalam detik.
- Beri langkah yang konkret: jarak, pace, jumlah sesi, kapan istirahat.
- Kalau data tidak cukup atau sudah lama tidak diperbarui, katakan apa yang kurang. Jangan mengarang angka.
- Kalau ada goals (target yang dibuat pengguna), kaitkan saranmu dengan target itu dan progresnya.

Aturan keselamatan:
- Jangan sarankan dua sesi berat (tempo, interval, long run) di hari berurutan.
- Kenaikan volume mingguan maksimal sekitar 10%.
- Kalau loadRatio tinggi (> 1,5), resting HR naik jelas, atau tidur buruk beberapa hari, sarankan latihan ringan atau istirahat.
- Kamu bukan tenaga medis. Untuk nyeri, cedera, pusing, nyeri dada, atau gejala lain, sarankan berhenti latihan dan konsultasi dengan dokter atau fisioterapis.

Gaya:
- Bahasa Indonesia yang ramah dan santai, kecuali pengguna memakai bahasa lain.
- Ringkas: poin-poin dan judul pendek bila membantu, hindari paragraf panjang.
- Jangan gunakan emoji.`;

type Turn = { role: "user" | "assistant"; content: string };

// Keeps well-formed alternating turns that start with the user, most recent last.
function sanitizeMessages(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const clean = raw
    .filter(
      (m): m is Turn =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_MESSAGES);
  while (clean.length && clean[0].role !== "user") clean.shift();
  const merged: Turn[] = [];
  for (const m of clean) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }
  return merged;
}

// Drops <think>…</think> blocks that reasoning models (e.g. Hermes) put in
// the content stream, including tags split across chunks.
class ThinkFilter {
  private buf = "";
  private inThink = false;

  push(text: string): string {
    this.buf += text;
    let out = "";
    for (;;) {
      if (!this.inThink) {
        const start = this.buf.indexOf("<think>");
        if (start >= 0) {
          out += this.buf.slice(0, start);
          this.buf = this.buf.slice(start + "<think>".length);
          this.inThink = true;
          continue;
        }
        // Hold back a tail that could be the start of "<think>".
        let keep = 0;
        for (let k = Math.min(6, this.buf.length); k > 0; k--) {
          if ("<think>".startsWith(this.buf.slice(-k))) {
            keep = k;
            break;
          }
        }
        out += this.buf.slice(0, this.buf.length - keep);
        this.buf = this.buf.slice(this.buf.length - keep);
        return out;
      }
      const end = this.buf.indexOf("</think>");
      if (end < 0) {
        this.buf = this.buf.slice(-7); // may hold a partial "</think"
        return out;
      }
      this.buf = this.buf.slice(end + "</think>".length).replace(/^\s+/, "");
      this.inThink = false;
    }
  }

  flush(): string {
    const rest = this.inThink ? "" : this.buf;
    this.buf = "";
    return rest;
  }
}

async function coachContext(): Promise<string> {
  const [runs, fitness, load, body, activeProgram, { recommendation }, goals] = await Promise.all([
    readRuns(),
    readFitnessHistory(),
    readLoadHistory(),
    readBodyHistory(),
    loadActiveProgram().catch(() => null),
    readRecommendation(),
    loadGoals(),
  ]);
  const today = todayInJakarta();
  return JSON.stringify({
    ...buildCoachContext({ runs, fitness, load, body, activeProgram }, today),
    todaysRecommendation: recommendation
      ? {
          generatedAt: recommendation.generatedAt,
          readiness: recommendation.readiness,
          summary: recommendation.summary,
          tomorrow: recommendation.tomorrow,
          warnings: recommendation.warnings,
          programOffers: recommendation.programs.map((p) => ({
            title: p.title,
            goal: p.goal,
            durationWeeks: p.durationWeeks,
          })),
        }
      : null,
    // Targets the runner set on the /target page, with progress so far.
    goals: goals.map((g) => {
      const p = goalProgress(g, runs, today);
      return p.type === "race"
        ? {
            kind: g.kind,
            name: g.name ?? null,
            distanceKm: g.target,
            targetSeconds: g.targetSeconds,
            raceDate: g.raceDate,
            daysLeft: p.daysLeft,
            predictedSeconds: p.predictedSeconds && Math.round(p.predictedSeconds),
            status: p.status,
          }
        : { kind: g.kind, target: g.target, actual: p.actual, period: `${p.start}..${p.end}`, status: p.status };
    }),
  });
}

/** Which server answered: 9Router itself or something in front of it. */
function answeredBy(res: Response): string {
  const parts = ["server", "content-type", "x-request-id"]
    .map((h) => (res.headers.get(h) ? `${h}=${res.headers.get(h)}` : null))
    .filter(Boolean);
  return parts.length ? `header: ${parts.join(", ")}` : "tanpa header pengenal";
}

/** Sends a one-word request to the same model to split "prompt too big" from "model/provider down". */
async function probeModel(cfg: { baseUrl: string; apiKey: string; model: string }): Promise<string> {
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, stream: false, max_tokens: 5, messages: [{ role: "user", content: "ping" }] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      return "Tes kecil (\"ping\") ke model yang sama BERHASIL, jadi model aktif tapi menolak permintaan sebesar ini: kemungkinan batas konteks/ukuran di provider.";
    }
    const body = (await res.text()).trim().slice(0, 200);
    return `Tes kecil ("ping") ke model yang sama JUGA DITOLAK (${res.status}${body ? `: ${body}` : ", body kosong"}), jadi masalahnya di 9Router/provider: cek combo "${cfg.model}", kuota, atau status provider.`;
  } catch (err: any) {
    return `Tes kecil gagal terhubung: ${err?.message ?? err}.`;
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }
  const messages = sanitizeMessages(body?.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Pesan pengguna tidak ditemukan." }, { status: 400 });
  }

  let cfg;
  try {
    cfg = llmConfig(process.env.COACH_CHAT_MODEL);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }

  const fullMessages = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nHari ini (Asia/Jakarta): ${todayInJakarta()}.\nData latihan pengguna (JSON):\n${await coachContext()}`,
    },
    ...messages,
  ];

  let upstream: Response;
  try {
    upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        temperature: 0.5,
        messages: fullMessages,
      }),
      // Stop generating when the browser disconnects.
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(240_000)]),
    });
  } catch (err: any) {
    console.error("Coach chat: request failed", err);
    return NextResponse.json({ error: "Tidak bisa menghubungi 9Router." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    let detail = (await upstream.text()).trim().slice(0, 300);
    if (!detail) {
      // 9Router sometimes rejects with an empty body, which says nothing.
      // Describe the request and try a tiny one, so the reply tells the
      // owner whether the prompt is too big or the model/provider is down.
      const promptChars = fullMessages.reduce((n, m) => n + m.content.length, 0);
      detail =
        `body kosong; ${answeredBy(upstream)}; ukuran permintaan ±${Math.round(promptChars / 3.5)} token ` +
        `(${promptChars} karakter). ${await probeModel(cfg)}`;
    }
    console.error(`Coach chat: 9Router ${upstream.status} (model "${cfg.model}"): ${detail}`);
    const error =
      upstream.status === 401
        ? "API key 9Router ditolak. Periksa COACH_LLM_API_KEY di Vercel."
        : upstream.status === 404
        ? `Model "${cfg.model}" tidak ditemukan di 9Router.`
        : `9Router menolak permintaan (${upstream.status}, model "${cfg.model}").`;
    return NextResponse.json({ error, detail }, { status: 502 });
  }

  // Turn the server-sent events into a plain text stream of the reply.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const think = new ThinkFilter();
  let pending = "";

  const stream = new ReadableStream<Uint8Array>({
    // Must enqueue (or close) before returning: a pull that resolves without
    // output is not called again, which would stall the reply. So keep
    // reading while a chunk holds only partial lines or <think> text.
    async pull(controller) {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            const rest = think.flush();
            if (rest) controller.enqueue(encoder.encode(rest));
            controller.close();
            return;
          }
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          let text = "";
          for (const line of lines) {
            const data = line.trim();
            if (!data.startsWith("data:")) continue;
            const payload = data.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              // Only the answer; reasoning_content deltas are skipped.
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof delta === "string") text += think.push(delta);
            } catch {
              // Ignore keep-alive or malformed lines.
            }
          }
          if (text) {
            controller.enqueue(encoder.encode(text));
            return;
          }
        }
      } catch (err) {
        console.error("Coach chat: stream failed", err);
        controller.enqueue(encoder.encode("\n\n_(Koneksi ke pelatih terputus.)_"));
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
