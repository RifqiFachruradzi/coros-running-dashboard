"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { LoadSnapshot } from "@/lib/types";

export function LoadChart({ data }: { data: LoadSnapshot[] }) {
  const clean = data.filter((d) => d.shortTermLoad !== null || d.longTermLoad !== null);

  if (clean.length === 0) {
    return (
      <div
        className="h-48 flex items-center justify-center text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Belum ada data training load.
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={clean} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            iconType="line"
            iconSize={12}
          />
          <Line
            type="monotone"
            dataKey="shortTermLoad"
            name="Short-term load"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="longTermLoad"
            name="Long-term load"
            stroke="var(--series-4)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
