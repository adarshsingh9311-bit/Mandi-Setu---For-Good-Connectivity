import { AIPredictionCard } from "@/components/shared/AIPredictionCard";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { useI18n } from "@/lib/i18n";
import { queueService } from "@/services/queueService";

export const Route = createFileRoute("/farmer/queue")({ component: LiveQueuePage });
const labels = {
  queue: "Waiting to be called",
  grading: "Quality check",
  weighing: "Weighing",
  completed: "Completed",
};
function LiveQueuePage() {
  const { t } = useI18n();
  const { centres, booking, savedBooking } = useDemo();
  const selectedCentreId = savedBooking?.centreId ?? booking.centreId;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["live-queue", "me"],
    queryFn: queueService.getQueue,
    refetchInterval: 5000,
    retry: false,
  });
  const join = useMutation({
    mutationFn: () => queueService.join(selectedCentreId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["live-queue"] });
    },
  });
  const token = query.data;
  const centre = centres.find((c) => c.id === (token?.centreId ?? selectedCentreId));
  return (
    <FarmerShell title={t("liveQueue")} back="/farmer">
      <h2 className="mb-4 text-lg font-bold">{centre?.name}</h2>
      {query.isPending && <p role="status">Loading queue…</p>}
      {query.isError && (
        <p role="alert">
          Could not refresh the queue.{" "}
          {query.data ? "Showing the last received status." : "Please retry."}
        </p>
      )}
      {token && (
        <Card className="mt-4">
          <CardContent className="space-y-4 p-6">
            <p className="text-3xl font-bold">Token {token.token}</p>
            <p className="font-semibold">{labels[token.stage]}</p>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt>Farmers ahead</dt>
                <dd className="text-2xl font-bold">{token.farmersAhead}</dd>
              </div>
              <div>
                <dt>Active counters</dt>
                <dd className="text-2xl font-bold">{token.activeCounters}</dd>
              </div>
              <div>
                <dt>Estimated wait to be called</dt>
                <dd>
                  {token.estimatedWaitMin === null
                    ? "Unavailable"
                    : queueService.formatWait(token.estimatedWaitMin)}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-muted-foreground">
              Token updated: {new Date(token.lastUpdated).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
      {token && (
        <div className="mt-4">
          <AIPredictionCard prediction={token.prediction} />
        </div>
      )}
      {query.isSuccess && (!token || token.stage === "completed") && (
        <div className="mt-4 space-y-3">
          <p>
            {token
              ? "Your previous visit is complete. You can join a new queue."
              : "You have no queue token yet."}
          </p>
          <Button disabled={join.isPending} onClick={() => join.mutate()}>
            {join.isPending
              ? "Joining…"
              : `Join queue at ${centres.find((c) => c.id === selectedCentreId)?.name ?? selectedCentreId}`}
          </Button>
        </div>
      )}
      {join.isError && (
        <p role="alert" className="mt-3">
          {join.error.message}
        </p>
      )}
      <Button
        className="mt-4"
        variant="outline"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {query.isFetching ? "Refreshing…" : t("refreshQueue")}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Updates every 5 seconds while this page is open. Queue belongs to your signed-in account.
      </p>
    </FarmerShell>
  );
}
