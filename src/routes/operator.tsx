import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OperationsShell } from "@/components/operations/OperationsShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { queueService, type QueueSnapshot } from "@/services/queueService";

export const Route = createFileRoute("/operator")({ component: OperatorPage });
function OperatorPage() {
  const { centres } = useDemo();
  const user = useAuth();
  const [centreId, setCentreId] = useState(user.centreId ?? "mandi-a");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["live-queue", centreId],
    queryFn: () => queueService.getCentre(centreId),
    refetchInterval: 5000,
    retry: false,
  });
  const action = useMutation({
    mutationFn: (token: QueueSnapshot | null) =>
      token ? queueService.advance(centreId, token) : queueService.callNext(centreId),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["live-queue"] });
    },
  });
  const data = query.data;
  const busy = data?.tokens.filter((t) => t.stage !== "queue").length ?? 0;
  return (
    <OperationsShell title="Centre operations">
      <label className="block font-semibold" htmlFor="queue-centre">
        Procurement centre
      </label>
      <select
        id="queue-centre"
        className="mt-2 rounded border p-2"
        value={centreId}
        disabled={action.isPending}
        onChange={(e) => {
          setCentreId(e.target.value);
          action.reset();
        }}
      >
        {centres
          .filter((c) => c.id === user.centreId)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <p className="mt-3 text-sm text-muted-foreground">
        Operator controls · refreshes every 5 seconds
      </p>
      {query.isPending && <p role="status">Loading queue…</p>}
      {query.isError && <p role="alert">Queue unavailable. Refresh to try again.</p>}
      {data && (
        <>
          <p className="my-4">
            {data.waiting} waiting · {busy} serving · {data.activeCounters} counters
          </p>
          <Button
            disabled={
              action.isPending || query.isError || !data.waiting || busy >= data.activeCounters
            }
            onClick={() => action.mutate(null)}
          >
            Call next farmer
          </Button>
          <div className="mt-4 space-y-3">
            {data.tokens.map((token) => (
              <Card key={token.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">Token {token.token}</p>
                    <p>
                      {token.stage === "queue"
                        ? "Waiting"
                        : token.stage === "grading"
                          ? "Quality check"
                          : "Weighing"}
                    </p>
                  </div>
                  {token.stage !== "queue" && (
                    <Button
                      disabled={action.isPending || query.isError}
                      onClick={() => action.mutate(token)}
                    >
                      {token.stage === "grading" ? "Start weighing" : "Complete procurement"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {!data.tokens.length && (
            <p className="mt-4">No active tokens. Farmers can join from the Live queue screen.</p>
          )}
        </>
      )}
      {action.isError && (
        <p role="alert" className="mt-3">
          {action.error.message}
        </p>
      )}
      <Button
        className="mt-4"
        variant="outline"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh queue
      </Button>
    </OperationsShell>
  );
}
