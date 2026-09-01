// Mock implementation — API ready.
export interface QueueSnapshot {
  centreId: string;
  token: string;
  farmersAhead: number;
  activeCounters: number;
  estimatedWaitMin: number;
  lastUpdated: string;
  stage: "queue" | "grading" | "weighing" | "completed";
}

export const queueService = {
  async getQueue(centreId: string): Promise<QueueSnapshot> {
    return {
      centreId,
      token: "#4582",
      farmersAhead: 18,
      activeCounters: 3,
      estimatedWaitMin: 47,
      lastUpdated: "10:42 AM",
      stage: "queue",
    };
  },
  formatWait(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  },
};
