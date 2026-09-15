import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Readiness, Recommendation } from "@/lib/coach";

const READINESS_LABEL: Record<Readiness, { text: string; color: string }> = {
  siap_intensitas: { text: "Siap latihan intensitas", color: "var(--status-good)" },
  latihan_ringan: { text: "Latihan ringan saja", color: "var(--status-warning)" },
  istirahat: { text: "Sebaiknya istirahat", color: "var(--status-serious)" },
};

// The routine runs nightly; anything older means it has probably stopped.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { readiness, summary, tomorrow, warnings, generatedAt } = recommendation;
  const label = READINESS_LABEL[readiness];
  const stale = Date.now() - Date.parse(generatedAt) > STALE_AFTER_MS;

  return (
    <div
      className="card p-5 sm:p-6"
      style={{ backgroundImage: "linear-gradient(180deg, var(--accent-wash), transparent 55%)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Rekomendasi hari ini</p>
        <span
          className="text-xs"
          style={{ color: stale ? "var(--status-critical)" : "var(--text-muted)" }}
        >
          {formatDistanceToNow(new Date(generatedAt), { addSuffix: true, locale: id })}
          {stale && " · routine mungkin berhenti"}
        </span>
      </div>

      <span className="pill mt-3">
        <span aria-hidden className="dot" style={{ background: label.color }} />
        <span style={{ color: "var(--text-primary)" }}>{label.text}</span>
      </span>

      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {summary}
      </p>

      <div className="inset mt-4 p-4">
        <p className="eyebrow">Latihan besok</p>
        <p className="mt-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {tomorrow.title}
        </p>
        {(tomorrow.distanceKm !== null || tomorrow.targetPace) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tomorrow.distanceKm !== null && <span className="pill">{tomorrow.distanceKm} km</span>}
            {tomorrow.targetPace && <span className="pill">Pace {tomorrow.targetPace}/km</span>}
          </div>
        )}
        {tomorrow.notes && (
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            {tomorrow.notes}
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <ul className="mt-4 space-y-2">
          {warnings.map((warning, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <span aria-hidden className="shrink-0" style={{ color: "var(--status-warning)" }}>
                ⚠
              </span>
              {warning}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Dibuat otomatis oleh AI dari data COROS — bukan saran medis.
      </p>
    </div>
  );
}
