import Link from "next/link";
import type { RunActivity } from "@/lib/types";
import { formatClock, formatDay, formatPace } from "@/lib/aggregate";

export function ActivityTable({ runs, limit = 10 }: { runs: RunActivity[]; limit?: number }) {
  const recent = runs.slice(0, limit);

  if (recent.length === 0) {
    return (
      <p className="p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        Belum ada aktivitas lari yang tercatat.
      </p>
    );
  }

  const cell = "px-3 py-3";
  const edgeLeft = "pl-4 sm:pl-5";
  const edgeRight = "pr-4 sm:pr-5";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs" style={{ color: "var(--text-secondary)", background: "var(--surface-2)" }}>
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
              className="transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderTop: "1px solid var(--gridline)" }}
            >
              <td className={`${cell} ${edgeLeft} whitespace-nowrap font-semibold`}>
                <Link href={`/aktivitas/${run.labelId}`} className="link underline-offset-4 hover:underline">
                  {formatDay(run.date)}
                </Link>
                {run.location && (
                  <span className="block text-xs font-normal sm:hidden" style={{ color: "var(--text-secondary)" }}>
                    {run.location}
                  </span>
                )}
              </td>
              <td className={`${cell} hidden sm:table-cell`} style={{ color: "var(--text-secondary)" }}>
                {run.location ?? "—"}
              </td>
              <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>
                {run.distanceKm.toFixed(2)} km
              </td>
              <td className={`${cell} text-right tabular-nums`}>{formatClock(run.durationSeconds)}</td>
              <td className={`${cell} whitespace-nowrap text-right tabular-nums`}>
                {run.avgPaceSecPerKm === null ? "—" : `${formatPace(run.avgPaceSecPerKm)}/km`}
              </td>
              <td className={`${cell} ${edgeRight} text-right tabular-nums`}>{run.avgHeartRate ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
