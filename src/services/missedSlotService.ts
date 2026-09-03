import { apiGet, apiRequest } from "@/lib/api";
export interface MissedVisit {
  id: string;
  centre_id: string;
  crop_type: string;
  booking_day: string;
  slot_label: string;
  recovered_booking: string | null;
}
export interface RecoveryOption {
  centreId: string;
  cropId: string;
  day: string;
  slotId: string;
  label: string;
}
export const missedSlotService = {
  list: () => apiGet<MissedVisit[]>("/api/missed-slots"),
  options: (id: string) => apiGet<RecoveryOption[]>(`/api/missed-slots/${id}/options`),
  rebook: (id: string, option: RecoveryOption) =>
    apiRequest(`/api/missed-slots/${id}/rebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        centreId: option.centreId,
        cropId: option.cropId,
        day: option.day,
        slotId: option.slotId,
      }),
    }),
};
