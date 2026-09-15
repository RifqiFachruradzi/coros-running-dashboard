const STEPS = [
  {
    title: "Pilih program",
    text: "Terima salah satu program di bawah. Hari kamu menerimanya dihitung sebagai hari pertama.",
  },
  {
    title: "Lari seperti biasa",
    text: "Rekam lari dengan jam COROS. Data ditarik otomatis setiap malam.",
  },
  {
    title: "Pantau progres",
    text: "Sesi ditandai selesai kalau jarak lari hari itu mencapai 90% rencana, dan target mingguan ikut program.",
  },
];

export function NoProgramCard() {
  return (
    <div className="card flex flex-col p-5 sm:p-6">
      <p className="eyebrow">Program latihan</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
        Belum ada program aktif
      </h3>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="inset flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {step.title}
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
