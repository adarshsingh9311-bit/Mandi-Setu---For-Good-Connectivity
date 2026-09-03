import { apiRequest } from "@/lib/api";

export interface IvrSimulation {
  id: string;
  action: string;
  response: string;
  provider: "demo";
  status: "simulated_not_called";
}

export const communicationService = {
  simulateIvr: (action: string, language: "en" | "hi") =>
    apiRequest<IvrSimulation>("/api/communications/ivr/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, language }),
    }),
};
