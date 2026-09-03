import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import {
  adminService,
  indiaDay,
  type Analytics,
  type StaffNotifications,
  type Thresholds,
  type Visit,
} from "@/services/adminService";
import {
  Field,
  inputClass,
  LoadState,
  Metric,
  Table,
  Status,
  duration,
  timestamp,
  useAdmin,
  useAdminMutation,
} from "./shared";

function Period({
  start,
  end,
  setStart,
  setEnd,
}: {
  start: string;
  end: string;
  setStart: (s: string) => void;
  setEnd: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <Field label="From (India)">
        <input
          className={inputClass}
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </Field>
      <Field label="Through (India)">
        <input
          className={inputClass}
          type="date"
          min={start}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </Field>
    </div>
  );
}
function QuantityChart({ title, rows }: { title: string; rows: Analytics["byCrop"] }) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 font-semibold">{title} · quintals</h2>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quintals" fill="#167858" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          No measured procurement recorded in this period.
        </p>
      )}
    </section>
  );
}
export function Monitoring({ waiting = false }: { waiting?: boolean }) {
  const [start, setStart] = useState(indiaDay(-29));
  const [end, setEnd] = useState(indiaDay());
  const q = useAdmin<Analytics>(waiting ? "analytics" : "procurement", { start, end });
  return (
    <div className="space-y-6">
      <Period {...{ start, end, setStart, setEnd }} />
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {waiting ? (
              <>
                <Metric label="Average wait" value={q.data.averageWaitingMin} unit="min" />
                <Metric label="Currently waiting" value={q.data.farmersWaiting} />
                <Metric label="Average processing" value={q.data.averageProcessingMin} unit="min" />
                <Metric
                  label="Calendar processing rate"
                  value={q.data.processingRatePerHour}
                  unit="farmers/hour"
                />
              </>
            ) : (
              <>
                <Metric label="Total procured" value={q.data.totalQuintals} unit="quintals" />
                <Metric label="Farmers completed" value={q.data.farmersCompleted} />
                <Metric label="Currently waiting" value={q.data.farmersWaiting} />
                <Metric label="Average processing" value={q.data.averageProcessingMin} unit="min" />
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {q.data.note}{" "}
            {q.data.quantityNotRecorded > 0 &&
              `${q.data.quantityNotRecorded} completed visits have no measured quantity and are excluded from quantity totals.`}
          </p>
          {waiting ? (
            <>
              <h2 className="font-semibold">Waiting time by mandi</h2>
              <Table
                rows={q.data.waitingByMandi}
                columns={[
                  { label: "Mandi", render: (r) => r.mandi },
                  { label: "Average waiting time", render: (r) => duration(r.averageWaitingMin) },
                  { label: "Measured visits", render: (r) => r.samples },
                ]}
              />
              <h2 className="font-semibold">Longest waiting farmers · current queue</h2>
              <Table
                rows={q.data.longestWaiting}
                columns={[
                  { label: "Farmer", render: (r) => r.farmerName },
                  { label: "Mandi", render: (r) => r.centre_id },
                  { label: "Arrival", render: (r) => timestamp(r.arrived_at) },
                  { label: "Waiting", render: (r) => duration(r.waitingMin) },
                ]}
              />
              <h2 className="font-semibold">Historical waiting time and queue growth</h2>
              <Table
                rows={q.data.trend}
                columns={[
                  { label: "Date", render: (r) => r.day },
                  { label: "Arrivals", render: (r) => r.arrivals },
                  { label: "Completed", render: (r) => r.completed },
                  { label: "Arrivals minus completions", render: (r) => r.netGrowth },
                  { label: "Average wait", render: (r) => duration(r.averageWaitingMin) },
                ]}
              />
              <h2 className="font-semibold">Peak arrival periods · India time</h2>
              <Table
                rows={q.data.peakPeriods}
                columns={[
                  { label: "Hour", render: (r) => r.hour },
                  { label: "Arrivals", render: (r) => r.arrivals },
                  { label: "Average wait", render: (r) => duration(r.averageWaitingMin) },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Calendar processing rate uses all hours in the selected dates. Arrivals minus
                completions does not subtract cancellations or missed visits.
              </p>
            </>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <QuantityChart title="Procurement by crop" rows={q.data.byCrop} />
              <QuantityChart title="Procurement by mandi" rows={q.data.byMandi} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function Notifications() {
  const q = useAdmin<StaffNotifications>("notifications");
  return (
    <div className="space-y-5">
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <>
          <h2 className="font-semibold">Current overload alerts</h2>
          <Table
            rows={q.data.overloaded}
            empty="No mandis currently exceed the overload threshold."
            columns={[
              { label: "Mandi", render: (r) => r.name },
              { label: "Workload", render: (r) => `${r.workload}%` },
              { label: "Status", render: (r) => <Status value={r.status} /> },
            ]}
          />
          <h2 className="font-semibold">Operations activity</h2>
          <Table
            rows={q.data.events}
            columns={[
              { label: "Time", render: (r) => timestamp(r.created_at) },
              { label: "Mandi", render: (r) => r.centre_id ?? "Network" },
              { label: "Type", render: (r) => r.kind },
              { label: "Update", render: (r) => r.message },
            ]}
          />
          <h2 className="font-semibold">Farmer delay reports</h2>
          <Table
            rows={q.data.delayReports}
            columns={[
              { label: "Report", render: (r) => r.id },
              { label: "Reason", render: (r) => r.reason },
              { label: "Arrival", render: (r) => r.arrival },
              { label: "Status", render: (r) => (r.resolved ? "Resolved" : "Open") },
            ]}
          />
        </>
      )}
    </div>
  );
}
export function Reports() {
  const [start, setStart] = useState(indiaDay(-29));
  const [end, setEnd] = useState(indiaDay());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const q = useAdmin<{ rows: Visit[]; summary: Analytics }>("reports", { start, end });
  async function download() {
    setPending(true);
    setError("");
    try {
      const result = await adminService.get<{ filename: string; csv: string }>("reports/export", {
        start,
        end,
      });
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-5">
      <Period {...{ start, end, setStart, setEnd }} />
      <Button disabled={pending || !q.data} onClick={() => void download()}>
        {pending ? "Exporting…" : "Download CSV report"}
      </Button>
      {error && <p role="alert">{error}</p>}
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <>
          <p className="text-sm text-muted-foreground">
            Visits booked or checked in during the selected dates. Missing measurements stay blank
            in the export.
          </p>
          <Table
            rows={q.data.rows}
            columns={[
              { label: "Booking ID", render: (r) => r.bookingId ?? "Walk-in" },
              { label: "Farmer", render: (r) => r.farmerName },
              { label: "Mandi", render: (r) => r.centre_id },
              { label: "Crop", render: (r) => r.crop_type ?? "Not recorded" },
              {
                label: "Procured quintals",
                render: (r) => r.actual_quantity_quintals ?? "Not recorded",
              },
              { label: "Waiting", render: (r) => duration(r.waitingMin) },
              { label: "Status", render: (r) => <Status value={r.status} /> },
            ]}
          />
        </>
      )}
    </div>
  );
}
export function Settings() {
  const q = useAdmin<Thresholds>("settings");
  const mutation = useAdminMutation((body: Thresholds) =>
    adminService.mutate("settings", "PATCH", body),
  );
  return (
    <div className="max-w-xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Rule-based workload alerts use the live active queue divided by each mandi's configured
        capacity. Closed mandis are shown separately.
      </p>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <form
          className="space-y-5 rounded-xl border bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            mutation.mutate({
              busyPercent: Number(f.get("busy")),
              overloadedPercent: Number(f.get("overloaded")),
            });
          }}
        >
          <Field label="Busy at or above (%)">
            <input
              name="busy"
              className={inputClass}
              type="number"
              min={1}
              max={99}
              required
              defaultValue={q.data.busyPercent}
            />
          </Field>
          <Field label="Overloaded above (%)">
            <input
              name="overloaded"
              className={inputClass}
              type="number"
              min={2}
              max={100}
              required
              defaultValue={q.data.overloadedPercent}
            />
          </Field>
          <Button disabled={mutation.isPending}>Save thresholds</Button>
          {mutation.isError && <p role="alert">{mutation.error.message}</p>}
          {mutation.isSuccess && <p role="status">Thresholds saved.</p>}
        </form>
      )}
    </div>
  );
}
