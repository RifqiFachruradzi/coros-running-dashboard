import { formatDay, type WeekProgress } from "@/lib/aggregate";

export function WeeklyTargetCard({
  progress,
  subtitle,
}: {
  progress: WeekProgress;
  /** Replaces the default "since Monday" line, e.g. for a program week */
  subtitle?: string;
}) {
  const { km, targetKm, daysLeft, weekStart } = progress;
  const ratio = targetKm > 0 ? Math.min(km / targetKm, 1) : 1;
  const done = km >= targetKm;

  const message = done
    ? `✓ Target tercapai${km > targetKm ? ` (+${(km - targetKm).toFixed(1)} km)` : ""}`
    : `Sisa ${(targetKm - km).toFixed(1)} km · ${
        daysLeft === 1 ? "hari terakhir minggu ini" : `${daysLeft} hari lagi`
      }`;

  return (
    <div className="card flex h-full flex-col p-5 sm:p-6">
      <p className="eyebrow">Target minggu ini</p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {subtitle ?? `Sejak Senin, ${formatDay(weekStart)}`}
      </p>

      <p className="mt-5 flex flex-wrap items-baseline gap-x-2" style={{ color: "var(--text-primary)" }}>
        <span className="text-5xl font-semibold tracking-tight">{km.toFixed(1)}</span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          / {targetKm} km
        </span>
      </p>

      <div className="mt-auto pt-6">
        <div
          role="progressbar"
          aria-label="Progress target mingguan"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          className="track"
          style={{ backgroundColor: "color-mix(in srgb, var(--series-2) 16%, var(--surface-1))" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${ratio * 100}%`,
              background: done ? "var(--status-good)" : "var(--series-2)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span style={{ color: "var(--text-secondary)" }}>{message}</span>
          <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
            {Math.round(ratio * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
