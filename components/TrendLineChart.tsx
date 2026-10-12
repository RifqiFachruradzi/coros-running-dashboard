"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatDay, formatPace, formatShortDay } from "@/lib/aggregate";
import {
  axisTick,
  dotStyle,
  lineCursor,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/components/chart-theme";
import { ChartEmpty } from "@/components/ChartEmpty";

export interface TrendPoint {
  x: string; // yyyy-MM-dd
  y: number | null;
}

// Server Components can't pass functions to Client Components, so the page
// picks a formatter by name and the function itself lives here.
export type TrendFormat = "pace" | "integer";

const FORMATTERS: Record<TrendFormat, (v: number) => string> = {
  pace: (v) => formatPace(v),
  integer: (v) => String(Math.round(v)),
};

// Pad the axis around the data (rounded to clean steps) instead of starting at
// zero, which flattened every trend into a straight line.
const DOMAINS: Record<TrendFormat, [(min: number) => number, (max: number) => number]> = {
  pace: [(min) => Math.floor((min - 15) / 30) * 30, (max) => Math.ceil((max + 15) / 30) * 30],
  integer: [(min) => Math.max(0, Math.floor((min - 3) / 5) * 5), (max) => Math.ceil((max + 3) / 5) * 5],
};

export function TrendLineChart({
  data,
  color = "var(--blue)",
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

  if (clean.length === 0) return <ChartEmpty text="Belum ada data yang cukup." />;

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={clean} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={formatShortDay}
            tick={axisTick}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={formatY}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={DOMAINS[format]}
            // A lower pace is faster, so flip the axis: up always means better.
            reversed={format === "pace"}
            tickCount={format === "pace" ? 5 : 4}
            allowDecimals={false}
          />
          <Tooltip
            cursor={lineCursor}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            separator=""
            formatter={(value: number) => [`${formatY(value)}${unit ? ` ${unit}` : ""}`, ""]}
            labelFormatter={(label) => formatDay(String(label))}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={3}
            fill={color}
            fillOpacity={0.18}
            // Fill down to the bottom edge. The pace axis is reversed, so its
            // bottom is the largest (slowest) value.
            baseValue={format === "pace" ? "dataMax" : "dataMin"}
            dot={dotStyle(color)}
            activeDot={dotStyle(color, 6)}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
