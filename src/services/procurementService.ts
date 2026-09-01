// Mock implementation — API ready.
export interface SlotOption {
  id: string;
  window: string;
  recommended: boolean;
  reason?: string;
}

export const procurementService = {
  async getSlots(centreId: string, processingMin: number): Promise<SlotOption[]> {
    void centreId;
    void processingMin;
    return [
      {
        id: "s1",
        window: "10:30 AM – 11:15 AM",
        recommended: true,
        reason: "Recommended based on current centre workload and estimated processing requirement.",
      },
      { id: "s2", window: "11:30 AM – 12:15 PM", recommended: false },
      { id: "s3", window: "12:30 PM – 1:15 PM", recommended: false },
    ];
  },
  async confirmSlot(centreId: string, slotId: string) {
    return { ok: true, centreId, slotId };
  },
  async recoveryOptions() {
    return [
      { id: "o1", title: "Next available slot", detail: "1:00 PM" },
      { id: "o2", title: "Nearby eligible centre", detail: "Mandi B" },
      { id: "o3", title: "Keep current slot", detail: "11:30 AM" },
    ];
  },
};
