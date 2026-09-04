import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LifeBuoy, TriangleAlert, Waypoints, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import {
  useAdmin,
  LoadState,
  Table,
  Status,
  duration,
  timestamp,
  Field,
  inputClass,
} from "@/components/admin/shared";
import type { Mandi, Alternate, StaffNotifications } from "@/services/adminService";

export function ActionPanel({ mandis }: { mandis: Mandi[] }) {
  const alerts = mandis.filter((m) => m.status === "Overloaded" || m.status === "Busy");
  return (
    <SectionCard
      title="Operations Action Centre"
      description="Actions based on current workload thresholds"
      icon={<TriangleAlert className="size-4" />}
    >
      <div className="space-y-3">
        {alerts.map((m) => (
          <div key={m.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{m.name}</p>
              <Status value={m.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {m.workload}% workload · {m.queue} active farmers. Review available counters and
              nearby alternatives.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/admin/$section" params={{ section: "mandis" }}>
                Review mandi <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
        ))}
        {!alerts.length && (
          <p className="text-sm text-muted-foreground">
            No matching centres currently exceed the busy threshold.
          </p>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link to="/admin/$section" params={{ section: "slots" }}>
            Manage slot capacity <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>
    </SectionCard>
  );
}
export function Coordination({ mandis, day }: { mandis: Mandi[]; day: string }) {
  const [selection, setSelection] = useState("");
  const centreId = mandis.some((m) => m.id === selection)
    ? selection
    : (mandis.find((m) => m.status === "Overloaded")?.id ?? mandis[0]?.id);
  return (
    <SectionCard
      title="Centre Coordination"
      description="Nearby alternatives with compatible crops and bookable capacity"
      icon={<Waypoints className="size-4" />}
    >
      {centreId ? (
        <>
          <Field label="Current mandi">
            <select
              className={inputClass}
              value={centreId}
              onChange={(e) => setSelection(e.target.value)}
            >
              {mandis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.workload}% workload
                </option>
              ))}
            </select>
          </Field>
          <Alternatives key={centreId} centreId={centreId} day={day} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No matching mandis.</p>
      )}
    </SectionCard>
  );
}
function Alternatives({ centreId, day }: { centreId: string; day: string }) {
  const q = useAdmin<Alternate[]>(`mandis/${centreId}/alternatives`, { day });
  return (
    <div className="mt-4 space-y-3">
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <Table
          rows={q.data}
          empty="No eligible alternatives with available slots on this date."
          columns={[
            { label: "Nearby centre", render: (r) => r.name },
            { label: "Distance", render: (r) => `${r.distanceKm} km` },
            { label: "Wait", render: (r) => duration(r.waitingMin) },
            { label: "Capacity", render: (r) => r.availableCapacity },
            { label: "Slot places", render: (r) => r.availableSlots },
          ]}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Distances are straight-line. Recommendations do not move bookings. Farmers confirm recovery
        choices through their existing dashboard.
      </p>
    </div>
  );
}
export function Disruptions({ data }: { data: StaffNotifications }) {
  const open = data.delayReports.filter((r) => !r.resolved);
  return (
    <SectionCard
      title="Disruption Monitor"
      description="Recent delays reported by farmers · up to 100 reports"
      icon={<TriangleAlert className="size-4" />}
    >
      <Table
        rows={open}
        empty="No unresolved farmer delay reports."
        columns={[
          { label: "Farmer", render: (r) => r.farmerName },
          { label: "Centre", render: (r) => r.centreId },
          { label: "Reported issue", render: (r) => r.reason },
          { label: "Expected arrival", render: (r) => timestamp(r.arrival) },
        ]}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        These are farmer-reported delays. No external weather or road monitoring feed is connected.
      </p>
    </SectionCard>
  );
}
export function Recovery({ data }: { data: StaffNotifications }) {
  const reports = data.delayReports;
  const summaries = [
    ["Reports received", reports.length],
    ["Awaiting decision", reports.filter((r) => !r.resolved).length],
    ["Booking changed", reports.filter((r) => r.rescheduled).length],
    ["Original retained", reports.filter((r) => r.resolved && !r.rescheduled).length],
  ];
  return (
    <SectionCard
      title="Farmer Recovery System"
      description="Farmer-confirmed decisions from the shared booking system · latest 100 reports"
      icon={<LifeBuoy className="size-4" />}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaries.map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border p-3">
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <Table
        rows={reports}
        empty="No farmer recovery reports yet."
        columns={[
          { label: "Farmer", render: (r) => r.farmerName },
          { label: "Original mandi", render: (r) => r.centreId },
          { label: "Issue", render: (r) => r.reason },
          { label: "Original slot", render: (r) => r.originalSlot ?? "Not recorded" },
          { label: "Confirmed slot", render: (r) => r.newSlot ?? "Awaiting farmer" },
          { label: "Destination", render: (r) => r.destinationCentreId ?? "—" },
          {
            label: "Decision",
            render: (r) =>
              r.rescheduled ? "Booking changed" : r.resolved ? "Original retained" : "Pending",
          },
        ]}
      />
    </SectionCard>
  );
}
export function ActivityFeed({ data }: { data: StaffNotifications }) {
  return (
    <SectionCard
      title="Latest Operations"
      description="Saved backend activity"
      icon={<Bell className="size-4" />}
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/$section" params={{ section: "notifications" }}>
            View all
          </Link>
        </Button>
      }
    >
      <ul className="space-y-3">
        {data.events.slice(0, 5).map((event) => (
          <li key={event.id} className="border-b pb-3 text-sm last:border-0">
            <p>{event.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timestamp(event.created_at)}</p>
          </li>
        ))}
      </ul>
      {!data.events.length && (
        <p className="text-sm text-muted-foreground">No operations recorded yet.</p>
      )}
    </SectionCard>
  );
}
