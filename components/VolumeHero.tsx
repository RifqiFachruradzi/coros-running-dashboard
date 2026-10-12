"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ChartEmpty } from "@/components/ChartEmpty";

export interface HeroStat {
  label: string;
  value: string;
  sub?: string;
}

/**
 * The blue headline card: weekly volume as a smooth yellow wave, with three
 * figures underneath. The middle figure sits on a raised black tab.
 */
export function VolumeHero({
  volume,
  stats,
}: {
  volume: { week: string; km: number }[];
  stats: [HeroStat, HeroStat, HeroStat];
}) {
  const hasData = volume.some((w) => w.km > 0);

  return (
    <div
      data-animate="rise"
      className="flex min-w-0 flex-col overflow-hidden rounded-[26px]"
      style={{ background: "var(--blue)", color: "var(--on-color)" }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <h2 className="text-base font-semibold">Volume mingguan</h2>
        <span className="pill" style={{ border: "1px solid rgba(10, 10, 12, 0.4)" }}>
          {volume.length} minggu
        </span>
      </div>

      <div className="mt-3 h-44 px-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "rgba(10, 10, 12, 0.75)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                padding={{ left: 18, right: 18 }}
              />
              <YAxis hide domain={[0, "dataMax + 2"]} />
              <Tooltip
                cursor={{ stroke: "rgba(10, 10, 12, 0.35)", strokeWidth: 40, strokeOpacity: 0.3 }}
                contentStyle={{
                  background: "var(--on-color)",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 12,
                  padding: "6px 10px",
                }}
                labelStyle={{ color: "var(--text-secondary)" }}
                itemStyle={{ color: "var(--yellow)", fontWeight: 600, padding: 0 }}
                separator=""
                formatter={(value: number) => [`${value.toFixed(1)} km`, ""]}
                labelFormatter={(label) => `Minggu mulai ${label}`}
              />
              <Area
                type="monotone"
                dataKey="km"
                stroke="var(--yellow)"
                strokeWidth={3.5}
                fill="var(--yellow)"
                fillOpacity={0.28}
                dot={false}
                activeDot={{ r: 7, fill: "var(--yellow)", stroke: "var(--on-color)", strokeWidth: 3 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="Belum ada lari dalam 8 minggu terakhir." />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 text-center">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="min-w-0 px-2 pb-5 pt-4"
            style={
              i === 1
                ? {
                    background: "var(--on-color)",
                    color: "var(--text-primary)",
                    borderRadius: "22px 22px 0 0",
                  }
                : undefined
            }
          >
            <dt className="text-[11px]" style={i === 1 ? { color: "var(--text-secondary)" } : undefined}>
              {stat.label}
            </dt>
            <dd
              className={`font-semibold leading-tight tabular-nums ${i === 1 ? "whitespace-nowrap text-base sm:text-3xl" : "text-lg sm:text-2xl"}`}
              style={i === 1 ? { color: "var(--yellow)" } : undefined}
            >
              {stat.value}
            </dd>
            {stat.sub && (
              <dd className="truncate text-[11px]" style={i === 1 ? { color: "var(--text-secondary)" } : undefined}>
                {stat.sub}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
