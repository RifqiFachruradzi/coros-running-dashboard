export function ChartCard({
  title,
  subtitle,
  headline,
  headlineColor,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** The latest value, shown large next to the title */
  headline?: string;
  headlineColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-animate="rise" className="card p-5">
      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {headline && (
            <span className="text-xl font-bold tabular-nums" style={{ color: headlineColor }}>
              {headline}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
