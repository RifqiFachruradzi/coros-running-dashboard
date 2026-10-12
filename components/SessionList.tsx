import { formatWeekdayShort } from "@/lib/aggregate";
import type { PlannedSession, SessionProgress, SessionStatus } from "@/lib/coach";

const STATUS: Record<SessionStatus, { text: string; tone: string }> = {
  selesai: { text: "Selesai", tone: "tone-blue" },
  terlewat: { text: "Terlewat", tone: "tone-pink" },
  hari_ini: { text: "Hari ini", tone: "tone-yellow" },
  akan_datang: { text: "Mendatang", tone: "tone-neutral" },
};

export function describeSession(s: Pick<PlannedSession, "distanceKm" | "targetPace">): string {
  return [s.distanceKm !== null && `${s.distanceKm} km`, s.targetPace && `${s.targetPace}/km`]
    .filter(Boolean)
    .join(" · ");
}

export function SessionList({ sessions }: { sessions: (PlannedSession | SessionProgress)[] }) {
  // The first session still to run gets the solid pink date badge.
  const nextIndex = sessions.findIndex(
    (s) => "status" in s && (s.status === "hari_ini" || s.status === "akan_datang")
  );

  return (
    <ul className="space-y-2">
      {sessions.map((s, i) => {
        const progress = "status" in s ? s : null;
        const details = describeSession(s);
        const highlight = i === nextIndex;
        return (
          <li
            key={s.day}
            className="flex items-center gap-3.5 rounded-2xl p-3"
            style={{ background: "var(--surface-1)" }}
          >
            <div
              className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] leading-tight ${
                highlight ? "" : "tone-blue"
              }`}
              style={highlight ? { background: "var(--pink)", color: "var(--on-color)" } : undefined}
            >
              <span className="text-[10px] uppercase">{progress ? formatWeekdayShort(progress.date) : "Hari"}</span>
              <span className="text-base font-bold">{progress ? Number(progress.date.slice(8)) : s.day}</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{s.title}</p>
              {(details || s.notes) && (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {[details, s.notes].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {progress && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`pill ${STATUS[progress.status].tone}`}>{STATUS[progress.status].text}</span>
                {progress.actualKm > 0 && (
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
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
