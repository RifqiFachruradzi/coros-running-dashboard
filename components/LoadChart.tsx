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
import { formatDay, formatShortDay } from "@/lib/aggregate";
import {
  axisTick,
  dotStyle,
  lineCursor,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/components/chart-theme";
import { ChartEmpty } from "@/components/ChartEmpty";

export function LoadChart({ data }: { data: LoadSnapshot[] }) {
  const clean = data.filter((d) => d.shortTermLoad !== null || d.longTermLoad !== null);

  if (clean.length === 0) return <ChartEmpty text="Belum ada data training load." />;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={clean} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tick={axisTick}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={lineCursor}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={{ ...tooltipItemStyle, fontWeight: 500 }}
            labelFormatter={(label) => formatDay(String(label))}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="plainline"
            iconSize={14}
            formatter={(value) => (
              <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="shortTermLoad"
            name="Short-term"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={dotStyle("var(--series-1)", 5)}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="longTermLoad"
            name="Long-term"
            stroke="var(--series-2)"
            strokeWidth={2}
            dot={false}
            activeDot={dotStyle("var(--series-2)", 5)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
