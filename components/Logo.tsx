// STRIDE+ brand: a lightning bolt drawn as a slanted "S", with pointed tips
// top-right and bottom-left and a bolt notch where the curves meet.

const BOLT_S = "M27.5 3.5 L12 5 L6.2 17.2 L16.4 16.2 L12.6 24.4 L4.5 28.5 L19.8 27 L26 12.4 L15.6 13.4 L17.6 8.6 Z";

/**
 * The bare bolt mark. `fill` defaults to the yellow→pink brand gradient.
 * `id` keeps each instance's gradient separate: a gradient defined inside a
 * hidden copy (e.g. the sidebar mark on phones) would not render for others.
 */
export function BoltS({
  size = 24,
  fill,
  title,
  id = "mark",
}: {
  size?: number;
  fill?: string;
  title?: string;
  id?: string;
}) {
  const gradientId = `stride-bolt-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {!fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd23f" />
            <stop offset="1" stopColor="#ff4f9a" />
          </linearGradient>
        </defs>
      )}
      <path d={BOLT_S} fill={fill ?? `url(#${gradientId})`} />
    </svg>
  );
}

/** Black badge with the gradient bolt, plus the STRIDE+ wordmark. */
export function Brand({ size = "md", tagline }: { size?: "md" | "lg"; tagline?: string }) {
  const lg = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex shrink-0 items-center justify-center ${lg ? "h-14 w-14 rounded-[18px]" : "h-11 w-11 rounded-2xl"}`}
        style={{ background: "var(--on-color)", boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)" }}
      >
        <BoltS size={lg ? 36 : 28} id={`brand-${size}`} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-bold italic tracking-tight ${lg ? "text-3xl" : "text-xl"}`}>
          STRIDE<span style={{ color: "var(--yellow)" }}>+</span>
        </span>
        {tagline && (
          <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
            {tagline}
          </span>
        )}
      </span>
    </div>
  );
}
