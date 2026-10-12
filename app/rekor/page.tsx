import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { readFitnessHistory, readRuns } from "@/lib/data-store";
import { formatClock, formatDay, formatPace, formatShortDay, personalRecords } from "@/lib/aggregate";
import { prTimeline, recordFacts, type PrKind } from "@/lib/insights";
import { AppShell, PageHeader } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { Icon, type IconName } from "@/components/icons";
import type { Tone } from "@/components/GoalCard";
import { formatHours } from "@/components/format";

export const metadata: Metadata = { title: "Performa terbaik — Dashboard Lari" };
export const revalidate = 0;

const PR_LABEL: Record<PrKind, { text: string; tone: Exclude<Tone, "neutral"> }> = {
  longest: { text: "Lari terjauh", tone: "pink" },
  fastest_pace: { text: "Pace tercepat", tone: "blue" },
  fastest_5k: { text: "5K tercepat", tone: "yellow" },
  fastest_10k: { text: "10K tercepat", tone: "yellow" },
};

function RecordCard({
  icon,
  tone,
  label,
  value,
  detail,
  href,
}: {
  icon: IconName;
  tone: Exclude<Tone, "neutral">;
  label: string;
  value: string;
  detail: string;
  href?: string;
}) {
  const content = (
    <>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl tone-${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
          {detail}
        </p>
      </div>
      {href && <Icon name="chevronRight" size={16} style={{ color: "var(--text-muted)" }} />}
    </>
  );
  const className = "card flex items-center gap-4 p-4";
  return href ? (
    <Link href={href} data-animate="rise" className={`${className} link transition-colors hover:bg-[#22222a]`}>
      {content}
    </Link>
  ) : (
    <div data-animate="rise" className={className}>
      {content}
    </div>
  );
}

const shortMonth = (key: string) => format(new Date(`${key}-01T00:00:00`), "MMMM yyyy", { locale: id });

export default async function RecordsPage() {
  const [runs, fitnessHistory] = await Promise.all([readRuns(), readFitnessHistory()]);
  const facts = recordFacts(runs);
  const { fastest } = personalRecords(runs);
  const timeline = prTimeline(runs).reverse();
  const fitness = fitnessHistory[fitnessHistory.length - 1];
  const runHref = (labelId?: string) => (labelId ? `/aktivitas/${labelId}` : undefined);

  return (
    <AppShell active="/rekor">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8 lg:py-1.5">
        <PageHeader
          eyebrow="Performa terbaik"
          title="Semua rekor pribadimu"
          description="COROS hanya mengirim rata-rata per lari (tanpa split), jadi rekor jarak dihitung dari pace rata-rata lari yang minimal sejauh itu. Lari di bawah 1 km tidak dihitung untuk rekor pace."
        />

        <section>
          <SectionHeader title="Jarak & waktu" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <RecordCard
              icon="runner"
              tone="pink"
              label="Lari terjauh"
              value={facts.longest ? `${facts.longest.distanceKm.toFixed(2)} km` : "—"}
              detail={facts.longest ? `${formatDay(facts.longest.date)} · ${formatPace(facts.longest.avgPaceSecPerKm)}/km` : "Belum ada lari"}
              href={runHref(facts.longest?.labelId)}
            />
            <RecordCard
              icon="history"
              tone="pink"
              label="Lari terlama"
              value={facts.longestDuration ? formatClock(facts.longestDuration.durationSeconds) : "—"}
              detail={facts.longestDuration ? `${formatDay(facts.longestDuration.date)} · ${facts.longestDuration.distanceKm.toFixed(2)} km` : "Belum ada lari"}
              href={runHref(facts.longestDuration?.labelId)}
            />
            <RecordCard
              icon="trend"
              tone="blue"
              label="Pace rata-rata tercepat"
              value={facts.fastestPace ? `${formatPace(facts.fastestPace.avgPaceSecPerKm)}/km` : "—"}
              detail={facts.fastestPace ? `${formatDay(facts.fastestPace.date)} · ${facts.fastestPace.distanceKm.toFixed(2)} km` : "Belum ada lari ≥ 1 km"}
              href={runHref(facts.fastestPace?.labelId)}
            />
            {fastest.map((record) => (
              <RecordCard
                key={record.label}
                icon="medal"
                tone="yellow"
                label={`${record.label} tercepat`}
                value={formatClock(record.seconds)}
                detail={
                  record.date
                    ? `${formatDay(record.date)} · ${formatPace(record.paceSecPerKm)}/km`
                    : `Belum ada lari sejauh ${record.label}`
                }
                href={record.date ? runHref(runs.find((r) => r.date === record.date && r.avgPaceSecPerKm === record.paceSecPerKm)?.labelId) : undefined}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Konsistensi" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <RecordCard
              icon="calendar"
              tone="blue"
              label="Minggu terjauh"
              value={facts.biggestWeek ? `${facts.biggestWeek.km.toFixed(1)} km` : "—"}
              detail={facts.biggestWeek ? `Mulai ${formatShortDay(facts.biggestWeek.start)} · ${facts.biggestWeek.runs} lari` : "—"}
            />
            <RecordCard
              icon="calendar"
              tone="blue"
              label="Lari terbanyak dalam seminggu"
              value={facts.mostRunsWeek ? `${facts.mostRunsWeek.runs} lari` : "—"}
              detail={facts.mostRunsWeek ? `Mulai ${formatShortDay(facts.mostRunsWeek.start)} · ${facts.mostRunsWeek.km.toFixed(1)} km` : "—"}
            />
            <RecordCard
              icon="history"
              tone="pink"
              label="Bulan terjauh"
              value={facts.biggestMonth ? `${facts.biggestMonth.km.toFixed(1)} km` : "—"}
              detail={facts.biggestMonth ? `${shortMonth(facts.biggestMonth.key)} · ${formatHours(facts.biggestMonth.seconds)}` : "—"}
              href={facts.biggestMonth ? `/riwayat?bulan=${facts.biggestMonth.key}` : undefined}
            />
            <RecordCard
              icon="flag"
              tone="yellow"
              label="Streak terpanjang"
              value={facts.longestStreak ? `${facts.longestStreak.days} hari` : "—"}
              detail={
                facts.longestStreak
                  ? facts.longestStreak.days > 1
                    ? `${formatShortDay(facts.longestStreak.start)} – ${formatShortDay(facts.longestStreak.end)}`
                    : "Lari dua hari berturut-turut untuk memecahkannya"
                  : "—"
              }
            />
          </div>
        </section>

        {fitness && (
          <section>
            <SectionHeader title="Kebugaran terbaik saat ini" description={`Dari penilaian COROS, ${formatDay(fitness.date)}.`} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <RecordCard
                icon="heart"
                tone="pink"
                label="VO2max"
                value={fitness.vo2max != null ? String(fitness.vo2max) : "—"}
                detail={fitness.runningLevel != null ? `Running level ${fitness.runningLevel}` : "—"}
              />
              <RecordCard
                icon="trend"
                tone="blue"
                label="Threshold pace"
                value={fitness.thresholdPaceSecPerKm != null ? `${formatPace(fitness.thresholdPaceSecPerKm)}/km` : "—"}
                detail="Pace yang bisa dipertahankan ±1 jam"
              />
              <RecordCard
                icon="medal"
                tone="yellow"
                label="Prediksi 10K"
                value={formatClock(fitness.predictions.tenKmSeconds)}
                detail={`5K ${formatClock(fitness.predictions.fiveKmSeconds)} · half ${formatClock(fitness.predictions.halfMarathonSeconds)}`}
              />
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Riwayat rekor" description="Setiap lari yang memecahkan rekor pada saat itu, terbaru di atas." />
          {timeline.length === 0 ? (
            <p className="card p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Belum ada lari tercatat.
            </p>
          ) : (
            <ol className="card flex flex-col p-2 sm:p-3">
              {timeline.map((event, i) => {
                const label = PR_LABEL[event.kind];
                const isDistance = event.kind === "longest";
                const value = isDistance ? `${event.value.toFixed(2)} km` : `${formatPace(event.value)}/km`;
                const improvement =
                  event.previous === null
                    ? "Rekor pertama"
                    : isDistance
                    ? `+${(event.value - event.previous).toFixed(2)} km`
                    : `${Math.round(event.previous - event.value)} dtk/km lebih cepat`;
                return (
                  <li key={`${event.labelId}-${event.kind}`} data-animate="rise" style={{ borderTop: i ? "1px solid var(--gridline)" : undefined }}>
                    <Link href={`/aktivitas/${event.labelId}`} className="link flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-3 transition-colors hover:bg-[#22222a]">
                      <span className="w-24 shrink-0 text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                        {formatDay(event.date)}
                      </span>
                      <span className={`pill tone-${label.tone}`}>{label.text}</span>
                      <span className="font-semibold tabular-nums">{value}</span>
                      <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>
                        {improvement}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </AppShell>
  );
}
