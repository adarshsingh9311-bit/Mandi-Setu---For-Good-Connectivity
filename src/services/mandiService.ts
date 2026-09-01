// Mock implementation. Replace with real API calls later — signatures stay the same.
import { centres, type CentreStatus, type ProcurementCentre } from "@/data/mockData";

export function statusFromLoad(load: number): CentreStatus {
  if (load >= 120) return "over";
  if (load >= 90) return "high";
  return "normal";
}

export const mandiService = {
  async listCentres(): Promise<ProcurementCentre[]> {
    return centres;
  },
  getCentre(id: string): ProcurementCentre | undefined {
    return centres.find((c) => c.id === id);
  },
  rankAlternatives(excludeId: string, crop: string): ProcurementCentre[] {
    return centres
      .filter((c) => c.id !== excludeId && c.crops.includes(crop))
      .sort((a, b) => a.estimatedWaitMin + a.distanceKm - (b.estimatedWaitMin + b.distanceKm));
  },
};
