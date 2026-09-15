import { formatDay } from "@/lib/aggregate";
import type { ActiveProgram, ProgramProgress } from "@/lib/coach";
import { SessionList } from "@/components/SessionList";
import { StopProgramButton } from "@/components/ProgramActions";

export function ActiveProgramCard({
  active,
  progress,
}: {
  active: ActiveProgram;
  progress: ProgramProgress;
}) {
  const { program, startDate } = active;
  const total = progress.sessions.length;
  const ratio = total > 0 ? progress.completedCount / total : 0;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Program aktif</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {program.title}
          </h3>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {program.goal}
          </p>
        </div>
        <StopProgramButton programTitle={program.title} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="pill">
          {progress.finished ? "Berakhir" : `Minggu ${progress.currentWeek}/${program.durationWeeks}`}
        </span>
        <span className="pill">
          {formatDay(startDate)} – {formatDay(progress.endDate)}
        </span>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span style={{ color: "var(--text-secondary)" }}>
            <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {progress.completedCount}
            </span>{" "}
            dari {total} sesi selesai
          </span>
          <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
            {Math.round(ratio * 100)}%
            {progress.missedCount > 0 && ` · ${progress.missedCount} terlewat`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Progress program"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          className="track"
          style={{ backgroundColor: "color-mix(in srgb, var(--status-good) 16%, var(--surface-1))" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${ratio * 100}%`, background: "var(--status-good)" }}
          />
        </div>
      </div>

      {progress.finished ? (
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Program sudah berakhir. Pilih program baru dari rekomendasi di bawah untuk melanjutkan.
        </p>
      ) : (
        <>
          <p className="eyebrow mt-5">Sesi minggu ini</p>
          <div className="mt-1">
            {progress.week.sessions.length > 0 ? (
              <SessionList sessions={progress.week.sessions} />
            ) : (
              <p className="py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Tidak ada sesi terjadwal minggu ini.
              </p>
            )}
          </div>
        </>
      )}

      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Sesi dihitung selesai kalau lari di tanggal itu mencapai 90% jarak rencana.
      </p>
    </div>
  );
}
