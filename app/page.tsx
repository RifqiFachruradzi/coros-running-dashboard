import Link from "next/link";
import { isAuthEnabled } from "@/lib/auth";
import { logout } from "./login/actions";
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
  type WeekProgress,
} from "@/lib/aggregate";
import { programProgress } from "@/lib/coach";
import { loadDashboardStatus } from "@/lib/token-store";
import { StatTile } from "@/components/StatTile";
import { ChartCard } from "@/components/ChartCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TrendLineChart } from "@/components/TrendLineChart";
import { LoadChart } from "@/components/LoadChart";
import { DistanceBarChart } from "@/components/DistanceBarChart";
import { ActivityTable } from "@/components/ActivityTable";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { WeeklyTargetCard } from "@/components/WeeklyTargetCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ActiveProgramCard } from "@/components/ActiveProgramCard";
import { ProgramOfferCard } from "@/components/ProgramOfferCard";
import { NoProgramCard } from "@/components/NoProgramCard";

export const revalidate = 0; // always read the latest committed data

const DEFAULT_WEEKLY_TARGET_KM = 20;

function weeklyTargetKm(): number {
  const parsed = Number(process.env.WEEKLY_TARGET_KM);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEEKLY_TARGET_KM;
}

export default async function DashboardPage() {
  const [runs, fitnessHistory, loadHistory, bodyHistory, status, coach] = await Promise.all([
    readRuns(),
    readFitnessHistory(),
    readLoadHistory(),
    readBodyHistory(),
    loadDashboardStatus(),
    readRecommendation(),
  ]);

  const sortedRuns = [...runs].sort((a, b) => b.startTimestamp - a.startTimestamp);
  const lastRun = sortedRuns[0];
  const last30 = summarize(sortedRuns, 30);
  const last7 = summarize(sortedRuns, 7);
  const records = personalRecords(sortedRuns);
  const latestFitness = fitnessHistory[fitnessHistory.length - 1];
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
    : weekProgress(sortedRuns, weeklyTargetKm());
  const weekSubtitle =
    active && programWeek
      ? `Minggu ${programWeek.currentWeek} dari ${active.program.durationWeeks} · ${active.program.title}`
      : undefined;

  const chronological = [...sortedRuns].reverse();
  const paceSeries = chronological.map((r) => ({ x: r.date, y: r.avgPaceSecPerKm }));
  const hrSeries = chronological.map((r) => ({ x: r.date, y: r.avgHeartRate }));
  const volumeSeries = weeklyVolume(sortedRuns, 8);

  const restingHrSeries = bodyHistory.map((b) => ({ x: b.date, y: b.restingHeartRate }));
  const sleepSeries = bodyHistory.map((b) => ({ x: b.date, y: b.sleepScore }));
  const stressSeries = bodyHistory.map((b) => ({ x: b.date, y: b.stressLevel }));
  const hasBodyData = bodyHistory.some(
    (b) => b.restingHeartRate !== null || b.sleepScore !== null || b.stressLevel !== null
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">COROS · Dashboard lari</p>
          <h1
            className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: "var(--text-primary)" }}
          >
            Dashboard Lari
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {lastRun
              ? `Lari terakhir ${formatDay(lastRun.date)} · ${lastRun.distanceKm.toFixed(2)} km`
              : "Belum ada lari tercatat"}{" "}
            · {sortedRuns.length} aktivitas
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SyncStatusBadge status={status} />
          <div className="flex items-center gap-2">
            <Link href="/chat" className="btn-secondary">
              Chat dengan Coach
            </Link>
            {isAuthEnabled() && (
              <form action={logout}>
                <button type="submit" className="btn-secondary">
                  Keluar
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Minggu ini */}
      <section className="mt-8 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <WeeklyTargetCard progress={thisWeek} subtitle={weekSubtitle} />
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:col-span-3">
          <StatTile label="Jarak 7 hari terakhir" value={last7.totalKm.toFixed(1)} unit="km" />
          <StatTile label="Lari 30 hari terakhir" value={String(last30.totalRuns)} unit="sesi" />
          <StatTile label="Pace rata-rata 30 hari" value={formatPace(last30.avgPace)} unit="/km" />
          <StatTile
            label="VO2max"
            value={latestFitness?.vo2max != null ? String(latestFitness.vo2max) : "—"}
            unit={latestFitness?.runningLevel != null ? `Level ${latestFitness.runningLevel}` : undefined}
          />
        </div>
      </section>

      {/* Pelatih AI */}
      <section className="mt-12">
        <SectionHeader
          title="Pelatih AI"
          description="Rekomendasi dan program latihan, dibuat setiap malam dari data COROS."
        />

        {coach.errors.length > 0 && (
          <div
            className="card mb-4 p-4 text-sm"
            style={{ borderColor: "var(--status-critical)", color: "var(--text-secondary)" }}
          >
            <p className="mb-1 font-semibold" style={{ color: "var(--text-primary)" }}>
              File rekomendasi dari AI tidak valid, jadi tidak ditampilkan.
            </p>
            <ul className="list-disc pl-5 text-xs">
              {coach.errors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {coach.recommendation ? (
            <RecommendationCard recommendation={coach.recommendation} />
          ) : (
            coach.errors.length === 0 && (
              <div className="card p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
                Belum ada rekomendasi. Routine AI membuatnya setiap malam sekitar pukul 23:30 WIB.
              </div>
            )
          )}
          {active && progress ? (
            <ActiveProgramCard active={active} progress={progress} />
          ) : (
            coach.recommendation && <NoProgramCard />
          )}
        </div>

        {coach.recommendation && (
          <>
            <h3 className="mb-3 mt-8 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {active ? "Program lain yang disarankan" : "Pilih program latihan"}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coach.recommendation.programs.map((p) => (
                <ProgramOfferCard
                  key={p.id}
                  program={p}
                  activeTitle={active?.program.title ?? null}
                  isActive={active?.program.id === p.id}
                  storageReady={status.storage === "ok"}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Rekor pribadi */}
      <section className="mt-12">
        <SectionHeader
          title="Rekor pribadi"
          description="Waktu 5K, 10K, dan half marathon dihitung dari pace rata-rata lari yang jaraknya minimal sejauh itu."
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Lari terjauh"
            value={records.longest ? records.longest.distanceKm.toFixed(2) : "—"}
            unit={records.longest ? "km" : undefined}
            delta={
              records.longest ? { text: formatDay(records.longest.date), tone: "neutral" } : undefined
            }
          />
          {records.fastest.map((record) => (
            <StatTile
              key={record.label}
              label={`${record.label} tercepat`}
              value={formatClock(record.seconds)}
              delta={{
                text: record.date
                  ? `${formatDay(record.date)} · ${formatPace(record.paceSecPerKm)}/km`
                  : `Belum ada lari sejauh ${record.label}`,
                tone: "neutral",
              }}
            />
          ))}
        </div>
      </section>

      {/* Tren latihan */}
      <section className="mt-12">
        <SectionHeader title="Tren latihan" description="Perkembangan per sesi lari dan per minggu." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartCard title="Pace per lari" subtitle="Menit per km · makin tinggi makin cepat">
            <TrendLineChart data={paceSeries} color="var(--series-1)" format="pace" unit="/km" />
          </ChartCard>
          <ChartCard title="Detak jantung rata-rata" subtitle="BPM per sesi lari">
            <TrendLineChart data={hrSeries} color="var(--series-3)" format="integer" unit="bpm" />
          </ChartCard>
          <ChartCard title="Volume mingguan" subtitle="Total jarak per minggu (km), 8 minggu terakhir">
            <DistanceBarChart data={volumeSeries} />
          </ChartCard>
          <ChartCard title="Training load" subtitle="Beban jangka pendek vs jangka panjang">
            <LoadChart data={loadHistory} />
          </ChartCard>
        </div>
      </section>

      {/* Kesiapan latihan */}
      {latestFitness && (
        <section className="mt-12">
          <SectionHeader
            title="Kesiapan & prediksi race"
            description={
              latestLoad ? (
                <>
                  Status beban latihan terakhir: <strong>{latestLoad.comment ?? "—"}</strong>
                  {latestLoad.loadRatio != null && ` (rasio ${latestLoad.loadRatio.toFixed(2)})`}
                </>
              ) : undefined
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            <StatTile
              label="Threshold pace"
              value={formatPace(latestFitness.thresholdPaceSecPerKm)}
              unit="/km"
            />
            <StatTile label="Prediksi 5K" value={formatClock(latestFitness.predictions.fiveKmSeconds)} />
            <StatTile label="Prediksi 10K" value={formatClock(latestFitness.predictions.tenKmSeconds)} />
            <StatTile
              label="Prediksi half marathon"
              value={formatClock(latestFitness.predictions.halfMarathonSeconds)}
            />
            <StatTile
              label="Prediksi marathon"
              value={formatClock(latestFitness.predictions.marathonSeconds)}
            />
          </div>
        </section>
      )}

      {/* Kondisi tubuh */}
      <section className="mt-12">
        <SectionHeader title="Kondisi tubuh" description="Resting HR, kualitas tidur, dan stres harian." />
        {hasBodyData ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ChartCard title="Resting HR" subtitle="BPM per hari">
              <TrendLineChart data={restingHrSeries} color="var(--series-3)" format="integer" unit="bpm" />
            </ChartCard>
            <ChartCard title="Sleep score" subtitle="Skor tidur harian">
              <TrendLineChart data={sleepSeries} color="var(--series-5)" format="integer" />
            </ChartCard>
            <ChartCard title="Stress level" subtitle="Rata-rata harian">
              <TrendLineChart data={stressSeries} color="var(--series-4)" format="integer" />
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
      <section className="mt-12">
        <SectionHeader title="Aktivitas terbaru" description="10 lari terakhir." />
        <div className="card overflow-hidden">
          <ActivityTable runs={sortedRuns} />
        </div>
      </section>

      <footer
        className="mt-12 pt-6 text-xs"
        style={{ borderTop: "1px solid var(--gridline)", color: "var(--text-muted)" }}
      >
        Data dari COROS, disinkronkan otomatis setiap malam.
      </footer>
    </main>
  );
}
