import { apiGet } from "@/lib/api";
export interface WaitPrediction {
  predictedMin: number | null;
  method: string;
  factors: { label: string; value: string }[];
  note: string;
}
export const predictionService = {
  predictWait: (centreId: string) =>
    apiGet<WaitPrediction>(`/api/predictions/centres/${encodeURIComponent(centreId)}`),
};
