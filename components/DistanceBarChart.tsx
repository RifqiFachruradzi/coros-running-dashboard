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
import {
  axisTick,
  barCursor,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/components/chart-theme";
import { ChartEmpty } from "@/components/ChartEmpty";

export function DistanceBarChart({
  data,
}: {
  data: { week: string; km: number }[];
}) {
  if (data.length === 0) return <ChartEmpty text="Belum ada data jarak mingguan." />;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="week"
            tick={axisTick}
            axisLine={{ stroke: "var(--baseline)" }}
            tickLine={false}
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={barCursor}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            separator=""
            formatter={(value: number) => [`${value.toFixed(1)} km`, ""]}
            labelFormatter={(label) => `Minggu mulai ${label}`}
          />
          <Bar
            dataKey="km"
            fill="var(--series-2)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
