import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { communicationService, type IvrSimulation } from "@/services/communicationService";

export const Route = createFileRoute("/farmer/ivr")({ component: IvrDemo });
const actions = [
  ["slot", "Check slot"],
  ["queue", "Check queue"],
  ["waiting", "Check waiting time"],
  ["alternative", "Check alternate mandi"],
  ["procurement", "Check procurement status"],
] as const;

function IvrDemo() {
  const [language, setLanguage] = useState<"en" | "hi">("hi");
  const [result, setResult] = useState<IvrSimulation | null>(null);
  const [error, setError] = useState("");
  return (
    <FarmerShell title="IVR Simulation" back="/farmer">
      <div className="space-y-4">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Demo simulation only. No telephone call is placed.
        </p>
        <label className="block">
          Language{" "}
          <select
            className="ml-2 rounded border p-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
          >
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="grid gap-2">
          {actions.map(([id, label], i) => (
            <Button
              key={id}
              variant="outline"
              onClick={() =>
                void communicationService
                  .simulateIvr(id, language)
                  .then(setResult)
                  .catch((e) => setError(e.message))
              }
            >
              Press {i + 1} — {label}
            </Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        {result && (
          <section className="rounded-xl border p-4">
            <strong>Simulated IVR response</strong>
            <p className="mt-2">{result.response}</p>
            <small>{result.status.replaceAll("_", " ")}</small>
          </section>
        )}
      </div>
    </FarmerShell>
  );
}
