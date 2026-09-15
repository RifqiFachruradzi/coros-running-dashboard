import type { TrainingProgram } from "@/lib/coach";
import { SessionList } from "@/components/SessionList";
import { AcceptProgramButton } from "@/components/ProgramActions";

export function ProgramOfferCard({
  program,
  activeTitle,
  isActive,
  storageReady,
}: {
  program: TrainingProgram;
  /** Title of the program the user is currently running, if any */
  activeTitle: string | null;
  isActive: boolean;
  storageReady: boolean;
}) {
  const totalKm = program.sessions.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0);
  const perWeek = Math.round(program.sessions.length / program.durationWeeks);
  const longest = Math.max(...program.sessions.map((s) => s.distanceKm ?? 0));
  const firstWeek = program.sessions.filter((s) => s.day <= 7);

  const disabledReason = isActive
    ? "Program ini sedang berjalan."
    : !storageReady
    ? "Hubungkan Upstash Redis untuk menyimpan program."
    : undefined;

  return (
    <div className="card flex flex-col p-5">
      <h3 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {program.title}
      </h3>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {program.goal}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="pill">{program.durationWeeks} minggu</span>
        <span className="pill">{perWeek}×/minggu</span>
        <span className="pill">{totalKm.toFixed(0)} km total</span>
        {longest > 0 && <span className="pill">Terjauh {longest} km</span>}
      </div>

      <p className="eyebrow mt-5">Minggu pertama</p>
      <div className="mb-5 mt-1 flex-1">
        <SessionList sessions={firstWeek} />
      </div>

      <AcceptProgramButton
        programId={program.id}
        programTitle={program.title}
        replacingTitle={activeTitle && !isActive ? activeTitle : undefined}
        disabledReason={disabledReason}
      />
    </div>
  );
}
