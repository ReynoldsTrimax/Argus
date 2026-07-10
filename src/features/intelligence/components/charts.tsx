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
        "rounded-2xl border border-border bg-card/60 p-4 shadow-xs",
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
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
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
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} />
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
              <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(38 92% 50%)"
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
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="hsl(200 70% 50%)" radius={[6, 6, 0, 0]} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="hsl(280 55% 55%)" radius={[0, 6, 6, 0]} />
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
