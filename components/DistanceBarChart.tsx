"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function DistanceBarChart({
  data,
}: {
  data: { week: string; km: number }[];
}) {
  if (data.length === 0) {
    return (
      <div
        className="h-40 flex items-center justify-center text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Belum ada data jarak mingguan.
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)} km`, "Jarak"]}
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
          <Bar dataKey="km" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
