import { Icon, type IconName } from "@/components/icons";

export type Tone = "pink" | "yellow" | "blue" | "neutral";

const SOLID: Record<Exclude<Tone, "neutral">, string> = {
  pink: "var(--pink)",
  yellow: "var(--yellow)",
  blue: "var(--blue)",
};

/**
 * A goal with a progress bar, under a colored icon badge that overlaps the
 * card's top edge (the parent leaves room for it with top padding).
 */
export function GoalCard({
  icon,
  tone,
  title,
  subtitle,
  ratio,
  footer,
  badge,
}: {
  icon: IconName;
  tone: Exclude<Tone, "neutral">;
  title: string;
  subtitle: string;
  /** 0–1 */
  ratio: number;
  footer: string;
  badge?: string;
}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  const color = SOLID[tone];

  return (
    <div data-animate="rise" className="card flex flex-col items-center px-5 pb-5 text-center">
      <span
        className="-mt-7 flex h-14 w-14 items-center justify-center rounded-[18px]"
        style={{ background: color, color: "var(--on-color)" }}
      >
        <Icon name={icon} size={26} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {subtitle}
      </p>
      <div className="mt-4 flex w-full justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>Progres</span>
        <span className="font-semibold tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progres ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="track mt-1.5 w-full"
      >
        <div data-animate="bar" className="h-full rounded-full" style={{ width: `${Math.max(percent, 2)}%`, background: color }} />
      </div>
      <div className="mt-3.5 flex w-full items-center justify-between gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span className="tabular-nums">{footer}</span>
        {badge && <span className={`pill tone-${tone}`}>{badge}</span>}
      </div>
    </div>
  );
}
