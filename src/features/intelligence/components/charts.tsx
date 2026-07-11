"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

import { cn } from "@/lib/utils";
import type { NamedCount, RatingBucket, TimeSeriesPoint } from "@/types/intelligence";

const COLORS = [
  "hsl(38 92% 50%)",
  "hsl(200 70% 50%)",
  "hsl(280 55% 55%)",
  "hsl(152 55% 42%)",
  "hsl(0 70% 55%)",
  "hsl(220 60% 55%)",
  "hsl(320 50% 55%)",
  "hsl(45 90% 50%)",
];

/** Shared tooltip — dark glass, never flashes pure white on hover. */
const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  border: "none",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 32px rgb(0 0 0 / 0.35)",
  padding: "8px 12px",
};

const tooltipLabelStyle: React.CSSProperties = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
  marginBottom: 2,
};

const tooltipItemStyle: React.CSSProperties = {
  color: "hsl(var(--muted-foreground))",
};

/** Soft bar hover band — muted, not solid white. */
const barCursor = {
  fill: "hsl(var(--muted-foreground) / 0.12)",
  radius: 6,
};

function ChartShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border-0 bg-muted/35 p-4 dark:bg-white/[0.04]",
        className,
      )}
    >
      <header className="mb-3 space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="h-56 w-full" role="img" aria-label={title}>
        {children}
      </div>
    </section>
  );
}

function ChartTooltip() {
  return (
    <Tooltip
      cursor={barCursor}
      contentStyle={tooltipStyle}
      labelStyle={tooltipLabelStyle}
      itemStyle={tooltipItemStyle}
      wrapperStyle={{ outline: "none" }}
    />
  );
}

export function GenrePieChart({ data }: { data: NamedCount[] }) {
  const chartData = data.slice(0, 8).map((d) => ({ name: d.name, value: d.count }));
  if (!chartData.length) {
    return (
      <ChartShell title="Genre breakdown" description="No genre data yet">
        <EmptyChart />
      </ChartShell>
    );
  }
  return (
    <ChartShell title="Genre breakdown" description="Where your library leans">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            wrapperStyle={{ outline: "none" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function RatingBarChart({ data }: { data: RatingBucket[] }) {
  if (!data.some((d) => d.count > 0)) {
    return (
      <ChartShell title="Rating distribution" description="Rate titles to see this">
        <EmptyChart />
      </ChartShell>
    );
  }
  return (
    <ChartShell title="Rating distribution" description="How generously you score">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.12)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <ChartTooltip />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ActivityAreaChart({ data }: { data: TimeSeriesPoint[] }) {
  if (!data.length) {
    return (
      <ChartShell title="Monthly activity" description="Sessions over time">
        <EmptyChart />
      </ChartShell>
    );
  }
  return (
    <ChartShell title="Monthly activity" description="Watch sessions by month">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.12)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            cursor={{ stroke: "hsl(var(--primary) / 0.45)", strokeWidth: 1 }}
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            wrapperStyle={{ outline: "none" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="url(#fillActivity)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function WeekdayBarChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <ChartShell title="Weekly habits" description="Which days you watch most">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.12)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <ChartTooltip />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function NamedCountBars({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: NamedCount[];
}) {
  if (!data.length) {
    return (
      <ChartShell title={title} description={description}>
        <EmptyChart />
      </ChartShell>
    );
  }
  return (
    <ChartShell title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.12)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <ChartTooltip />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Not enough data yet
    </div>
  );
}
