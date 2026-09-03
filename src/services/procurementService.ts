import { apiGet, apiRequest } from "@/lib/api";
export interface SlotOption {
  id: string;
  window: string;
  remaining: number;
  available: boolean;
}
export interface SavedBooking {
  centreId: string;
  cropId: string;
  day: string;
  slotId: string;
  slot: string;
  status: string;
}
export const procurementService = {
  getBooking: () => apiGet<SavedBooking | null>("/api/bookings/me"),
  getSlots: (centreId: string, day: string) =>
    apiGet<SlotOption[]>(
      `/api/bookings/slots/${encodeURIComponent(centreId)}?day=${encodeURIComponent(day)}`,
    ),
  confirmSlot: (payload: { centreId: string; cropId: string; day: string; slotId: string }) =>
    apiRequest<SavedBooking>("/api/bookings/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  cancel: () => apiRequest<{ ok: boolean }>("/api/bookings/me", { method: "DELETE" }),
  async recoveryOptions() {
    return [
      { id: "o1", title: "Next available slot", detail: "Choose a new time" },
      { id: "o2", title: "Nearby eligible centre", detail: "Choose another centre" },
      { id: "o3", title: "Keep current slot", detail: "Keep your saved booking" },
    ];
  },
};
