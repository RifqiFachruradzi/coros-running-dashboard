export function StatTile({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; tone: "good" | "warning" | "neutral" };
}) {
  const deltaColor =
    delta?.tone === "good"
      ? "var(--status-good-text)"
      : delta?.tone === "warning"
      ? "var(--status-critical)"
      : "var(--text-muted)";

  return (
    <div className="card flex flex-col p-4">
      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1" style={{ color: "var(--text-primary)" }}>
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </p>
      {delta && (
        <p className="mt-1 text-xs" style={{ color: deltaColor }}>
          {delta.text}
        </p>
      )}
    </div>
  );
}
