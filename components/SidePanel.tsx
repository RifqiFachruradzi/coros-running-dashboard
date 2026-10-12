import Link from "next/link";
import type { BodySnapshot, RunActivity } from "@/lib/types";
import type { Recommendation } from "@/lib/coach";
import { formatDay, formatPace } from "@/lib/aggregate";
import { Icon } from "@/components/icons";
import { generatedAgo, isRecommendationStale } from "@/components/HighlightCards";

const RUN_TONES = ["tone-pink", "tone-blue", "tone-yellow"];

function PanelTitle({ icon, children }: { icon: "pulse" | "heart"; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <span style={{ color: "var(--pink-text)" }}>
        <Icon name={icon} size={18} />
      </span>
      {children}
    </h2>
  );
}

export function RecentRuns({ runs }: { runs: RunActivity[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <PanelTitle icon="pulse">Aktivitas</PanelTitle>
        <Link href="/riwayat" className="link py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          Lihat semua
        </Link>
      </div>
      {runs.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Belum ada lari tercatat.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {runs.slice(0, 4).map((run, i) => (
            <li key={run.labelId} data-animate="rise">
              <Link
                href={`/aktivitas/${run.labelId}`}
                className="link -mx-2 flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-[var(--surface-2)]"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    RUN_TONES[i % RUN_TONES.length]
                  }`}
                  aria-hidden
                >
                  {run.distanceKm.toFixed(1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {run.distanceKm.toFixed(2)} km{run.location && ` · ${run.location}`}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {formatPace(run.avgPaceSecPerKm)}/km
                    {run.avgHeartRate !== null && ` · ${run.avgHeartRate} bpm`} · {formatDay(run.date)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Latest non-empty value of each body metric, with how many days had data. */
export function BodyTiles({ history }: { history: BodySnapshot[] }) {
  const latest = (key: "restingHeartRate" | "sleepScore" | "stressLevel") =>
    [...history].reverse().find((b) => b[key] !== null)?.[key] ?? null;
  const last30 = history.slice(-30);
  const rhrDays = last30.filter((b) => b.restingHeartRate !== null).length;

  const tiles = [
    { label: "Resting HR", value: latest("restingHeartRate"), tone: "tone-pink" },
    { label: "Sleep", value: latest("sleepScore"), tone: "tone-blue" },
    { label: "Stres", value: latest("stressLevel"), tone: "tone-yellow" },
  ];

  return (
    <section className="flex flex-col gap-3 pt-5" style={{ borderTop: "1px solid var(--border-hairline)" }}>
      <PanelTitle icon="heart">Kondisi tubuh</PanelTitle>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {tiles.map((t) => (
          <div key={t.label} data-animate="rise" className={`rounded-2xl px-1 py-3 ${t.tone}`}>
            <dd className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {t.value ?? "—"}
            </dd>
            <dt className="text-[10px]">{t.label}</dt>
          </div>
        ))}
      </dl>
      {rhrDays < 15 && (
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Resting HR hanya ada {rhrDays} dari {last30.length} hari terakhir.
        </p>
      )}
    </section>
  );
}

export function CoachNote({ recommendation }: { recommendation: Recommendation | null }) {
  const stale = recommendation ? isRecommendationStale(recommendation.generatedAt) : false;

  return (
    <section data-animate="rise" className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: "var(--blue)", color: "var(--on-color)" }}
          aria-hidden
        >
          C
        </span>
        <div>
          <h2 className="text-sm font-semibold">Kata Coach</h2>
          {recommendation && (
            <p className="text-[11px]" style={{ color: stale ? "var(--pink-text)" : "var(--text-secondary)" }}>
              {generatedAgo(recommendation.generatedAt)}
              {stale && " · routine mungkin berhenti"}
            </p>
          )}
        </div>
      </div>
      {recommendation ? (
        <>
          <p className="text-xs leading-relaxed" style={{ color: "#d8d8de" }}>
            {recommendation.summary}
          </p>
          {recommendation.warnings.map((warning, i) => (
            <p key={i} className="tone-yellow rounded-xl px-3 py-2.5 text-[11px] leading-relaxed">
              {warning}
            </p>
          ))}
        </>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Belum ada rekomendasi. Routine AI membuatnya setiap malam sekitar pukul 23:30 WIB.
        </p>
      )}
      <Link href="/chat" className="btn-primary">
        Tanya Coach
      </Link>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        Dibuat otomatis oleh AI dari data COROS — bukan saran medis.
      </p>
    </section>
  );
}
