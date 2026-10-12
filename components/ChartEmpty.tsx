export function ChartEmpty({ text }: { text: string }) {
  return (
    <div
      className="flex h-full min-h-[8rem] items-center justify-center rounded-2xl px-4 text-center text-xs"
      style={{ border: "1px dashed currentColor", opacity: 0.7 }}
    >
      {text}
    </div>
  );
}
