import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { readRuns } from "@/lib/data-store";
import { todayInJakarta } from "@/lib/aggregate";
import { currentStreak, lifetimeTotals, monthCalendar, monthlyTotals, yearlyTotals } from "@/lib/insights";
import { AppShell, PageHeader } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { ActivityTable } from "@/components/ActivityTable";
import { Icon } from "@/components/icons";
import { formatHours } from "@/components/format";

export const metadata: Metadata = { title: "Riwayat latihan — Dashboard Lari" };
export const revalidate = 0;

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

const monthName = (month: string, pattern = "MMMM yyyy") =>
  format(new Date(`${month}-01T00:00:00`), pattern, { locale: id });

/** Heat level of a day: more km, stronger pink. */
function dayStyle(km: number): React.CSSProperties {
  if (km <= 0) return { background: "var(--surface-1)", color: "var(--text-muted)" };
  if (km < 3) return { background: "rgba(255, 79, 154, 0.22)", color: "var(--text-primary)" };
  if (km < 5) return { background: "rgba(255, 79, 154, 0.5)", color: "var(--text-primary)" };
  return { background: "var(--pink)", color: "var(--on-color)" };
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const { bulan } = await searchParams;
  const runs = (await readRuns()).sort((a, b) => b.startTimestamp - a.startTimestamp);
  const today = todayInJakarta();
  const thisMonth = today.slice(0, 7);
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) && bulan <= thisMonth ? bulan : thisMonth;

  const days = monthCalendar(runs, month);
  const leadingBlanks = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthKm = days.reduce((s, d) => s + d.km, 0);
  const monthRuns = days.reduce((s, d) => s + d.runs, 0);
  const activeDays = days.filter((d) => d.runs > 0).length;
  const firstRunOn = (date: string) => runs.find((r) => r.date === date);

  const months = monthlyTotals(runs, thisMonth, 12);
  const maxMonthKm = Math.max(1, ...months.map((m) => m.km));
  const lifetime = lifetimeTotals(runs);
  const streak = currentStreak(runs, today);

  return (
    <AppShell active="/riwayat">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8 lg:py-1.5">
        <PageHeader
          eyebrow="Riwayat latihan"
          title="Semua latihanmu di satu tempat"
          description="Kalender, total per bulan dan tahun, serta setiap lari yang tercatat dari COROS."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <StatTile solid label="Total jarak" value={lifetime.km.toFixed(1)} unit="km" />
          <StatTile tone="blue" label="Total lari" value={String(lifetime.runs)} unit="sesi" />
          <StatTile tone="yellow" label="Total waktu" value={formatHours(lifetime.seconds)} />
          <StatTile
            tone="pink"
            label="Lari pertama"
            value={lifetime.firstDate ? format(new Date(`${lifetime.firstDate}T00:00:00`), "d MMM", { locale: id }) : "—"}
            note={lifetime.firstDate?.slice(0, 4)}
          />
          <StatTile
            tone="neutral"
            label="Streak saat ini"
            value={String(streak)}
            unit="hari"
            note={streak === 0 ? "Lari hari ini untuk memulai" : undefined}
          />
        </div>

        <section data-animate="rise" className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold capitalize">{monthName(month)}</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {monthKm.toFixed(1)} km · {monthRuns} lari · {activeDays} hari aktif
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/riwayat?bulan=${shiftMonth(month, -1)}`}
                aria-label="Bulan sebelumnya"
                className="icon-button tone-neutral"
              >
                <Icon name="chevronLeft" />
              </Link>
              {month < thisMonth ? (
                <Link
                  href={`/riwayat?bulan=${shiftMonth(month, 1)}`}
                  aria-label="Bulan berikutnya"
                  className="icon-button tone-neutral"
                >
                  <Icon name="chevronRight" />
                </Link>
              ) : (
                <span className="icon-button tone-neutral opacity-40" aria-hidden>
                  <Icon name="chevronRight" />
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`Kalender ${monthName(month)}`}>
            {WEEKDAYS.map((d) => (
              <div key={d} role="columnheader" className="pb-1 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {d}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}
            {days.map((day) => {
              const run = day.runs ? firstRunOn(day.date) : undefined;
              const label = `${Number(day.date.slice(8))} ${monthName(month, "MMM")}: ${
                day.runs ? `${day.km.toFixed(2)} km, ${day.runs} lari` : "tidak lari"
              }`;
              const body = (
                <>
                  <span className="text-[11px] sm:text-xs">{Number(day.date.slice(8))}</span>
                  {day.runs > 0 && (
                    <span className="text-[10px] font-bold tabular-nums sm:text-sm">{day.km.toFixed(1)}</span>
                  )}
                </>
              );
              const className = `flex aspect-square flex-col items-center justify-center rounded-xl sm:aspect-auto sm:h-16 sm:rounded-2xl ${
                day.date === today ? "ring-2 ring-[var(--yellow)]" : ""
              }`;
              return run ? (
                <Link
                  key={day.date}
                  href={`/aktivitas/${run.labelId}`}
                  role="gridcell"
                  aria-label={label}
                  title={label}
                  className={`${className} link transition-opacity hover:opacity-80`}
                  style={dayStyle(day.km)}
                >
                  {body}
                </Link>
              ) : (
                <div key={day.date} role="gridcell" aria-label={label} className={className} style={dayStyle(0)}>
                  {body}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span>Jarak per hari:</span>
            {[
              ["< 3 km", 1],
              ["3–5 km", 4],
              ["≥ 5 km", 6],
            ].map(([text, km]) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded" style={dayStyle(Number(km))} />
                {text}
              </span>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="12 bulan terakhir" description="Total jarak per bulan." />
          <div data-animate="rise" className="card p-5">
            <div className="flex h-48 items-end gap-1.5 sm:gap-3" role="img" aria-label={months
              .map((m) => `${monthName(m.key, "MMM yyyy")}: ${m.km.toFixed(1)} km`)
              .join(", ")}>
              {months.map((m) => (
                <Link
                  key={m.key}
                  href={`/riwayat?bulan=${m.key}`}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  aria-label={`${monthName(m.key)}: ${m.km.toFixed(1)} km`}
                >
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                    {m.km > 0 ? m.km.toFixed(0) : ""}
                  </span>
                  <span
                    data-animate="column"
                    className="w-full rounded-t-lg transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max((m.km / maxMonthKm) * 100, m.km > 0 ? 4 : 1)}%`,
                      background: m.key === month ? "var(--pink)" : m.km > 0 ? "var(--blue)" : "var(--gridline)",
                    }}
                  />
                </Link>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 sm:gap-3">
              {months.map((m) => (
                <span key={m.key} className="min-w-0 flex-1 truncate text-center text-[10px] capitalize" style={{ color: "var(--text-secondary)" }}>
                  {monthName(m.key, "MMM")}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader title="Per tahun" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {yearlyTotals(runs).map((y) => (
              <div key={y.key} data-animate="rise" className="card flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-2xl font-bold">{y.key}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {y.runs} lari · {formatHours(y.seconds)}
                  </p>
                </div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--yellow)" }}>
                  {y.km.toFixed(1)} km
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="semua">
          <SectionHeader title="Semua lari" description={`${runs.length} aktivitas. Klik tanggal untuk analisis detail.`} />
          <div className="overflow-hidden rounded-[22px]" style={{ border: "1px solid var(--border-hairline)" }}>
            <ActivityTable runs={runs} limit={runs.length} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
