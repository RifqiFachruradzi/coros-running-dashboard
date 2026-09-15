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
      ? "var(--status-good)"
      : delta?.tone === "warning"
      ? "var(--status-warning)"
      : "var(--text-muted)";

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <p
        className="text-xs mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p style={{ color: "var(--text-primary)" }}>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {unit && (
          <span
            className="text-xs ml-1"
            style={{ color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        )}
      </p>
      {delta && (
        <p className="text-xs mt-1" style={{ color: deltaColor }}>
          {delta.text}
        </p>
      )}
    </div>
  );
}
