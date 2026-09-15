import { formatWeekdayShort } from "@/lib/aggregate";
import type { PlannedSession, SessionProgress, SessionStatus } from "@/lib/coach";

const STATUS: Record<SessionStatus, { text: string; color: string }> = {
  selesai: { text: "Selesai", color: "var(--status-good)" },
  terlewat: { text: "Terlewat", color: "var(--status-critical)" },
  hari_ini: { text: "Hari ini", color: "var(--series-1)" },
  akan_datang: { text: "Mendatang", color: "var(--baseline)" },
};

export function describeSession(s: Pick<PlannedSession, "distanceKm" | "targetPace">): string {
  return [s.distanceKm !== null && `${s.distanceKm} km`, s.targetPace && `${s.targetPace}/km`]
    .filter(Boolean)
    .join(" · ");
}

export function SessionList({ sessions }: { sessions: (PlannedSession | SessionProgress)[] }) {
  return (
    <ul>
      {sessions.map((s, i) => {
        const progress = "status" in s ? s : null;
        const details = describeSession(s);
        return (
          <li
            key={s.day}
            className="flex items-start gap-3 py-2.5"
            style={{ borderTop: i > 0 ? "1px solid var(--gridline)" : undefined }}
          >
            <div className="inset w-11 shrink-0 py-1 text-center">
              <p className="text-[10px] uppercase leading-tight tracking-wide" style={{ color: "var(--text-muted)" }}>
                {progress ? formatWeekdayShort(progress.date) : "Hari"}
              </p>
              <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                {progress ? Number(progress.date.slice(8)) : s.day}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {s.title}
              </p>
              {details && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {details}
                </p>
              )}
              {s.notes && (
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.notes}
                </p>
              )}
            </div>

            {progress && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="pill">
                  <span aria-hidden className="dot" style={{ background: STATUS[progress.status].color }} />
                  {STATUS[progress.status].text}
                </span>
                {progress.actualKm > 0 && (
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {progress.actualKm.toFixed(2)} km
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
