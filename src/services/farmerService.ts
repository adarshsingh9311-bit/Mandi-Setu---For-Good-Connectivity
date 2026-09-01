// Mock implementation — API ready.
import { currentFarmer, farmers, type Crop, type Farmer } from "@/data/mockData";

export const farmerService = {
  async getProfile() {
    return currentFarmer;
  },
  async listFarmers(): Promise<Farmer[]> {
    return farmers;
  },
  async addCrop(crop: Omit<Crop, "id" | "status">): Promise<Crop> {
    return { ...crop, id: `crop-${Date.now()}`, status: "Not Scheduled" };
  },
};
