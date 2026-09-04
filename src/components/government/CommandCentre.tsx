import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Building2,
  Timer,
  TriangleAlert,
  PackageCheck,
  CalendarClock,
  Wheat,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass, LoadState, useAdmin } from "@/components/admin/shared";
import {
  indiaDay,
  type Metrics,
  type Mandi,
  type Analytics,
  type Visit,
  type StaffNotifications,
} from "@/services/adminService";
import { CentrePanels, QueueMonitor } from "./centre-panels";
import { StageDistribution, WaitingEstimates, WaitingTrend } from "./charts";
import {
  ActionPanel,
  Coordination,
  Disruptions,
  Recovery,
  ActivityFeed,
} from "./operations-panels";

export function CommandCentre() {
  const [day, setDay] = useState(indiaDay());
  const [crop, setCrop] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const dashboard = useAdmin<{ metrics: Metrics; mandis: Mandi[] }>("dashboard", { day });
  const queue = useAdmin<Visit[]>("queue", { day });
  const start = new Date(new Date(day + "T12:00:00Z").getTime() - 6 * 86400000)
    .toISOString()
    .slice(0, 10);
  const analytics = useAdmin<Analytics>("analytics", { start, end: day });
  const notifications = useAdmin<StaffNotifications>("notifications");
  const all = dashboard.data?.mandis ?? [];
  const mandis = all.filter(
    (m) =>
      (!crop || m.crops.includes(crop)) &&
      (!district || m.district === district) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase())),
  );
  const centreIds = new Set(mandis.map((m) => m.id));
  const visibleVisits = queue.data?.filter((v) => centreIds.has(v.centre_id)) ?? [];
  const refresh = () =>
    Promise.all([
      dashboard.refetch(),
      queue.refetch(),
      analytics.refetch(),
      notifications.refetch(),
    ]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <Field label="Reporting date (India)">
          <input
            type="date"
            className={inputClass}
            value={day}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value);
            }}
          />
        </Field>
        <p className="flex-1 text-xs text-muted-foreground">
          Network metrics use the reporting date; queues and capacity reflect current conditions.
        </p>
        <Button variant="outline" onClick={() => void refresh()} disabled={dashboard.isFetching}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/$section" params={{ section: "notifications" }}>
            <Bell className="size-4" />
            Notifications
          </Link>
        </Button>
        <span className={`text-xs ${dashboard.isError ? "text-red-700" : "text-emerald-700"}`}>
          {dashboard.isError
            ? "Connection unavailable"
            : dashboard.dataUpdatedAt
              ? "Updated " +
                new Date(dashboard.dataUpdatedAt).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "Connecting…"}
        </span>
      </div>
      <LoadState pending={dashboard.isPending} error={dashboard.error} retry={dashboard.refetch} />
      {dashboard.data && (
        <>
          <Kpis metrics={dashboard.data.metrics} />
          <div className="grid items-end gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
            <Field label="Filter centre panels by crop">
              <select className={inputClass} value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="">All crops</option>
                {[...new Set(all.flatMap((m) => m.crops))].sort().map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="District">
              <select
                className={inputClass}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                <option value="">All districts</option>
                {[...new Set(all.map((m) => m.district))].sort().map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Search centres">
              <input
                className={inputClass}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Centre name"
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Centre filters apply to the map, ranking, estimates, stage distribution, queue
              monitor, actions and coordination. Network KPIs, historical trends and delay reports
              retain their labelled scope.
            </p>
          </div>
          <CentrePanels mandis={mandis} day={day} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <WaitingEstimates mandis={mandis} />
            </div>
            <div>
              <LoadState pending={queue.isPending} error={queue.error} retry={queue.refetch} />
              {queue.data && <StageDistribution visits={visibleVisits} />}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <LoadState
                pending={analytics.isPending}
                error={analytics.error}
                retry={analytics.refetch}
              />
              {analytics.data && <WaitingTrend analytics={analytics.data} />}
            </div>
            <ActionPanel mandis={mandis} />
          </div>
          <QueueMonitor mandis={mandis} />
          <LoadState
            pending={notifications.isPending}
            error={notifications.error}
            retry={notifications.refetch}
          />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Coordination mandis={mandis} day={day} />
            {notifications.data && <Disruptions data={notifications.data} />}
          </div>
          {notifications.data && (
            <>
              <Recovery data={notifications.data} />
              <ActivityFeed data={notifications.data} />
            </>
          )}
          <p className="text-center text-xs text-muted-foreground">
            MandiSetu · Shared farmer and government database · Refreshes every 10 seconds
          </p>
        </>
      )}
    </div>
  );
}
function Kpis({ metrics: m }: { metrics: Metrics }) {
  const waitingTime =
    m.averageWaitingMin === null
      ? "Not recorded"
      : m.averageWaitingMin >= 60
        ? `${Math.floor(m.averageWaitingMin / 60)}h ${Math.round(m.averageWaitingMin % 60)}m`
        : `${Math.round(m.averageWaitingMin)} min`;
  const kpis = [
    {
      label: "Total Farmers",
      value: m.totalFarmers,
      icon: Users,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Scheduled Today",
      value: m.scheduledToday,
      icon: CalendarClock,
      tone: "text-blue-700 bg-blue-50",
    },
    { label: "Farmers Waiting", value: m.waiting, icon: Users, tone: "text-amber-700 bg-amber-50" },
    {
      label: "Processed Today",
      value: m.processedToday,
      icon: PackageCheck,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Procured Today",
      value: m.procurementQuintals + " qtl",
      icon: Wheat,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Average Waiting Time",
      value: waitingTime,
      icon: Timer,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      label: "Active Centres",
      value: m.activeMandis,
      icon: Building2,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Overloaded Centres",
      value: m.overloadedMandis,
      icon: TriangleAlert,
      tone: "text-red-700 bg-red-50",
    },
  ];
  return (
    <>
      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Key performance indicators"
      >
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
              <Icon className="size-4" />
            </span>
            <p className="mt-3 break-words text-2xl font-bold tabular-nums">
              {value}
            </p>
            <p className="mt-1 text-xs font-medium">{label}</p>
          </div>
        ))}
      </section>
      {m.quantityNotRecorded > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
          {m.quantityNotRecorded} completed visits lack measured quantities and are excluded from
          procurement totals.
        </p>
      )}
    </>
  );
}
