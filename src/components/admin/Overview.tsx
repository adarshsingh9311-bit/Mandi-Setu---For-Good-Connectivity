import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, TriangleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  adminService,
  indiaDay,
  type Mandi,
  type Metrics,
  type Alternate,
} from "@/services/adminService";
import {
  useAdmin,
  useAdminMutation,
  LoadState,
  Metric,
  Table,
  Status,
  duration,
  Field,
  inputClass,
} from "./shared";

export function Dashboard() {
  const [day, setDay] = useState(indiaDay());
  const q = useAdmin<{
    metrics: Metrics;
    mandis: Mandi[];
    alerts: { centreId: string; title: string; workload: number }[];
  }>("dashboard", { day });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            A shared view of today's procurement operations
          </p>
        </div>
        <Field label="Reporting date (India)">
          <input
            type="date"
            className={inputClass}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
      </div>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total farmers", q.data.metrics.totalFarmers],
              ["Scheduled today", q.data.metrics.scheduledToday],
              ["Currently waiting", q.data.metrics.waiting],
              ["Processed today", q.data.metrics.processedToday],
              ["Procured today (quintals)", q.data.metrics.procurementQuintals],
              ["Average wait (minutes)", q.data.metrics.averageWaitingMin],
              ["Active mandis", q.data.metrics.activeMandis],
              ["Overloaded mandis", q.data.metrics.overloadedMandis],
            ].map(([label, value]) => (
              <Metric key={String(label)} label={String(label)} value={value ?? null} />
            ))}
          </div>
          {q.data.metrics.quantityNotRecorded > 0 && (
            <p className="text-sm text-amber-800">
              {q.data.metrics.quantityNotRecorded} completed visits have no measured quantity
              recorded; they are excluded from the quantity total.
            </p>
          )}
          {q.data.alerts.map((a) => (
            <div
              key={a.centreId}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            >
              <TriangleAlert className="size-5" />
              <p className="flex-1">
                <strong>{a.title}</strong> · {a.workload}% queue capacity
              </p>
              <Link
                to="/admin/$section"
                params={{ section: "mandis" }}
                className="font-semibold underline"
              >
                Review alternatives
              </Link>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mandi status overview</h2>
            <Button variant="outline" onClick={() => void q.refetch()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
          <MandiTable rows={q.data.mandis} />
          <p className="text-xs text-muted-foreground">
            Live records refresh every 10 seconds. Waiting is measured from check-in to service
            start; workload is active queue ÷ configured queue capacity.
          </p>
        </>
      )}
    </div>
  );
}
function MandiTable({ rows, onSelect }: { rows: Mandi[]; onSelect?: (m: Mandi) => void }) {
  return (
    <Table
      rows={rows}
      columns={[
        {
          label: "Mandi",
          render: (m) => (
            <div>
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.district}, {m.state}
              </p>
            </div>
          ),
        },
        { label: "Queue", render: (m) => m.queue },
        { label: "Wait estimate", render: (m) => duration(m.waitingMin) },
        { label: "Capacity", render: (m) => m.capacity },
        {
          label: "Workload",
          render: (m) => (
            <div className="min-w-24">
              <p>{m.workload}%</p>
              <div className="mt-1 h-1.5 rounded bg-slate-100">
                <div
                  className={`h-1.5 rounded ${m.status === "Overloaded" ? "bg-amber-500" : "bg-emerald-600"}`}
                  style={{ width: `${Math.min(100, m.workload)}%` }}
                />
              </div>
            </div>
          ),
        },
        { label: "Places available", render: (m) => m.availableSlots },
        { label: "Status", render: (m) => <Status value={m.status} /> },
        ...(onSelect
          ? [
              {
                label: "Details",
                render: (m: Mandi) => (
                  <Button variant="outline" size="sm" onClick={() => onSelect(m)}>
                    View <ArrowUpRight className="size-3" />
                  </Button>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
export function Mandis() {
  const [day, setDay] = useState(indiaDay());
  const [selected, setSelected] = useState<string | null>(null);
  const q = useAdmin<Mandi[]>("mandis", { day });
  return (
    <div className="space-y-5">
      <Field label="Availability date">
        <input
          className={inputClass + " max-w-56"}
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </Field>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && <MandiTable rows={q.data} onSelect={(m) => setSelected(m.id)} />}{" "}
      {selected && q.data?.find((m) => m.id === selected) && (
        <MandiDetail key={selected} mandi={q.data.find((m) => m.id === selected)!} day={day} />
      )}
    </div>
  );
}
function MandiDetail({ mandi, day }: { mandi: Mandi; day: string }) {
  const user = useAuth();
  const alt = useAdmin<Alternate[]>(`mandis/${mandi.id}/alternatives`, { day });
  const update = useAdminMutation((body: unknown) =>
    adminService.mutate(`mandis/${mandi.id}`, "PATCH", body),
  );
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="text-xl font-bold">{mandi.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mandi.crops.join(" · ")} · {mandi.activeCounters} counters · Configured rate{" "}
            {mandi.processingRate} farmers/hour
          </p>
        </div>
        {user.role !== "operator" && (
          <form
            className="grid items-end gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update.mutate({
                capacity: Number(f.get("capacity")),
                processingMin: Number(f.get("processing")),
                activeCounters: Number(f.get("counters")),
                closed: f.get("closed") === "on",
              });
            }}
          >
            <Field label="Queue capacity">
              <input
                name="capacity"
                type="number"
                min={1}
                max={100000}
                required
                defaultValue={mandi.capacity}
                className={inputClass}
              />
            </Field>
            <Field label="Processing minutes">
              <input
                name="processing"
                type="number"
                min={1}
                max={1440}
                required
                defaultValue={mandi.processingMin}
                className={inputClass}
              />
            </Field>
            <Field label="Active counters">
              <input
                name="counters"
                type="number"
                min={0}
                max={1000}
                required
                defaultValue={mandi.activeCounters}
                className={inputClass}
              />
            </Field>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input name="closed" type="checkbox" defaultChecked={mandi.status === "Closed"} />
                Mandi closed
              </label>
              <Button disabled={update.isPending}>Save configuration</Button>
            </div>
          </form>
        )}
        {update.isError && <p role="alert">{update.error.message}</p>}
        {update.isSuccess && (
          <p role="status" className="text-emerald-700">
            Configuration saved.
          </p>
        )}
        <div>
          <h3 className="font-semibold">Nearby mandis with available capacity</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Current workload: {mandi.workload}%. Distances are straight-line between mandi
            coordinates, not road travel distances. Listed crops are accepted by both mandis.
          </p>
        </div>
        <LoadState pending={alt.isPending} error={alt.error} retry={alt.refetch} />
        {alt.data && (
          <Table
            rows={alt.data}
            empty="No eligible alternatives with slots available on this date."
            columns={[
              { label: "Alternative mandi", render: (r) => r.name },
              { label: "Distance", render: (r) => `${r.distanceKm} km` },
              { label: "Wait", render: (r) => duration(r.waitingMin) },
              { label: "Capacity available", render: (r) => r.availableCapacity },
              { label: "Slot places", render: (r) => r.availableSlots },
              { label: "Eligible crops", render: (r) => r.crops.join(", ") },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
