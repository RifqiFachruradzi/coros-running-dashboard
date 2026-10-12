"use client";

// Chat with the AI coach, modeled on SimpananMu's AI Buddy: streamed replies,
// history kept in this browser, stop and new-conversation buttons, and
// suggested questions. Training data is added on the server (/api/chat).

import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

const HISTORY_KEY = "coach-chat:v1";

const SUGGESTIONS = [
  "Bagaimana progres latihanku 4 minggu terakhir?",
  "Apa latihan terbaik untuk besok?",
  "Berapa target pace realistis untuk 10K?",
  "Kapan aku bisa mulai long run 8 km?",
  "Apakah aku butuh istirahat minggu ini?",
  "Jelaskan program yang ditawarkan pelatih",
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hai! Aku **Coach**, pelatih larimu. Aku membaca data lari, training load, dan kondisi tubuhmu dari COROS, jadi kamu bisa tanya misalnya:\n- **evaluasi progres** latihanmu\n- **target pace** yang realistis\n- **latihan besok** atau kapan perlu istirahat\n\nMau mulai dari mana?",
};

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function loadHistory(): Message[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : [WELCOME];
  } catch {
    return [WELCOME];
  }
}

async function streamReply(
  history: Message[],
  onText: (text: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
    signal,
  });

  if (res.status === 401) {
    window.location.href = "/login?next=/chat";
    throw new Error("Sesi berakhir, silakan masuk lagi.");
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Gagal (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

export function CoachChat({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  // A question handed over from another page (e.g. a run's analysis) is
  // filled in, not sent, so the runner can edit it first.
  const [input, setInput] = useState(initialQuestion);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Read history after mount so the server render and the first client
  // render match.
  useEffect(() => setMessages(loadHistory()), []);

  useEffect(() => {
    if (busy) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // Storage may be full or blocked; the chat still works without it.
    }
  }, [messages, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (id: string, patch: Partial<Message>) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const userMsg: Message = { id: newId(), role: "user", content };
    const replyId = newId();
    const history = [...messages.filter((m) => m.id !== "welcome" && !m.error), userMsg];
    setMessages((list) => [...list, userMsg, { id: replyId, role: "assistant", content: "", pending: true }]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await streamReply(
        history,
        (partial) => updateMessage(replyId, { content: partial }),
        controller.signal
      );
      updateMessage(replyId, { content: reply.trim() || "_(Tidak ada jawaban.)_", pending: false });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((list) =>
          list.map((m) =>
            m.id === replyId ? { ...m, pending: false, content: m.content || "_(Dihentikan.)_" } : m
          )
        );
      } else {
        updateMessage(replyId, { content: err?.message || "Terjadi kesalahan.", pending: false, error: true });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([WELCOME]);
  }

  return (
    <div
      className="flex h-[calc(100dvh-9rem)] min-h-[420px] flex-col overflow-hidden rounded-3xl"
      style={{ border: "1px solid var(--border-hairline)" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 sm:px-5"
        style={{ borderBottom: "1px solid var(--border-hairline)" }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: "var(--yellow)", color: "var(--on-color)" }}
          aria-hidden
        >
          C
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold leading-tight">Coach</h1>
          <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
            Pelatih lari pribadimu, membaca data COROS
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={messages.length <= 1 && !busy}
          className="btn-secondary"
        >
          Percakapan baru
        </button>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
        style={{ background: "#0f0f13" }}
        aria-live="polite"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm sm:max-w-[78%] ${
                m.role === "user" ? "whitespace-pre-wrap rounded-br-md" : "rounded-bl-md"
              }`}
              style={
                m.role === "user"
                  ? { backgroundColor: "var(--pink)", color: "var(--on-color)" }
                  : {
                      backgroundColor: "var(--surface-2)",
                      color: "var(--text-primary)",
                      border: `1px solid ${m.error ? "var(--pink)" : "transparent"}`,
                    }
              }
            >
              {m.role === "user" ? (
                m.content
              ) : m.pending && !m.content ? (
                <span className="inline-flex gap-1 py-1" aria-label="Coach sedang mengetik">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-2 w-2 animate-bounce rounded-full"
                      style={{ backgroundColor: "var(--yellow)", animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <Markdown text={m.content} />
              )}
            </div>
          </div>
        ))}

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="pill min-h-[40px] px-4 font-medium transition-colors hover:text-[var(--text-primary)]"
                style={{ border: "1px solid var(--baseline)", color: "var(--text-secondary)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 p-3 sm:p-4"
        style={{ borderTop: "1px solid var(--border-hairline)" }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Tanya Coach…"
          aria-label="Pesan untuk Coach"
          className="field max-h-40 flex-1 resize-none rounded-3xl py-3"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="btn-secondary h-12 shrink-0"
          >
            Hentikan
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-primary h-12 w-auto shrink-0 rounded-full px-5"
          >
            Kirim
          </button>
        )}
      </form>
      <p className="px-4 pb-2 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
        Coach bisa keliru. Saran bersifat umum, bukan nasihat medis.
      </p>
    </div>
  );
}
