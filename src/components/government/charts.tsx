import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Activity, Timer, Layers } from "lucide-react";
import { SectionCard } from "./section-card";
import { duration, Table } from "@/components/admin/shared";
import type { Analytics, Mandi, Visit } from "@/services/adminService";
const COLORS = [
  "#3b82f6",
  "#60a5fa",
  "#f59e0b",
  "#8b5cf6",
  "#0ea5e9",
  "#16a34a",
  "#94a3b8",
  "#ef4444",
];
const STAGES = [
  "Booked",
  "Checked In",
  "Waiting",
  "Quality Check",
  "Procurement",
  "Completed",
  "Missed",
  "Cancelled",
];
export function StageDistribution({ visits }: { visits: Visit[] }) {
  const data = STAGES.map((name, i) => ({
    name,
    value: visits.filter((v) => v.status === name).length,
    color: COLORS[i],
  })).filter((v) => v.value > 0);
  return (
    <SectionCard
      title="Queue Stage Distribution"
      description="Visits scheduled or checked in on the reporting date"
      icon={<Layers className="size-4" />}
    >
      {data.length ? (
        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex min-h-48 items-center justify-center text-center text-sm text-muted-foreground">
          No visits recorded for this date.
        </p>
      )}
    </SectionCard>
  );
}
export function WaitingTrend({ analytics }: { analytics: Analytics }) {
  const recorded = analytics.trend.some((d) => d.samples > 0);
  return (
    <SectionCard
      title="Waiting-Time Trend"
      description="Recorded daily averages · last seven reporting days"
      icon={<Activity className="size-4" />}
    >
      {recorded ? (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={analytics.trend} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickFormatter={(s) => String(s).slice(5)}
              tick={{ fontSize: 11 }}
            />
            <YAxis unit="m" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area
              type="linear"
              dataKey="averageWaitingMin"
              name="Measured wait (minutes)"
              stroke="#2563eb"
              fill="#dbeafe"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="flex min-h-48 items-center justify-center text-center text-sm text-muted-foreground">
          Waiting trends appear after check-in and service-start times have been recorded.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Missing measurements remain gaps. No synthetic forecast or confidence score is added.
      </p>
    </SectionCard>
  );
}
export function WaitingEstimates({ mandis }: { mandis: Mandi[] }) {
  return (
    <SectionCard
      title="Waiting-Time Estimates"
      description="Rule-based estimates for an arriving farmer"
      icon={<Timer className="size-4" />}
    >
      <Table
        rows={mandis}
        columns={[
          { label: "Centre", render: (m) => m.name.split(" — ")[0] },
          { label: "Estimated wait", render: (m) => duration(m.waitingMin) },
          { label: "Counters", render: (m) => m.activeCounters },
          { label: "Minutes per farmer", render: (m) => m.processingMin },
        ]}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Uses the live queue, available counters and configured service duration. This is not a
        trained AI model or a two-hour forecast.
      </p>
    </SectionCard>
  );
}
