import { apiGet, apiRequest } from "@/lib/api";
import type { WaitPrediction } from "@/services/predictionService";

export interface QueueSnapshot {
  id: number;
  centreId: string;
  token: string;
  farmersAhead: number;
  activeCounters: number;
  estimatedWaitMin: number | null;
  prediction: WaitPrediction;
  lastUpdated: string;
  stage: "queue" | "grading" | "weighing" | "completed";
}
export interface CentreQueue {
  centreId: string;
  activeCounters: number;
  waiting: number;
  tokens: QueueSnapshot[];
}
const post = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
export const queueService = {
  getQueue: () => apiGet<QueueSnapshot | null>("/api/queues/me"),
  getCentre: (id: string) => apiGet<CentreQueue>(`/api/queues/${encodeURIComponent(id)}`),
  join: (id: string) => post<QueueSnapshot>(`/api/queues/${encodeURIComponent(id)}/join`),
  callNext: (id: string) => post<QueueSnapshot>(`/api/queues/${encodeURIComponent(id)}/call-next`),
  advance: (id: string, token: QueueSnapshot) =>
    post<QueueSnapshot>(`/api/queues/${encodeURIComponent(id)}/tokens/${token.id}/advance`, {
      expectedStage: token.stage,
    }),
  formatWait(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, "0")}m`;
  },
};
