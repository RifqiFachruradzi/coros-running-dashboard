import type { Metadata } from "next";
import { isAuthEnabled } from "@/lib/auth";
import { readFitnessHistory, readLoadHistory, readRuns } from "@/lib/data-store";
import { loadDashboardStatus } from "@/lib/token-store";
import { programProgress } from "@/lib/coach";
import { CoachChat } from "@/components/CoachChat";
import { Sidebar } from "@/components/Sidebar";
import { Motion } from "@/components/Motion";

export const metadata: Metadata = { title: "Chat Coach — Dashboard Lari" };

export const revalidate = 0;

export default async function ChatPage() {
  const [runs, fitnessHistory, loadHistory, status] = await Promise.all([
    readRuns(),
    readFitnessHistory(),
    readLoadHistory(),
    loadDashboardStatus(),
  ]);

  const lastRun = [...runs].sort((a, b) => b.startTimestamp - a.startTimestamp)[0];
  const fitness = fitnessHistory[fitnessHistory.length - 1];
  const load = loadHistory[loadHistory.length - 1];
  const active = status.activeProgram;
  const progress = active ? programProgress(active, runs) : null;

  // The same figures the server adds to every chat request, shown so the
  // runner knows what Coach is looking at.
  const context = [
    { label: "Load ratio", value: load?.loadRatio != null ? load.loadRatio.toFixed(2) : "—" },
    { label: "VO2max", value: fitness?.vo2max != null ? String(fitness.vo2max) : "—" },
    { label: "Lari terakhir", value: lastRun ? `${lastRun.distanceKm.toFixed(2)} km` : "—" },
    {
      label: "Program",
      value: active && progress ? `${active.program.title} · mgg ${progress.currentWeek}` : "Belum ada",
    },
  ];

  return (
    <main className="min-h-dvh px-3 py-4 sm:px-6 sm:py-8">
      <div className="app-shell mx-auto flex max-w-[1240px] flex-col gap-5 p-3 sm:p-5 lg:flex-row">
        <Sidebar active="/chat" showLogout={isAuthEnabled()} />

        <aside className="flex min-w-0 flex-col gap-4 lg:w-[280px] lg:shrink-0">
          <div
            data-animate="rise"
            className="flex flex-col gap-3 rounded-3xl p-5"
            style={{ background: "var(--blue)", color: "var(--on-color)" }}
          >
            <h2 className="text-sm font-semibold">Yang dibaca Coach</h2>
            <dl className="grid grid-cols-2 gap-2">
              {context.map((item) => (
                <div key={item.label} className="min-w-0 rounded-2xl p-2.5" style={{ background: "rgba(10, 10, 12, 0.12)" }}>
                  <dt className="text-[10px]">{item.label}</dt>
                  <dd className="truncate text-sm font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px]">Ditambah training load, kondisi tubuh, dan rekomendasi terbaru.</p>
          </div>
        </aside>

        <div data-animate="rise" className="min-w-0 flex-1">
          <CoachChat />
        </div>
      </div>
      <Motion />
    </main>
  );
}
