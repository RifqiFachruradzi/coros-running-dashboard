import type { Tone } from "@/components/GoalCard";

/**
 * A small figure on a tinted tile. `solid` paints the tile in the full pink
 * for the one figure worth calling out.
 */
export function StatTile({
  label,
  value,
  unit,
  note,
  tone = "neutral",
  solid = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: Tone;
  solid?: boolean;
}) {
  if (solid) {
    return (
      <div data-animate="rise" className="tile" style={{ background: "var(--pink)", color: "var(--on-color)" }}>
        <p className="text-xs">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {value}
          {unit && <span className="ml-1 text-xs font-medium">{unit}</span>}
        </p>
        {note && <p className="text-[11px]">{note}</p>}
      </div>
    );
  }

  return (
    <div data-animate="rise" className={`tile tone-${tone}`}>
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {unit}
          </span>
        )}
      </p>
      {note && (
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {note}
        </p>
      )}
    </div>
  );
}
