import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { RunActivity } from "@/lib/types";
import type { Readiness, Recommendation } from "@/lib/coach";
import Link from "next/link";
import { formatClock, formatDay, formatPace } from "@/lib/aggregate";
import type { RouteSuggestion } from "@/lib/insights";
import { Icon } from "@/components/icons";

export const READINESS_LABEL: Record<Readiness, { text: string; color: string }> = {
  siap_intensitas: { text: "Siap latihan intensitas", color: "var(--blue)" },
  latihan_ringan: { text: "Latihan ringan saja", color: "var(--yellow)" },
  istirahat: { text: "Sebaiknya istirahat", color: "var(--pink)" },
};

// The routine runs nightly; anything older means it has probably stopped.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export function isRecommendationStale(generatedAt: string): boolean {
  return Date.now() - Date.parse(generatedAt) > STALE_AFTER_MS;
}

export function generatedAgo(generatedAt: string): string {
  return formatDistanceToNow(new Date(generatedAt), { addSuffix: true, locale: id });
}

function CardIcon({ name }: { name: "calendar" | "runner" }) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
      style={{ background: "rgba(10, 10, 12, 0.12)" }}
    >
      <Icon name={name} size={24} />
    </span>
  );
}

/** Yellow card: tomorrow's session from the AI coach. */
export function TomorrowCard({
  recommendation,
  route,
}: {
  recommendation: Recommendation | null;
  /** The saved route that best fits tomorrow's distance */
  route?: RouteSuggestion;
}) {
  const tomorrow = recommendation?.tomorrow;
  const readiness = recommendation ? READINESS_LABEL[recommendation.readiness] : null;

  return (
    <div
      data-animate="rise"
      className="flex flex-col gap-3 rounded-[26px] p-5"
      style={{ background: "var(--yellow)", color: "var(--on-color)" }}
    >
      <div className="flex items-center gap-3.5">
        <CardIcon name="calendar" />
        <div className="min-w-0">
          <p className="text-xs">Latihan besok</p>
          <p className="text-lg font-semibold leading-snug">{tomorrow?.title ?? "Belum ada rekomendasi"}</p>
        </div>
      </div>
      {tomorrow ? (
        <div className="flex flex-wrap gap-2">
          {tomorrow.distanceKm !== null && (
            <span className="pill" style={{ background: "rgba(10, 10, 12, 0.12)" }}>
              {tomorrow.distanceKm} km
            </span>
          )}
          {tomorrow.targetPace && (
            <span className="pill" style={{ background: "rgba(10, 10, 12, 0.12)" }}>
              Pace {tomorrow.targetPace}/km
            </span>
          )}
          {readiness && (
            <span className="pill" style={{ background: "var(--on-color)", color: "var(--yellow)" }}>
              <span aria-hidden className="dot" style={{ background: readiness.color }} />
              {readiness.text}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm">Routine AI membuatnya setiap malam sekitar pukul 23:30 WIB.</p>
      )}
      {tomorrow?.notes && <p className="text-sm leading-relaxed">{tomorrow.notes}</p>}
      {route && (
        <Link
          href="/rute"
          className="link flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs"
          style={{ background: "rgba(10, 10, 12, 0.12)" }}
        >
          <Icon name="map" size={16} />
          <span className="min-w-0 flex-1">
            Rute: <strong>{route.route.name}</strong>
            {route.laps > 1 && ` ${route.laps}×`} = {route.totalKm.toFixed(1)} km
            {route.estimatedSeconds && ` · ±${formatClock(route.estimatedSeconds)}`}
          </span>
          <Icon name="chevronRight" size={14} />
        </Link>
      )}
    </div>
  );
}

/** Pink card: the most recent run. */
export function LastRunCard({ run }: { run: RunActivity | undefined }) {
  return (
    <div
      data-animate="rise"
      className="flex min-h-[180px] flex-1 flex-col gap-3 rounded-[26px] p-5"
      style={{ background: "var(--pink)", color: "var(--on-color)" }}
    >
      <div className="flex items-center gap-3.5">
        <CardIcon name="runner" />
        <p className="text-base font-semibold">Lari terakhir</p>
      </div>
      {run ? (
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px]">
              Pace {formatPace(run.avgPaceSecPerKm)}/km
              {run.avgHeartRate !== null && ` · ${run.avgHeartRate} bpm`}
            </p>
            <p className="text-3xl font-bold leading-tight tabular-nums">{run.distanceKm.toFixed(2)} km</p>
            <p className="truncate text-xs">
              {formatDay(run.date)}
              {run.location && ` · ${run.location}`}
            </p>
          </div>
          <Link
            href={`/aktivitas/${run.labelId}`}
            aria-label="Analisis lari terakhir"
            className="icon-button rounded-full"
            style={{ background: "var(--on-color)", color: "var(--pink)" }}
          >
            <Icon name="chevronRight" size={18} strokeWidth={2.4} />
          </Link>
        </div>
      ) : (
        <p className="mt-auto text-sm">Belum ada lari tercatat.</p>
      )}
    </div>
  );
}
