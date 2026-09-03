import { currentFarmer, farmers, type Crop, type Farmer } from "@/data/mockData";
import { apiGet, apiRequest } from "@/lib/api";

export type FarmerProfile = typeof currentFarmer;
export type CropInput = Omit<Crop, "id" | "status"> & { language: string };

export const farmerService = {
  async getProfile() {
    return apiGet<FarmerProfile>("/api/farmers/me");
  },
  async listFarmers(): Promise<Farmer[]> {
    return farmers;
  },
  async listCrops(): Promise<Crop[]> {
    return apiGet<Crop[]>("/api/farmers/me/crops");
  },
  async addCrop(crop: CropInput): Promise<Crop> {
    return apiRequest<Crop>("/api/farmers/me/crops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(crop),
    });
  },
};
