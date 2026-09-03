import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demoStore";
import { recoveryService } from "@/services/recoveryService";
export const Route = createFileRoute("/farmer/report-delay")({ component: ReportDelayPage });
function ReportDelayPage() {
  const { savedBooking, bookingError, reloadBooking, reloadFarmer, reloadNotifications } =
    useDemo();
  const [reason, setReason] = useState("weather");
  const [arrival, setArrival] = useState("");
  const [requestId, setRequestId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const client = useQueryClient();
  const reports = useQuery({
    queryKey: ["delay-reports"],
    queryFn: recoveryService.reports,
    retry: false,
  });
  const active = reports.data?.find((r) => r.id === selectedId) ?? reports.data?.[0];
  const options = useQuery({
    queryKey: ["recovery-options", active?.id],
    queryFn: () => recoveryService.options(active!.id),
    enabled: !!active && !active.resolution,
    retry: false,
  });
  const report = useMutation({
    mutationFn: () => {
      const id = requestId || crypto.randomUUID();
      setRequestId(id);
      return recoveryService.report({ requestId: id, reason, arrival: `${arrival}:00+05:30` });
    },
    onSuccess: async (r) => {
      setSelectedId(r.id);
      setRequestId("");
      await client.invalidateQueries({ queryKey: ["delay-reports"] });
      await reloadNotifications();
    },
  });
  const apply = useMutation({
    mutationFn: (id: string) => recoveryService.apply(active!.id, id),
    onSuccess: async () => {
      await Promise.all([
        reloadBooking(),
        reloadFarmer(),
        reloadNotifications(),
        client.invalidateQueries({ queryKey: ["delay-reports"] }),
      ]);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["recovery-options"] });
    },
  });
  const busy = report.isPending || apply.isPending;
  return (
    <FarmerShell title="Report delay" back="/farmer">
      {bookingError && (
        <p role="alert">
          {bookingError}
          <Button onClick={() => void reloadBooking()}>Retry</Button>
        </p>
      )}
      <p className="mb-4">Current booking: {savedBooking?.slot ?? "No booking"}</p>
      <label htmlFor="delay-reason" className="block">
        Reason
      </label>
      <select
        id="delay-reason"
        className="w-full rounded border p-2"
        value={reason}
        disabled={busy}
        onChange={(e) => {
          setReason(e.target.value);
          setRequestId("");
        }}
      >
        {["weather", "vehicle", "road", "centre", "other"].map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <label htmlFor="delay-arrival" className="mt-4 block">
        Expected arrival (India time)
      </label>
      <input
        id="delay-arrival"
        type="datetime-local"
        className="w-full rounded border p-2"
        value={arrival}
        disabled={busy}
        onChange={(e) => {
          setArrival(e.target.value);
          setRequestId("");
        }}
      />
      <Button
        className="mt-4"
        disabled={busy || !savedBooking || !!bookingError || !arrival}
        onClick={() => report.mutate()}
      >
        {report.isPending ? "Saving…" : "Save delay report"}
      </Button>
      {report.isError && <p role="alert">{report.error.message}</p>}
      {reports.isPending && <p role="status">Loading reports…</p>}
      {reports.isError && (
        <p role="alert">
          Could not load reports.<Button onClick={() => void reports.refetch()}>Retry</Button>
        </p>
      )}
      {active && (
        <section className="mt-6 space-y-3">
          <h2 className="font-bold">Saved report: {active.reason}</h2>
          <p>
            Arrival:{" "}
            {new Date(active.arrival).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (India
            time)
          </p>
          {active.resolution ? (
            <p role="status">Resolved: {active.resolution.booking.slot}</p>
          ) : (
            <>
              <p>
                Choose an available slot or keep your current booking. Keeping it does not extend
                the arrival window. Travel time to alternative centres is not included.
              </p>
              {options.isFetching && <p role="status">Checking recovery options…</p>}
              {options.isError && <p role="alert">{options.error.message}</p>}
              {!options.isError &&
                options.data?.map((o) => (
                  <Button
                    key={o.id}
                    className="h-auto w-full whitespace-normal"
                    variant="outline"
                    disabled={busy}
                    onClick={() => apply.mutate(o.id)}
                  >
                    {o.title}
                  </Button>
                ))}
              <Button
                variant="outline"
                disabled={busy || options.isFetching}
                onClick={() => void options.refetch()}
              >
                Refresh options
              </Button>
            </>
          )}
        </section>
      )}
      {apply.isError && <p role="alert">{apply.error.message}</p>}
    </FarmerShell>
  );
}
