export function ChartEmpty({ text }: { text: string }) {
  return (
    <div
      className="inset flex h-48 items-center justify-center px-4 text-center text-xs"
      style={{ color: "var(--text-muted)" }}
    >
      {text}
    </div>
  );
}
