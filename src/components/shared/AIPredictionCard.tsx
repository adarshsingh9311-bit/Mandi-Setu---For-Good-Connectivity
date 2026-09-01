import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { queueService } from "@/services/queueService";
import type { WaitPrediction } from "@/services/predictionService";

export function AIPredictionCard({ prediction }: { prediction: WaitPrediction }) {
  return (
    <Card className="border-status-info/25 bg-status-info-soft/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-status-info" aria-hidden="true" />
          AI Waiting-Time Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Predicted</p>
            <p className="text-3xl font-bold text-status-info">
              {queueService.formatWait(prediction.predictedMin)}
            </p>
          </div>
          <div className="w-32 text-right">
            <p className="text-sm text-muted-foreground">Confidence {prediction.confidence}%</p>
            <Progress value={prediction.confidence} className="mt-2 h-2" />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {prediction.factors.map((f) => (
            <div key={f.label} className="rounded-lg bg-card px-3 py-2">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs font-medium text-muted-foreground">ML Prediction — Demo visualization only</p>
      </CardContent>
    </Card>
  );
}
