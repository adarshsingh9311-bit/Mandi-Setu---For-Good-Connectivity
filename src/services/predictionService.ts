// Frontend visualization only — no real ML computation happens here.
// Values are demonstration data, shaped to match a future prediction API.
export interface WaitPrediction {
  predictedMin: number;
  confidence: number;
  factors: { label: string; value: string }[];
}

export const predictionService = {
  async predictWait(input: {
    farmersWaiting: number;
    activeCounters: number;
    avgProcessingMin: number;
    loadPercent: number;
  }): Promise<WaitPrediction> {
    const { farmersWaiting, activeCounters, avgProcessingMin, loadPercent } = input;
    return {
      predictedMin: Math.round((farmersWaiting / Math.max(activeCounters, 1)) * avgProcessingMin),
      confidence: 87,
      factors: [
        { label: "Farmers waiting", value: `${farmersWaiting}` },
        { label: "Active counters", value: `${activeCounters}` },
        { label: "Average processing", value: `${avgProcessingMin} min` },
        { label: "Centre load", value: `${loadPercent}%` },
      ],
    };
  },
  async predictProcessingTime(quantityQuintals: number): Promise<number> {
    return Math.max(20, Math.round(quantityQuintals * 0.85));
  },
};
