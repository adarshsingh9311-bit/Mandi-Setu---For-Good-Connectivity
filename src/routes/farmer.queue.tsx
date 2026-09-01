import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Users, LayoutGrid, Clock } from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AIPredictionCard } from "@/components/shared/AIPredictionCard";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { useDemo } from "@/lib/demoStore";
import { useI18n } from "@/lib/i18n";
import { queueService } from "@/services/queueService";
import { predictionService } from "@/services/predictionService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer/queue")({
  component: LiveQueuePage,
});

const stages = ["Quality Check", "Weighing", "Procurement"];

function LiveQueuePage() {
  const { t } = useI18n();
  const { centres, booking, queue, refreshQueue } = useDemo();
  const centre = centres.find((c) => c.id === booking.centreId) ?? centres[0]!;

  const { data: prediction } = useQuery({
    queryKey: ["wait-prediction", centre.id, queue.farmersAhead, queue.activeCounters],
    queryFn: () =>
      predictionService.predictWait({
        farmersWaiting: queue.farmersAhead,
        activeCounters: queue.activeCounters,
        avgProcessingMin: centre.avgProcessingMin,
        loadPercent: centre.loadPercent,
      }),
  });

  const progress = Math.round(((30 - Math.min(queue.farmersAhead, 30)) / 30) * 100);

  return (
    <FarmerShell title={t("liveQueue")} back="/farmer">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">{centre.name}</h2>
          <StatusBadge status={centre.status} label="Operational" className="mt-1" />
        </div>
        <DemoBadge label="Live Demo Data" />
      </div>

      <Card className="border-0 bg-brand-gradient text-primary-foreground">
        <CardContent className="p-6 text-center">
          <p className="text-sm opacity-90">Your Token</p>
          <p className="text-5xl font-bold tracking-tight">Token {queue.token}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <Users className="size-3.5" aria-hidden="true" /> {t("farmersAhead")}
              </p>
              <p className="text-2xl font-bold">{queue.farmersAhead}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <LayoutGrid className="size-3.5" aria-hidden="true" /> {t("activeCounters")}
              </p>
              <p className="text-2xl font-bold">{queue.activeCounters}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-primary-foreground/12 p-3 text-left">
            <p className="flex items-center gap-1.5 text-xs opacity-90">
              <Clock className="size-3.5" aria-hidden="true" /> {t("estimatedWaiting")}
            </p>
            <p className="text-2xl font-bold">
              {queueService.formatWait(prediction?.predictedMin ?? centre.estimatedWaitMin)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">You</span>
              <span className="text-muted-foreground">{queue.farmersAhead} farmers ahead</span>
            </div>
            <Progress value={progress} className="h-3" aria-label="Queue progress" />
          </div>
          <ol className="flex items-center justify-between gap-2">
            {stages.map((stage, i) => (
              <li key={stage} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-sm font-bold",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-medium">{stage}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {prediction && (
        <div className="mt-4">
          <AIPredictionCard prediction={prediction} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Last updated: {queue.lastUpdated}</p>
        <Button variant="outline" onClick={refreshQueue}>
          <RefreshCw className="size-4" /> {t("refreshQueue")}
        </Button>
      </div>
    </FarmerShell>
  );
}
