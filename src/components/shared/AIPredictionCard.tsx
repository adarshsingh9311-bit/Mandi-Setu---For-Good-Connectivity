import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queueService } from "@/services/queueService";
import { predictionService, type WaitPrediction } from "@/services/predictionService";

export function AIPredictionCard({ prediction }: { prediction: WaitPrediction }) {
  return (
    <Card className="border-status-info/25 bg-status-info-soft/50">
      <CardHeader>
        <CardTitle className="text-base">Estimated wait to be called</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-bold">
          {prediction.predictedMin === null
            ? "Unavailable"
            : queueService.formatWait(prediction.predictedMin)}
        </p>
        <p className="text-sm">{prediction.method}</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {prediction.factors.map((f) => (
            <div key={f.label}>
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{prediction.note}</p>
      </CardContent>
    </Card>
  );
}
export function CentreWaitEstimate({
  centreId,
  compact = false,
}: {
  centreId: string;
  compact?: boolean;
}) {
  const query = useQuery({
    queryKey: ["wait-estimate", centreId],
    queryFn: () => predictionService.predictWait(centreId),
    refetchInterval: 5000,
    retry: false,
  });
  if (query.isPending) return <span role="status">Loading wait estimate…</span>;
  if (query.isError)
    return (
      <span role="alert">
        Wait estimate unavailable.{" "}
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </span>
    );
  if (compact)
    return (
      <span title={query.data.note}>
        {query.data.predictedMin === null
          ? "Unavailable"
          : queueService.formatWait(query.data.predictedMin)}{" "}
        <span className="text-xs font-normal">(queue estimate)</span>
      </span>
    );
  return <AIPredictionCard prediction={query.data} />;
}
