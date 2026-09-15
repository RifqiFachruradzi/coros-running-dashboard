"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatPace } from "@/lib/aggregate";

export interface TrendPoint {
  x: string;
  y: number | null;
}

// Server Components can't pass functions to Client Components, so the page
// picks a formatter by name and the function itself lives here.
export type TrendFormat = "pace" | "integer";

const FORMATTERS: Record<TrendFormat, (v: number) => string> = {
  pace: (v) => formatPace(v),
  integer: (v) => String(Math.round(v)),
};

export function TrendLineChart({
  data,
  color = "var(--series-1)",
  format,
  unit,
}: {
  data: TrendPoint[];
  color?: string;
  format: TrendFormat;
  unit?: string;
}) {
  const formatY = FORMATTERS[format];
  const clean = data.filter((d) => d.y !== null);

  if (clean.length === 0) {
    return (
      <div
        className="h-40 flex items-center justify-center text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Belum ada data yang cukup.
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={clean} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="var(--gridline)"
            strokeDasharray="0"
            vertical={false}
          />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={formatY}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: number) => [
              `${formatY(value)}${unit ? " " + unit : ""}`,
              undefined,
            ]}
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
