import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readBodyHistory, readFitnessHistory, readLoadHistory, readRuns } from "@/lib/data-store";
import { formatClock, formatDay, formatPace } from "@/lib/aggregate";
import { analyzeWorkout, efficiencySeries, MIN_RECORD_KM, type PrKind } from "@/lib/insights";
import { AppShell, PageHeader } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { ChartCard } from "@/components/ChartCard";
import { TrendLineChart } from "@/components/TrendLineChart";
import { Icon, type IconName } from "@/components/icons";
import type { Tone } from "@/components/GoalCard";
import { formatNumber, formatSignedPace } from "@/components/format";

export const revalidate = 0;

export const metadata: Metadata = { title: "Analisis lari — Dashboard Lari" };

const PR_TEXT: Record<PrKind, string> = {
  longest: "Rekor lari terjauh",
  fastest_pace: "Rekor pace tercepat",
  fastest_5k: "Rekor 5K",
  fastest_10k: "Rekor 10K",
};

const EFFORT_TEXT = { ringan: "ringan", sedang: "sedang", berat: "berat" } as const;

function Insight({
  icon,
  tone,
  title,
  children,
}: {
  icon: IconName;
  tone: Exclude<Tone, "neutral">;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div data-animate="rise" className="card flex gap-4 p-4 sm:p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl tone-${tone}`}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [runs, load, body, fitness] = await Promise.all([
    readRuns(),
    readLoadHistory(),
    readBodyHistory(),
    readFitnessHistory(),
  ]);
  const sorted = [...runs].sort((a, b) => b.startTimestamp - a.startTimestamp);
  const index = sorted.findIndex((r) => r.labelId === id);
  if (index < 0) notFound();

  const run = sorted[index];
  const newer = sorted[index - 1];
  const older = sorted[index + 1];
  const a = analyzeWorkout(run, runs, { load, body, fitness });
  const similarRuns = sorted
    .filter(
      (r) =>
        r.avgPaceSecPerKm !== null &&
        r.distanceKm >= MIN_RECORD_KM &&
        Math.abs(r.distanceKm - run.distanceKm) <= run.distanceKm * 0.25
    )
    .sort((x, y) => x.avgPaceSecPerKm! - y.avgPaceSecPerKm!);

  const question = `Tolong analisis lariku tanggal ${formatDay(run.date)} (${run.distanceKm.toFixed(2)} km, pace ${formatPace(
    run.avgPaceSecPerKm
  )}/km, HR ${run.avgHeartRate ?? "-"} bpm). Apa yang sudah bagus dan apa yang perlu diperbaiki?`;

  const stats = [
    { label: "Jarak", value: `${run.distanceKm.toFixed(2)} km` },
    { label: "Durasi", value: formatClock(run.durationSeconds) },
    { label: "Pace rata-rata", value: `${formatPace(run.avgPaceSecPerKm)}/km` },
    { label: "HR rata-rata", value: run.avgHeartRate !== null ? `${run.avgHeartRate} bpm` : "—" },
    { label: "Kalori", value: run.calories !== null ? `${run.calories} kkal` : "—" },
  ];

  const effChange =
    a.efficiency !== null && a.efficiencyBaseline ? (a.efficiency / a.efficiencyBaseline - 1) * 100 : null;

  return (
    <AppShell active="/riwayat">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8 lg:py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/riwayat" className="btn-secondary gap-1.5">
            <Icon name="chevronLeft" size={16} /> Riwayat
          </Link>
          <div className="flex gap-2">
            {older && (
              <Link href={`/aktivitas/${older.labelId}`} className="btn-secondary gap-1.5" aria-label="Lari sebelumnya">
                <Icon name="chevronLeft" size={16} /> {formatDay(older.date)}
              </Link>
            )}
            {newer && (
              <Link href={`/aktivitas/${newer.labelId}`} className="btn-secondary gap-1.5" aria-label="Lari berikutnya">
                {formatDay(newer.date)} <Icon name="chevronRight" size={16} />
              </Link>
            )}
          </div>
        </div>

        <PageHeader
          eyebrow={`Analisis lari · ${run.location ?? "Lari"}`}
          title={formatDay(run.date)}
          description={`Lari ke-${sorted.length - index} dari ${sorted.length} yang tercatat.`}
          action={
            <Link href={`/chat?tanya=${encodeURIComponent(question)}`} className="btn-primary w-auto gap-2 px-5">
              <Icon name="chat" size={18} /> Tanya Coach soal lari ini
            </Link>
          }
        />

        <div
          data-animate="rise"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-[26px] sm:grid-cols-5"
          style={{ background: "var(--blue)", color: "var(--on-color)" }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
              style={i === 0 ? { background: "var(--on-color)", color: "var(--yellow)" } : undefined}
            >
              <p className="text-xs" style={i === 0 ? { color: "var(--text-secondary)" } : undefined}>
                {s.label}
              </p>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {a.prs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {a.prs.map((pr) => (
              <span key={pr.kind} className="pill tone-yellow px-4 py-2 text-sm">
                <Icon name="medal" size={16} /> {PR_TEXT[pr.kind]}
                {pr.previous !== null &&
                  (pr.kind === "longest"
                    ? ` · +${(pr.value - pr.previous).toFixed(2)} km`
                    : ` · ${Math.round(pr.previous - pr.value)} dtk/km lebih cepat`)}
              </span>
            ))}
          </div>
        )}

        <section>
          <SectionHeader
            title="Insight"
            description="Dibandingkan dengan lari-larimu sendiri. COROS hanya mengirim ringkasan per lari, jadi analisis per km belum tersedia."
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {a.paceDeltaSec !== null && a.baseline.paceSec !== null ? (
              <Insight icon="trend" tone="blue" title="Pace dibanding 30 hari terakhir">
                {formatPace(run.avgPaceSecPerKm)}/km, {formatSignedPace(a.paceDeltaSec)} dari rata-rata{" "}
                {formatPace(a.baseline.paceSec)}/km ({a.baseline.runs} lari sebelumnya).{" "}
                {a.paceDeltaSec < -10
                  ? "Lebih cepat dari biasanya."
                  : a.paceDeltaSec > 10
                  ? "Lebih santai dari biasanya."
                  : "Sesuai pace biasamu."}
              </Insight>
            ) : (
              <Insight icon="trend" tone="blue" title="Pace dibanding 30 hari terakhir">
                Belum ada lari dalam 30 hari sebelumnya untuk dibandingkan.
              </Insight>
            )}

            {a.hrDelta !== null && a.baseline.hr !== null && (
              <Insight icon="heart" tone="pink" title="Detak jantung">
                {run.avgHeartRate} bpm, {a.hrDelta >= 0 ? "+" : "−"}
                {Math.abs(Math.round(a.hrDelta))} bpm dari rata-rata {Math.round(a.baseline.hr)} bpm.{" "}
                {a.effort &&
                  `Intensitas ${EFFORT_TEXT[a.effort.level]}: HR-nya lebih tinggi dari ${a.effort.percentile}% larimu.`}
              </Insight>
            )}

            {a.efficiency !== null && (
              <Insight icon="pulse" tone="yellow" title="Efisiensi aerobik">
                {formatNumber(a.efficiency, 2)} meter per detak jantung
                {effChange !== null && a.efficiencyBaseline
                  ? `, ${effChange >= 0 ? "+" : "−"}${formatNumber(Math.abs(effChange))}% dari rata-rata ${formatNumber(
                      a.efficiencyBaseline,
                      2
                    )}. ${effChange >= 2 ? "Makin efisien: lebih cepat untuk detak yang sama." : effChange <= -2 ? "Lebih berat dari biasanya; bisa karena lelah, panas, atau kurang tidur." : "Stabil."}`
                  : ". Butuh lari sebelumnya dengan data HR untuk dibandingkan."}
              </Insight>
            )}

            {a.similar && (
              <Insight icon="medal" tone="blue" title="Dibanding lari berjarak serupa">
                {a.similar.rank === 1 ? "Tercepat" : `Tercepat ke-${a.similar.rank}`} dari {a.similar.count} lari berjarak{" "}
                {formatNumber(run.distanceKm * 0.75)}–{formatNumber(run.distanceKm * 1.25)} km. Terbaikmu{" "}
                {formatPace(a.similar.bestPaceSec)}/km.
              </Insight>
            )}

            {a.load && (
              <Insight icon="chart" tone="pink" title="Training load hari itu">
                Status {a.load.comment ?? "—"}
                {a.load.loadRatio !== null && `, rasio ${formatNumber(a.load.loadRatio, 2)}`}
                {a.load.shortTermLoad !== null &&
                  ` (jangka pendek ${a.load.shortTermLoad}, panjang ${a.load.longTermLoad ?? "—"})`}
                .
                {a.load.loadRatio !== null && a.load.loadRatio > 1.5
                  ? " Beban naik tajam: beri waktu pulih."
                  : a.load.loadRatio !== null && a.load.loadRatio < 0.8
                  ? " Beban masih di bawah kebiasaan, aman untuk menambah pelan-pelan."
                  : ""}
              </Insight>
            )}

            {a.body && (a.body.restingHeartRate !== null || a.body.sleepScore !== null || a.body.stressLevel !== null) && (
              <Insight icon="heart" tone="yellow" title="Kondisi tubuh hari itu">
                {[
                  a.body.restingHeartRate !== null && `resting HR ${a.body.restingHeartRate} bpm`,
                  a.body.sleepScore !== null && `skor tidur ${a.body.sleepScore}`,
                  a.body.stressLevel !== null && `stres rata-rata ${a.body.stressLevel}`,
                ]
                  .filter(Boolean)
                  .join(", ")
                  .replace(/^./, (c) => c.toUpperCase())}
                .
              </Insight>
            )}

            {a.fitness?.thresholdPaceSecPerKm != null && run.avgPaceSecPerKm !== null && (
              <Insight icon="target" tone="pink" title="Dibanding threshold pace">
                Threshold pace COROS {formatPace(a.fitness.thresholdPaceSecPerKm)}/km. Lari ini{" "}
                {Math.round((a.fitness.thresholdPaceSecPerKm / run.avgPaceSecPerKm) * 100)}% dari kecepatan threshold
                {run.avgPaceSecPerKm > a.fitness.thresholdPaceSecPerKm * 1.25 ? ": termasuk zona easy." : "."}
              </Insight>
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Tren efisiensi" description="Meter per detak jantung di setiap lari ≥ 1 km. Naik berarti kebugaran aerobik membaik." />
          <ChartCard title="Efisiensi aerobik" headline={a.efficiency !== null ? formatNumber(a.efficiency, 2) : undefined} headlineColor="var(--yellow-text)">
            <TrendLineChart data={efficiencySeries(runs)} color="var(--yellow)" format="decimal" unit="m/detak" />
          </ChartCard>
        </section>

        {similarRuns.length > 1 && (
          <section>
            <SectionHeader title="Lari berjarak serupa" description="Diurutkan dari pace tercepat." />
            <ol className="card flex flex-col p-2 sm:p-3">
              {similarRuns.map((r, i) => {
                const current = r.labelId === run.labelId;
                return (
                  <li key={r.labelId} style={{ borderTop: i ? "1px solid var(--gridline)" : undefined }}>
                    <Link
                      href={`/aktivitas/${r.labelId}`}
                      aria-current={current ? "page" : undefined}
                      className="link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors hover:bg-[#22222a]"
                      style={current ? { background: "var(--pink-wash)" } : undefined}
                    >
                      <span className="w-6 text-xs font-bold tabular-nums" style={{ color: current ? "var(--pink-text)" : "var(--text-secondary)" }}>
                        {i + 1}
                      </span>
                      <span className="flex-1 font-medium">{formatDay(r.date)}</span>
                      <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {r.distanceKm.toFixed(2)} km
                      </span>
                      <span className="w-20 text-right font-semibold tabular-nums">{formatPace(r.avgPaceSecPerKm)}/km</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </AppShell>
  );
}
