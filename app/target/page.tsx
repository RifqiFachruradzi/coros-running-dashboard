import type { Metadata } from "next";
import { readRuns } from "@/lib/data-store";
import { formatClock, formatDay, formatPace, todayInJakarta } from "@/lib/aggregate";
import { isStorageConfigured } from "@/lib/token-store";
import { loadGoals } from "@/lib/user-store";
import {
  GOAL_KIND_LABEL,
  goalProgress,
  type GoalProgress,
  type GoalStatus,
  type PeriodGoalProgress,
  type RaceGoalProgress,
} from "@/lib/insights";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { DeleteGoalButton, GoalForm } from "@/components/GoalForm";
import { formatNumber } from "@/components/format";

export const metadata: Metadata = { title: "Target — STRIDE+" };
export const revalidate = 0;

const STATUS: Record<GoalStatus, { period: string; race: string; tone: string; color: string }> = {
  tercapai: { period: "Tercapai", race: "Siap capai target", tone: "tone-blue", color: "var(--blue)" },
  sesuai_jadwal: { period: "Sesuai jadwal", race: "Hampir", tone: "tone-yellow", color: "var(--yellow)" },
  tertinggal: { period: "Tertinggal", race: "Perlu latihan lagi", tone: "tone-pink", color: "var(--pink)" },
};

function PeriodGoalCard({ p }: { p: PeriodGoalProgress }) {
  const isRuns = p.goal.kind === "weekly_runs";
  const unit = isRuns ? "lari" : "km";
  const ratio = Math.min(p.actual / p.goal.target, 1);
  const expectedRatio = Math.min(p.expected / p.goal.target, 1);
  const status = STATUS[p.status];
  const remaining = Math.max(p.goal.target - p.actual, 0);

  let advice: string;
  if (p.status === "tercapai") {
    advice = `Target ${p.periodLabel} sudah tercapai${p.actual > p.goal.target ? `, lebih ${formatNumber(p.actual - p.goal.target, isRuns ? 0 : 1)} ${unit}` : ""}.`;
  } else if (isRuns) {
    advice = `Kurang ${remaining} lari dalam ${p.daysLeft} hari.`;
  } else {
    const diff = p.actual - p.expected;
    const position =
      Math.abs(diff) < 0.05
        ? "Tepat sesuai jadwal"
        : diff > 0
        ? `Di depan jadwal ${formatNumber(diff)} km`
        : `Tertinggal ${formatNumber(-diff)} km dari jadwal`;
    advice = `${position}. Sisa ${formatNumber(remaining)} km dalam ${p.daysLeft} hari, ±${formatNumber(p.perDayNeeded)} km per hari.`;
  }

  return (
    <div data-animate="rise" className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            {GOAL_KIND_LABEL[p.goal.kind]} · {formatDay(p.start)} – {formatDay(p.end)}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {isRuns ? p.actual : formatNumber(p.actual)}
            <span className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
              {" "}
              / {p.goal.target} {unit}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${status.tone}`}>{status.period}</span>
          <DeleteGoalButton goalId={p.goal.id} label={GOAL_KIND_LABEL[p.goal.kind]} />
        </div>
      </div>
      <div>
        <div
          role="progressbar"
          aria-label={`Progres ${GOAL_KIND_LABEL[p.goal.kind]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          className="track relative h-3"
        >
          <div data-animate="bar" className="h-full rounded-full" style={{ width: `${Math.max(ratio * 100, 2)}%`, background: status.color }} />
          {p.status !== "tercapai" && expectedRatio > 0 && (
            <span
              className="absolute top-[-3px] h-[18px] w-0.5 rounded"
              style={{ left: `${expectedRatio * 100}%`, background: "var(--text-primary)" }}
              title="Posisi sesuai jadwal hari ini"
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span>{Math.round(ratio * 100)}%</span>
          {p.status !== "tercapai" && expectedRatio > 0 && <span>Garis putih: jadwal hari ini ({isRuns ? Math.floor(p.expected) : formatNumber(p.expected)} {unit})</span>}
        </div>
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {advice}
      </p>
    </div>
  );
}

function RaceGoalCard({ p }: { p: RaceGoalProgress }) {
  const status = STATUS[p.status];
  const targetSeconds = p.goal.targetSeconds ?? 0;
  const gap = p.predictedSeconds !== null ? p.predictedSeconds - targetSeconds : null;
  const distanceLabel = `${formatNumber(p.goal.target, p.goal.target % 1 ? 1 : 0)} km`;

  return (
    <div data-animate="rise" className="card flex flex-col gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <p className="eyebrow">
            Target race · {p.goal.raceDate ? formatDay(p.goal.raceDate) : "—"}
          </p>
          <h3 className="mt-1 text-xl font-bold">{p.goal.name ?? `Race ${distanceLabel}`}</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {distanceLabel} dalam {formatClock(targetSeconds)} · pace {formatPace(p.requiredPaceSec)}/km
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${status.tone}`}>{status.race}</span>
          <DeleteGoalButton goalId={p.goal.id} label={p.goal.name ?? `Race ${distanceLabel}`} />
        </div>
      </div>

      <dl className="grid grid-cols-3 text-center" style={{ background: "var(--blue)", color: "var(--on-color)" }}>
        <div className="p-4">
          <dt className="text-[11px]">Hari lagi</dt>
          <dd className="text-2xl font-bold tabular-nums">{p.daysLeft}</dd>
        </div>
        <div className="p-4" style={{ background: "var(--on-color)", color: "var(--yellow)" }}>
          <dt className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Prediksi saat ini
          </dt>
          <dd className="text-2xl font-bold tabular-nums">
            {p.predictedSeconds !== null ? formatClock(p.predictedSeconds) : "—"}
          </dd>
        </div>
        <div className="p-4">
          <dt className="text-[11px]">Lari terjauh 60 hari</dt>
          <dd className="text-2xl font-bold tabular-nums">{formatNumber(p.longestRecentKm)} km</dd>
        </div>
      </dl>

      <ul className="flex flex-col gap-2 px-5 pb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        {gap !== null && p.predictedFrom ? (
          <li>
            {gap <= 0
              ? `Prediksimu ${formatClock(-gap)} lebih cepat dari target.`
              : `Perlu ${formatClock(gap)} lebih cepat dari prediksi saat ini.`}{" "}
            Dihitung dengan rumus Riegel dari lari {formatNumber(p.predictedFrom.distanceKm, 2)} km pada{" "}
            {formatDay(p.predictedFrom.date)} ({formatPace(p.predictedFrom.avgPaceSecPerKm)}/km).
          </li>
        ) : (
          <li>Belum ada lari ≥ 3 km dalam 60 hari terakhir untuk memprediksi waktu race.</li>
        )}
        {p.longestRecentKm < p.goal.target * 0.75 && (
          <li>
            Lari terjauhmu baru {formatNumber(p.longestRecentKm)} km. Naikkan long run pelan-pelan (±10% per minggu)
            mendekati {formatNumber(Math.min(p.goal.target, p.goal.target * 0.9))} km sebelum race.
          </li>
        )}
        {p.daysLeft <= 10 && p.daysLeft >= 0 && <li>Race sudah dekat: kurangi volume (taper) dan jaga tidur.</li>}
      </ul>
    </div>
  );
}

function GoalCardFor({ p }: { p: GoalProgress }) {
  return p.type === "race" ? <RaceGoalCard p={p} /> : <PeriodGoalCard p={p} />;
}

export default async function GoalsPage() {
  const [runs, goals] = await Promise.all([readRuns(), loadGoals()]);
  const today = todayInJakarta();
  const order = ["weekly_km", "weekly_runs", "monthly_km", "yearly_km", "race"];
  const progress = goals
    .map((g) => goalProgress(g, runs, today))
    .sort((a, b) => order.indexOf(a.goal.kind) - order.indexOf(b.goal.kind));
  const storageReady = isStorageConfigured();

  return (
    <AppShell>
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8 lg:py-1.5">
        <PageHeader
          eyebrow="Target"
          title="Pasang target, tetap on track"
          description="Target jarak per minggu, bulan, atau tahun, jumlah lari, atau target waktu race. Progres dihitung otomatis dari lari COROS-mu."
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <div className="flex flex-col gap-4">
            {progress.length === 0 ? (
              <div data-animate="rise" className="card flex flex-col items-center gap-3 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: "var(--yellow)", color: "var(--on-color)" }}>
                  <Icon name="target" size={26} />
                </span>
                <p className="text-lg font-semibold">Belum ada target</p>
                <p className="max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>
                  {storageReady
                    ? "Mulai dengan target jarak mingguan yang realistis, misalnya 10% di atas rata-rata minggu terakhirmu."
                    : "Target disimpan di Upstash Redis. Hubungkan Redis dulu di Vercel agar target bisa disimpan."}
                </p>
              </div>
            ) : (
              progress.map((p) => <GoalCardFor key={p.goal.id} p={p} />)
            )}
          </div>
          <GoalForm storageReady={storageReady} />
        </div>
      </div>
    </AppShell>
  );
}
