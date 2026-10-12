import {
  readRuns,
  readFitnessHistory,
  readLoadHistory,
  readBodyHistory,
  readRecommendation,
} from "@/lib/data-store";
import {
  weeklyVolume,
  summarize,
  weekProgress,
  personalRecords,
  formatPace,
  formatClock,
  formatDay,
  formatShortDay,
  daysBetween,
  todayInJakarta,
  type WeekProgress,
} from "@/lib/aggregate";
import { programProgress } from "@/lib/coach";
import { loadDashboardStatus } from "@/lib/token-store";
import { AppShell } from "@/components/AppShell";
import { loadGoals } from "@/lib/user-store";
import { StatTile } from "@/components/StatTile";
import { ChartCard } from "@/components/ChartCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TrendLineChart } from "@/components/TrendLineChart";
import { LoadChart } from "@/components/LoadChart";
import { ActivityTable } from "@/components/ActivityTable";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { VolumeHero } from "@/components/VolumeHero";
import { TomorrowCard, LastRunCard } from "@/components/HighlightCards";
import { GoalCard } from "@/components/GoalCard";
import { ActiveProgramCard } from "@/components/ActiveProgramCard";
import { ProgramOfferCard } from "@/components/ProgramOfferCard";
import { NoProgramCard } from "@/components/NoProgramCard";
import { RecentRuns, BodyTiles, CoachNote } from "@/components/SidePanel";
import { Vo2maxCard } from "@/components/Vo2maxCard";

export const revalidate = 0; // always read the latest committed data

const DEFAULT_WEEKLY_TARGET_KM = 20;

// Distances the "next milestone" goal card climbs through.
const MILESTONES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half marathon", km: 21.1 },
  { label: "Marathon", km: 42.2 },
];

function weeklyTargetKm(goalKm: number | undefined): number {
  if (goalKm) return goalKm;
  const parsed = Number(process.env.WEEKLY_TARGET_KM);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEEKLY_TARGET_KM;
}

function daysLeftText(days: number): string {
  return days <= 1 ? "Hari terakhir" : `${days} hari lagi`;
}

export default async function DashboardPage() {
  const [runs, fitnessHistory, loadHistory, bodyHistory, status, coach, goals] = await Promise.all([
    readRuns(),
    readFitnessHistory(),
    readLoadHistory(),
    readBodyHistory(),
    loadDashboardStatus(),
    readRecommendation(),
    loadGoals(),
  ]);

  const today = todayInJakarta();
  const sortedRuns = [...runs].sort((a, b) => b.startTimestamp - a.startTimestamp);
  const lastRun = sortedRuns[0];
  const last7 = summarize(sortedRuns, 7);
  const records = personalRecords(sortedRuns);
  const latestFitness = fitnessHistory[fitnessHistory.length - 1];
  const previousFitness = fitnessHistory[fitnessHistory.length - 2];
  const latestLoad = loadHistory[loadHistory.length - 1];

  const active = status.activeProgram;
  const progress = active ? programProgress(active, sortedRuns) : null;
  // While a program is running, the planned km of the current program week
  // replaces the fixed WEEKLY_TARGET_KM goal.
  const programWeek = progress && !progress.finished ? progress : null;
  const thisWeek: WeekProgress = programWeek
    ? {
        km: programWeek.week.actualKm,
        targetKm: programWeek.week.plannedKm,
        daysLeft: programWeek.week.daysLeft,
        weekStart: programWeek.week.start,
      }
    : weekProgress(sortedRuns, weeklyTargetKm(goals.find((g) => g.kind === "weekly_km")?.target));
  const weekDone = thisWeek.km >= thisWeek.targetKm;

  const vo2Delta =
    latestFitness?.vo2max != null && previousFitness?.vo2max != null
      ? latestFitness.vo2max - previousFitness.vo2max
      : null;

  const longestKm = records.longest?.distanceKm ?? 0;
  const nextMilestone = MILESTONES.find((m) => m.km > longestKm) ?? MILESTONES[MILESTONES.length - 1];

  const chronological = [...sortedRuns].reverse();
  const paceSeries = chronological.map((r) => ({ x: r.date, y: r.avgPaceSecPerKm }));
  const hrSeries = chronological.map((r) => ({ x: r.date, y: r.avgHeartRate }));

  const restingHrSeries = bodyHistory.map((b) => ({ x: b.date, y: b.restingHeartRate }));
  const sleepSeries = bodyHistory.map((b) => ({ x: b.date, y: b.sleepScore }));
  const stressSeries = bodyHistory.map((b) => ({ x: b.date, y: b.stressLevel }));
  const hasBodyData = bodyHistory.some(
    (b) => b.restingHeartRate !== null || b.sleepScore !== null || b.stressLevel !== null
  );

  return (
    <AppShell active="/">

        <div id="ringkasan" className="flex min-w-0 flex-[999_1_600px] scroll-mt-6 flex-col gap-8 lg:py-1.5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">COROS · {formatDay(today)}</p>
              <h1 className="text-2xl font-bold">Dashboard Lari</h1>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                {lastRun
                  ? `Lari terakhir ${formatDay(lastRun.date)} · ${lastRun.distanceKm.toFixed(2)} km`
                  : "Belum ada lari tercatat"}{" "}
                · {sortedRuns.length} aktivitas
              </p>
            </div>
            <SyncStatusBadge status={status} />
          </header>

          {/* Hero */}
          <div className="flex flex-wrap gap-5">
            <div className="min-w-0 flex-[999_1_460px]">
              <VolumeHero
                volume={weeklyVolume(sortedRuns, 8)}
                stats={[
                  {
                    label: "Jarak 7 hari",
                    value: `${last7.totalKm.toFixed(1)} km`,
                    sub: `${last7.totalRuns} lari`,
                  },
                  {
                    label: "Target minggu ini",
                    value: `${thisWeek.km.toFixed(1)} / ${thisWeek.targetKm} km`,
                    sub: weekDone
                      ? "Target tercapai"
                      : programWeek && active
                      ? `Minggu ${programWeek.currentWeek} · ${active.program.title}`
                      : `Sisa ${(thisWeek.targetKm - thisWeek.km).toFixed(1)} km`,
                  },
                  {
                    label: "VO2max",
                    value:
                      latestFitness?.vo2max != null
                        ? `${latestFitness.vo2max}${vo2Delta ? ` ${vo2Delta > 0 ? "▲" : "▼"}${Math.abs(vo2Delta)}` : ""}`
                        : "—",
                    sub: latestFitness?.runningLevel != null ? `Level ${latestFitness.runningLevel}` : undefined,
                  },
                ]}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-5">
              <TomorrowCard recommendation={coach.recommendation} />
              <LastRunCard run={lastRun} />
            </div>
          </div>

          {/* Goals: each card leaves 28px for its overlapping icon badge */}
          <div className="grid grid-cols-1 gap-x-5 gap-y-12 pt-7 sm:grid-cols-2 xl:grid-cols-3">
            {active && progress ? (
              <GoalCard
                icon="flag"
                tone="pink"
                title={active.program.title}
                subtitle={
                  progress.finished
                    ? "Program sudah berakhir"
                    : `Minggu ${progress.currentWeek} dari ${active.program.durationWeeks}`
                }
                ratio={progress.sessions.length ? progress.completedCount / progress.sessions.length : 0}
                footer={`${progress.completedCount} / ${progress.sessions.length} sesi`}
                badge={
                  progress.finished ? "Berakhir" : daysLeftText(daysBetween(today, progress.endDate) + 1)
                }
              />
            ) : (
              <GoalCard
                icon="flag"
                tone="pink"
                title="Belum ada program"
                subtitle="Pilih program dari Coach di bawah"
                ratio={0}
                footer="0 sesi"
                badge="Pilih program"
              />
            )}
            <GoalCard
              icon="target"
              tone="yellow"
              title="Target mingguan"
              subtitle={`${thisWeek.targetKm} km / minggu${programWeek ? " · dari program" : ""}`}
              ratio={thisWeek.targetKm > 0 ? thisWeek.km / thisWeek.targetKm : 1}
              footer={`${thisWeek.km.toFixed(1)} / ${thisWeek.targetKm} km`}
              badge={weekDone ? "Tercapai" : daysLeftText(thisWeek.daysLeft)}
            />
            <GoalCard
              icon="medal"
              tone="blue"
              title={`Menuju ${nextMilestone.label}`}
              subtitle={
                records.longest
                  ? `Lari terjauh ${longestKm.toFixed(2)} km · ${formatShortDay(records.longest.date)}`
                  : "Belum ada lari tercatat"
              }
              ratio={longestKm / nextMilestone.km}
              footer={`${longestKm.toFixed(2)} / ${nextMilestone.km} km`}
              badge="Rekor"
            />
          </div>

          {/* Pelatih AI */}
          <section id="program" className="scroll-mt-6">
            <SectionHeader
              title="Program latihan"
              description="Rekomendasi dan program dari Pelatih AI, dibuat setiap malam dari data COROS."
            />

            {coach.errors.length > 0 && (
              <div className="card tone-pink mb-4 p-4 text-sm">
                <p className="mb-1 font-semibold">File rekomendasi dari AI tidak valid, jadi tidak ditampilkan.</p>
                <ul className="list-disc pl-5 text-xs">
                  {coach.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {active && progress ? <ActiveProgramCard active={active} progress={progress} /> : <NoProgramCard />}
              {coach.recommendation && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-base font-semibold">
                    {active ? "Program lain dari Coach" : "Pilih program latihan"}
                  </h3>
                  {coach.recommendation.programs.map((p, i) => (
                    <ProgramOfferCard
                      key={p.id}
                      program={p}
                      index={i}
                      activeTitle={active?.program.title ?? null}
                      isActive={active?.program.id === p.id}
                      storageReady={status.storage === "ok"}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tren latihan */}
          <section id="tren" className="scroll-mt-6">
            <SectionHeader title="Tren latihan" description="Perkembangan per sesi lari." />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              <ChartCard
                title="Pace per lari"
                subtitle="Menit per km · makin tinggi makin cepat"
                headline={lastRun ? formatPace(lastRun.avgPaceSecPerKm) : undefined}
                headlineColor="var(--blue-text)"
              >
                <TrendLineChart data={paceSeries} color="var(--blue)" format="pace" unit="/km" />
              </ChartCard>
              <ChartCard
                title="Detak jantung"
                subtitle="Rata-rata BPM per sesi"
                headline={lastRun?.avgHeartRate != null ? String(lastRun.avgHeartRate) : undefined}
                headlineColor="var(--pink-text)"
              >
                <TrendLineChart data={hrSeries} color="var(--pink)" format="integer" unit="bpm" />
              </ChartCard>
              <ChartCard
                title="Training load"
                subtitle={latestLoad?.comment ? `Status terakhir: ${latestLoad.comment}` : "Jangka pendek vs panjang"}
                headline={latestLoad?.loadRatio != null ? latestLoad.loadRatio.toFixed(2) : undefined}
                headlineColor="var(--yellow-text)"
              >
                <LoadChart data={loadHistory} />
              </ChartCard>
            </div>
          </section>

          {/* Rekor & prediksi */}
          <section>
            <SectionHeader
              title="Rekor pribadi & prediksi race"
              description="Rekor dihitung dari pace rata-rata lari yang jaraknya minimal sejauh itu. Prediksi dari COROS."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <StatTile
                solid
                label="Lari terjauh"
                value={records.longest ? records.longest.distanceKm.toFixed(2) : "—"}
                unit={records.longest ? "km" : undefined}
                note={records.longest ? formatDay(records.longest.date) : undefined}
              />
              {records.fastest.map((record) => (
                <StatTile
                  key={record.label}
                  tone="pink"
                  label={`${record.label} tercepat`}
                  value={formatClock(record.seconds)}
                  note={
                    record.date
                      ? `${formatShortDay(record.date)} · ${formatPace(record.paceSecPerKm)}/km`
                      : `Belum ada lari sejauh ${record.label}`
                  }
                />
              ))}
              {latestFitness && (
                <>
                  <StatTile
                    tone="yellow"
                    label="Threshold pace"
                    value={formatPace(latestFitness.thresholdPaceSecPerKm)}
                    unit="/km"
                  />
                  <StatTile tone="blue" label="Prediksi 5K" value={formatClock(latestFitness.predictions.fiveKmSeconds)} />
                  <StatTile tone="blue" label="Prediksi 10K" value={formatClock(latestFitness.predictions.tenKmSeconds)} />
                  <StatTile
                    tone="blue"
                    label="Prediksi half marathon"
                    value={formatClock(latestFitness.predictions.halfMarathonSeconds)}
                  />
                  <StatTile
                    tone="blue"
                    label="Prediksi marathon"
                    value={formatClock(latestFitness.predictions.marathonSeconds)}
                  />
                </>
              )}
            </div>
          </section>

          {/* Kondisi tubuh */}
          <section>
            <SectionHeader title="Kondisi tubuh" description="Resting HR, kualitas tidur, dan stres harian." />
            {hasBodyData ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                <ChartCard title="Resting HR" subtitle="BPM per hari">
                  <TrendLineChart data={restingHrSeries} color="var(--pink)" format="integer" unit="bpm" />
                </ChartCard>
                <ChartCard title="Sleep score" subtitle="Skor tidur harian">
                  <TrendLineChart data={sleepSeries} color="var(--blue)" format="integer" />
                </ChartCard>
                <ChartCard title="Stress level" subtitle="Rata-rata harian">
                  <TrendLineChart data={stressSeries} color="var(--yellow)" format="integer" />
                </ChartCard>
              </div>
            ) : (
              <div className="card p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                Belum ada data resting HR, tidur, atau stres dari COROS. Grafiknya akan muncul setelah sync
                berhasil menarik data ini.
              </div>
            )}
          </section>

          {/* Aktivitas terbaru */}
          <section id="aktivitas" className="scroll-mt-6">
            <SectionHeader title="Aktivitas terbaru" description="10 lari terakhir." />
            <div className="overflow-hidden rounded-[22px]" style={{ border: "1px solid var(--border-hairline)" }}>
              <ActivityTable runs={sortedRuns} />
            </div>
          </section>

          <footer className="pt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Data dari COROS, disinkronkan otomatis setiap malam.
          </footer>
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-6 lg:max-w-[340px] lg:border-l lg:border-[var(--border-hairline)] lg:py-1.5 lg:pl-6">
          {latestFitness?.vo2max != null && (
            <div data-animate="rise">
              <Vo2maxCard
                value={latestFitness.vo2max}
                date={latestFitness.date}
                previous={
                  previousFitness?.vo2max != null ? { value: previousFitness.vo2max, date: previousFitness.date } : null
                }
                runningLevel={latestFitness.runningLevel}
              />
            </div>
          )}
          <RecentRuns runs={sortedRuns} />
          <BodyTiles history={bodyHistory} />
          <CoachNote recommendation={coach.recommendation} />
        </aside>
    </AppShell>
  );
}
