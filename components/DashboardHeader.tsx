import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { RunActivity } from "@/lib/types";
import type { DashboardStatus } from "@/lib/token-store";
import { formatShortDay } from "@/lib/aggregate";
import { BoltS, Brand } from "@/components/Logo";
import { Icon, type IconName } from "@/components/icons";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "numeric", hourCycle: "h23" }).format(new Date())
  );
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function Chip({
  icon,
  tone,
  label,
  value,
  href,
}: {
  icon: IconName;
  tone: "pink" | "yellow" | "blue";
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl tone-${tone}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span className="block truncate text-sm font-semibold tabular-nums">{value}</span>
      </span>
    </>
  );
  const className = "flex min-w-0 items-center gap-2.5 rounded-2xl py-2 pl-2 pr-4";
  const style = { background: "var(--surface-1)" };
  return href ? (
    <Link href={href} className={`${className} link transition-colors hover:bg-[#101014]`} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

/** The dashboard's brand bar: STRIDE+ mark, sync state, greeting and quick facts. */
export function DashboardHeader({
  today,
  lastRun,
  totalRuns,
  weekKm,
  status,
}: {
  today: string;
  lastRun: RunActivity | undefined;
  totalRuns: number;
  weekKm: number;
  status: DashboardStatus;
}) {
  const longDate = format(new Date(`${today}T00:00:00`), "EEEE, d MMMM yyyy", { locale: id });

  return (
    <header data-animate="rise" className="card relative overflow-hidden p-4 sm:p-5">
      {/* Oversized faint bolt as a backdrop on the right */}
      <span className="pointer-events-none absolute -right-6 -top-10 opacity-[0.07]" aria-hidden>
        <BoltS size={220} fill="var(--yellow)" />
      </span>

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <Brand size="lg" tagline="Running dashboard · COROS" />
        <SyncStatusBadge status={status} />
      </div>

      <div className="relative my-4 h-px" style={{ background: "var(--border-hairline)" }} />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium capitalize" style={{ color: "var(--text-secondary)" }}>
            {longDate}
          </p>
          <h1 className="text-2xl font-bold sm:text-[28px]">
            {greeting()}
            <span style={{ color: "var(--pink)" }}>.</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Ini ringkasan latihanmu hari ini.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
          <Chip
            icon="runner"
            tone="pink"
            label="Lari terakhir"
            value={lastRun ? `${lastRun.distanceKm.toFixed(2)} km · ${formatShortDay(lastRun.date)}` : "—"}
            href={lastRun ? `/aktivitas/${lastRun.labelId}` : undefined}
          />
          <Chip icon="calendar" tone="yellow" label="Minggu ini" value={`${weekKm.toFixed(1)} km`} />
          <Chip icon="history" tone="blue" label="Total aktivitas" value={`${totalRuns} lari`} href="/riwayat" />
        </div>
      </div>
    </header>
  );
}
