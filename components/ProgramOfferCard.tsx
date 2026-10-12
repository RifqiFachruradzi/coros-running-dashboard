import type { TrainingProgram } from "@/lib/coach";
import { AcceptProgramButton } from "@/components/ProgramActions";
import { Icon } from "@/components/icons";
import { describeSession } from "@/components/SessionList";

const TONES = ["tone-blue", "tone-yellow", "tone-pink"] as const;

export function ProgramOfferCard({
  program,
  index,
  activeTitle,
  isActive,
  storageReady,
}: {
  program: TrainingProgram;
  /** Position in the list, used to rotate the icon color */
  index: number;
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

  const meta = [
    `${program.durationWeeks} minggu`,
    `${perWeek}×/minggu`,
    `${totalKm.toFixed(0)} km total`,
    longest > 0 && `terjauh ${longest} km`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-animate="rise"
      className="flex flex-col gap-3 rounded-[20px] p-4"
      style={{ border: "1px solid var(--border-hairline)" }}
    >
      <div className="flex items-start gap-3.5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${TONES[index % TONES.length]}`}>
          <Icon name={isActive ? "flag" : "trend"} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{program.title}</h4>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {meta}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {program.goal}
          </p>
        </div>
      </div>
      {firstWeek.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Minggu pertama">
          {firstWeek.map((s) => (
            <li key={s.day} className="pill tone-neutral font-medium">
              Hari {s.day} · {s.title}
              {describeSession(s) && ` · ${describeSession(s)}`}
            </li>
          ))}
        </ul>
      )}
      <AcceptProgramButton
        programId={program.id}
        programTitle={program.title}
        replacingTitle={activeTitle && !isActive ? activeTitle : undefined}
        disabledReason={disabledReason}
      />
    </div>
  );
}
