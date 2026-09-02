import { centres as mockCentres, type CentreStatus, type ProcurementCentre } from "@/data/mockData";
import { apiGet } from "@/lib/api";

export function statusFromLoad(load: number): CentreStatus {
  if (load >= 120) return "over";
  if (load >= 90) return "high";
  return "normal";
}

let cachedCentres: ProcurementCentre[] = mockCentres;

export const mandiService = {
  async listCentres(): Promise<ProcurementCentre[]> {
    try {
      cachedCentres = await apiGet<ProcurementCentre[]>("/api/centres");
      return cachedCentres;
    } catch {
      cachedCentres = mockCentres;
      return mockCentres;
    }
  },
  getCentre(id: string): ProcurementCentre | undefined {
    return cachedCentres.find((c) => c.id === id);
  },
  rankAlternatives(excludeId: string, crop: string): ProcurementCentre[] {
    return cachedCentres
      .filter((c) => c.id !== excludeId && c.crops.includes(crop))
      .sort((a, b) => a.estimatedWaitMin + a.distanceKm - (b.estimatedWaitMin + b.distanceKm));
  },
  async listAlternatives(excludeId: string, crop: string): Promise<ProcurementCentre[]> {
    try {
      return await apiGet<ProcurementCentre[]>(
        `/api/centres/${encodeURIComponent(excludeId)}/alternatives?crop=${encodeURIComponent(crop)}`,
      );
    } catch {
      return this.rankAlternatives(excludeId, crop);
    }
  },
};
