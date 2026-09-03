import { type ProcurementCentre } from "@/data/mockData";
import { apiGet } from "@/lib/api";

let cachedCentres: ProcurementCentre[] = [];

export const mandiService = {
  async listCentres(): Promise<ProcurementCentre[]> {
    cachedCentres = await apiGet<ProcurementCentre[]>("/api/centres");
    return cachedCentres;
  },
  getCentre(id: string): ProcurementCentre | undefined {
    return cachedCentres.find((c) => c.id === id);
  },
  rankAlternatives(excludeId: string, crop: string): ProcurementCentre[] {
    return cachedCentres
      .filter((c) => c.id !== excludeId && c.crops.includes(crop))
      .sort((a, b) => a.estimatedWaitMin + a.distanceKm - (b.estimatedWaitMin + b.distanceKm));
  },
  async listAlternatives(
    excludeId: string,
    crop: string,
    day?: string,
  ): Promise<ProcurementCentre[]> {
    return apiGet<ProcurementCentre[]>(
      `/api/centres/${encodeURIComponent(excludeId)}/alternatives?crop=${encodeURIComponent(crop)}${day ? `&day=${encodeURIComponent(day)}` : ""}`,
    );
  },
};
