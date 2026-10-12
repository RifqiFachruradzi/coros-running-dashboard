import type { ActiveProgram, ProgramProgress } from "@/lib/coach";
import { formatDay } from "@/lib/aggregate";
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

  return (
    <div data-animate="rise" className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Program aktif</p>
          <h3 className="mt-0.5 text-lg font-semibold">{program.title}</h3>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {program.goal}
          </p>
        </div>
        <StopProgramButton programTitle={program.title} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="pill tone-pink">
          {progress.finished ? "Berakhir" : `Minggu ${progress.currentWeek}/${program.durationWeeks}`}
        </span>
        <span className="pill tone-neutral">
          {formatDay(startDate)} – {formatDay(progress.endDate)}
        </span>
        <span className="pill tone-blue">
          {progress.completedCount}/{total} sesi selesai
          {progress.missedCount > 0 && ` · ${progress.missedCount} terlewat`}
        </span>
      </div>

      {progress.finished ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Program sudah berakhir. Pilih program baru dari rekomendasi Coach untuk melanjutkan.
        </p>
      ) : (
        <div>
          <p className="mb-2 text-sm font-semibold">Sesi minggu ini</p>
          {progress.week.sessions.length > 0 ? (
            <SessionList sessions={progress.week.sessions} />
          ) : (
            <p className="py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Tidak ada sesi terjadwal minggu ini.
            </p>
          )}
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Sesi dihitung selesai kalau lari di tanggal itu mencapai 90% jarak rencana.
      </p>
    </div>
  );
}
