import type { RunActivity } from "@/lib/types";
import { formatClock, formatDay, formatPace } from "@/lib/aggregate";

export function ActivityTable({ runs }: { runs: RunActivity[] }) {
  const recent = runs.slice(0, 10);

  if (recent.length === 0) {
    return (
      <p className="p-5 text-sm" style={{ color: "var(--text-muted)" }}>
        Belum ada aktivitas lari yang tercatat.
      </p>
    );
  }

  const cell = "px-3 py-3";
  const edgeLeft = "pl-4 sm:pl-5";
  const edgeRight = "pr-4 sm:pr-5";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
        <thead>
          <tr
            className="text-left text-xs"
            style={{ color: "var(--text-muted)", background: "var(--page-plane)" }}
          >
            <th className={`${cell} ${edgeLeft} font-medium`}>Tanggal</th>
            <th className={`${cell} hidden font-medium sm:table-cell`}>Lokasi</th>
            <th className={`${cell} text-right font-medium`}>Jarak</th>
            <th className={`${cell} text-right font-medium`}>Durasi</th>
            <th className={`${cell} text-right font-medium`}>Pace</th>
            <th className={`${cell} ${edgeRight} text-right font-medium`}>HR</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((run) => (
            <tr
              key={run.labelId}
              className="transition-colors hover:bg-[var(--page-plane)]"
              style={{ borderTop: "1px solid var(--gridline)" }}
            >
              <td className={`${cell} ${edgeLeft} whitespace-nowrap`}>
                {formatDay(run.date)}
                {run.location && (
                  <span className="block text-xs sm:hidden" style={{ color: "var(--text-muted)" }}>
                    {run.location}
                  </span>
                )}
              </td>
              <td className={`${cell} hidden sm:table-cell`} style={{ color: "var(--text-secondary)" }}>
                {run.location ?? "—"}
              </td>
              <td className={`${cell} whitespace-nowrap text-right tabular-nums font-medium`}>
                {run.distanceKm.toFixed(2)} km
              </td>
              <td className={`${cell} text-right tabular-nums`}>{formatClock(run.durationSeconds)}</td>
              <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>
                {run.avgPaceSecPerKm === null ? "—" : `${formatPace(run.avgPaceSecPerKm)}/km`}
              </td>
              <td className={`${cell} ${edgeRight} text-right tabular-nums`}>
                {run.avgHeartRate ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
