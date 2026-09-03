import { useState } from "react";
import { adminService, type Mandi } from "@/services/adminService";
import { useAdmin, Field, inputClass, LoadState } from "./shared";
import { Button } from "@/components/ui/button";

interface Forecast {
  predictedWaitingMin: number | null;
  predictedLoadPercent: number;
  overloadRisk: string;
  recommendation: string;
  method: string;
  note: string;
  createdAt: string;
  inputs: {
    currentQueue: number;
    incomingBookings: number;
    historySamples: number;
    serviceMin: number;
  };
}
export function Predictions() {
  const mandis = useAdmin<Mandi[]>("mandis");
  const [centre, setCentre] = useState("");
  const [result, setResult] = useState<Forecast | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function predict() {
    setPending(true);
    setError("");
    try {
      setResult(await adminService.mutate<Forecast>(`predictions/${centre}`, "POST", {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction unavailable");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Prototype prediction · next 60 minutes</h2>
      <p className="text-sm">Transparent statistical baseline, not a trained AI model.</p>
      <LoadState pending={mandis.isPending} error={mandis.error} retry={mandis.refetch} />
      <Field label="Mandi">
        <select
          className={inputClass}
          value={centre}
          onChange={(e) => {
            setCentre(e.target.value);
            setResult(null);
          }}
        >
          <option value="">Select mandi</option>
          {mandis.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Button onClick={() => void predict()} disabled={!centre || pending}>
        {pending ? "Calculating…" : "Generate prediction"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div className="space-y-2 text-sm">
          <p>
            Queue: {result.inputs.currentQueue} · Incoming bookings:{" "}
            {result.inputs.incomingBookings}
          </p>
          <p>
            Wait: {result.predictedWaitingMin ?? "Unavailable"} min · Forecast load:{" "}
            {result.predictedLoadPercent}% · Risk: {result.overloadRisk}
          </p>
          <p>{result.recommendation}</p>
          <p>
            Measured service samples: {result.inputs.historySamples} · Service duration:{" "}
            {result.inputs.serviceMin} min
          </p>
          <p className="text-muted-foreground">{result.note}</p>
          <p>Generated {new Date(result.createdAt).toLocaleString()}</p>
        </div>
      )}
    </section>
  );
}
