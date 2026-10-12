const STEPS = [
  {
    title: "Pilih program",
    text: "Terima salah satu program dari Coach. Hari kamu menerimanya dihitung sebagai hari pertama.",
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

const TONES = ["tone-pink", "tone-yellow", "tone-blue"];

export function NoProgramCard() {
  return (
    <div data-animate="rise" className="card flex flex-col p-5 sm:p-6">
      <p className="eyebrow">Program latihan</p>
      <h3 className="mt-0.5 text-lg font-semibold">Belum ada program aktif</h3>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${TONES[i]}`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{step.title}</p>
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
