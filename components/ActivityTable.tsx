import type { RunActivity } from "@/lib/types";

function formatPace(secPerKm: number | null): string {
  if (secPerKm === null) return "—";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function ActivityTable({ runs }: { runs: RunActivity[] }) {
  const recent = runs.slice(0, 10);

  if (recent.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Belum ada aktivitas lari yang tercatat.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
        <thead>
          <tr
            className="text-left text-xs"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--gridline)" }}
          >
            <th className="py-2 pr-3 font-medium">Tanggal</th>
            <th className="py-2 pr-3 font-medium">Lokasi</th>
            <th className="py-2 pr-3 font-medium text-right">Jarak</th>
            <th className="py-2 pr-3 font-medium text-right">Durasi</th>
            <th className="py-2 pr-3 font-medium text-right">Pace</th>
            <th className="py-2 pr-3 font-medium text-right">HR</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((run) => (
            <tr
              key={run.labelId}
              style={{ borderBottom: "1px solid var(--gridline)" }}
            >
              <td className="py-2 pr-3 whitespace-nowrap">{run.date}</td>
              <td className="py-2 pr-3" style={{ color: "var(--text-secondary)" }}>
                {run.location ?? "—"}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {run.distanceKm.toFixed(2)} km
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatDuration(run.durationSeconds)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatPace(run.avgPaceSecPerKm)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {run.avgHeartRate ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
