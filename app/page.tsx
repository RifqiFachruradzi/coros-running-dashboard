import {
  readRuns,
  readFitnessHistory,
  readLoadHistory,
  readBodyHistory,
} from "@/lib/data-store";
import { weeklyVolume, summarize, formatPace, formatClock } from "@/lib/aggregate";
import { StatTile } from "@/components/StatTile";
import { ChartCard } from "@/components/ChartCard";
import { TrendLineChart } from "@/components/TrendLineChart";
import { LoadChart } from "@/components/LoadChart";
import { DistanceBarChart } from "@/components/DistanceBarChart";
import { ActivityTable } from "@/components/ActivityTable";

export const revalidate = 0; // always read the latest committed data

export default async function DashboardPage() {
  const [runs, fitnessHistory, loadHistory, bodyHistory] = await Promise.all([
    readRuns(),
    readFitnessHistory(),
    readLoadHistory(),
    readBodyHistory(),
  ]);

  const sortedRuns = [...runs].sort((a, b) => b.startTimestamp - a.startTimestamp);
  const last30 = summarize(sortedRuns, 30);
  const last7 = summarize(sortedRuns, 7);
  const latestFitness = fitnessHistory[fitnessHistory.length - 1];
  const latestLoad = loadHistory[loadHistory.length - 1];

  const paceSeries = [...sortedRuns]
    .reverse()
    .map((r) => ({ x: r.date, y: r.avgPaceSecPerKm }));
  const hrSeries = [...sortedRuns]
    .reverse()
    .map((r) => ({ x: r.date, y: r.avgHeartRate }));
  const volumeSeries = weeklyVolume(sortedRuns, 8);

  const restingHrSeries = bodyHistory.map((b) => ({ x: b.date, y: b.restingHeartRate }));
  const sleepSeries = bodyHistory.map((b) => ({ x: b.date, y: b.sleepScore }));
  const stressSeries = bodyHistory.map((b) => ({ x: b.date, y: b.stressLevel }));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Dashboard Lari
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Data ditarik otomatis dari COROS. {sortedRuns.length} aktivitas lari tercatat.
        </p>
      </header>

      {/* Ringkasan */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatTile label="Jarak 7 hari terakhir" value={last7.totalKm.toFixed(1)} unit="km" />
        <StatTile label="Lari 30 hari terakhir" value={String(last30.totalRuns)} unit="sesi" />
        <StatTile
          label="Pace rata-rata (30 hari)"
          value={formatPace(last30.avgPace)}
          unit="/km"
        />
        <StatTile
          label="VO2max"
          value={latestFitness?.vo2max != null ? String(latestFitness.vo2max) : "—"}
          unit={latestFitness ? `Level ${latestFitness.runningLevel ?? "—"}` : undefined}
        />
      </section>

      {/* Tren progress */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <ChartCard title="Tren pace per lari" subtitle="Menit per km, per sesi lari">
          <TrendLineChart
            data={paceSeries}
            color="var(--series-1)"
            formatY={(v) => formatPace(v)}
            unit="/km"
          />
        </ChartCard>
        <ChartCard title="Tren detak jantung rata-rata" subtitle="BPM, per sesi lari">
          <TrendLineChart
            data={hrSeries}
            color="var(--series-3)"
            formatY={(v) => String(Math.round(v))}
            unit="bpm"
          />
        </ChartCard>
        <ChartCard title="Volume mingguan" subtitle="Total jarak per minggu (km)">
          <DistanceBarChart data={volumeSeries} />
        </ChartCard>
        <ChartCard title="Training load" subtitle="Short-term vs long-term load">
          <LoadChart data={loadHistory} />
        </ChartCard>
      </section>

      {/* Kesiapan latihan */}
      {latestFitness && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Kesiapan & prediksi race
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Threshold pace"
              value={formatPace(latestFitness.thresholdPaceSecPerKm)}
              unit="/km"
            />
            <StatTile label="Prediksi 5K" value={formatClock(latestFitness.predictions.fiveKmSeconds)} />
            <StatTile label="Prediksi 10K" value={formatClock(latestFitness.predictions.tenKmSeconds)} />
            <StatTile
              label="Prediksi Half Marathon"
              value={formatClock(latestFitness.predictions.halfMarathonSeconds)}
            />
          </div>
          {latestLoad && (
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Status beban latihan terakhir: <strong>{latestLoad.comment ?? "—"}</strong>
              {latestLoad.loadRatio != null && ` (rasio ${latestLoad.loadRatio.toFixed(2)})`}
            </p>
          )}
        </section>
      )}

      {/* Kondisi tubuh */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Kondisi tubuh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ChartCard title="Resting HR" subtitle="BPM per hari">
            <TrendLineChart
              data={restingHrSeries}
              color="var(--series-3)"
              formatY={(v) => String(Math.round(v))}
              unit="bpm"
            />
          </ChartCard>
          <ChartCard title="Sleep score" subtitle="Skor tidur harian">
            <TrendLineChart
              data={sleepSeries}
              color="var(--series-5)"
              formatY={(v) => String(Math.round(v))}
            />
          </ChartCard>
          <ChartCard title="Stress level" subtitle="Rata-rata harian">
            <TrendLineChart
              data={stressSeries}
              color="var(--series-4)"
              formatY={(v) => String(Math.round(v))}
            />
          </ChartCard>
        </div>
      </section>

      {/* Aktivitas terbaru */}
      <section>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Aktivitas terbaru
        </h2>
        <ChartCard title="10 lari terakhir">
          <ActivityTable runs={sortedRuns} />
        </ChartCard>
      </section>
    </main>
  );
}
