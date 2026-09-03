import { apiGet, apiRequest } from "@/lib/api";
import type { SavedBooking } from "@/services/procurementService";
export interface DelayReport {
  id: string;
  reason: string;
  arrival: string;
  booking: SavedBooking;
  resolution: { optionId: string; booking: SavedBooking } | null;
}
export interface RecoveryOption {
  id: string;
  title: string;
  booking: { centreId: string; cropId: string; day: string; slotId: string };
}
const post = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
export const recoveryService = {
  reports: () => apiGet<DelayReport[]>("/api/recovery"),
  report: (payload: { requestId: string; reason: string; arrival: string }) =>
    post<DelayReport>("/api/recovery", payload),
  options: (id: string) =>
    apiGet<RecoveryOption[]>(`/api/recovery/${encodeURIComponent(id)}/options`),
  apply: (id: string, optionId: string) =>
    post(`/api/recovery/${encodeURIComponent(id)}/apply`, { optionId }),
};
