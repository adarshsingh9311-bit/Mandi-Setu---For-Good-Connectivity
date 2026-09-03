import { useState } from "react";
import { MapPin } from "lucide-react";
import type { ProcurementCentre } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { LoadBar } from "./LoadBar";
import { queueService } from "@/services/queueService";

const markerColor = {
  normal: "bg-status-normal text-status-normal-foreground",
  high: "bg-status-high text-status-high-foreground",
  over: "bg-status-over text-status-over-foreground",
} as const;

// Simplified schematic map — positions are illustrative demonstration data.
function position(index: number) {
  const grid = [
    { top: "22%", left: "30%" },
    { top: "58%", left: "62%" },
    { top: "36%", left: "72%" },
    { top: "68%", left: "22%" },
    { top: "14%", left: "62%" },
  ];
  return grid[index % grid.length]!;
}

export function MandiMap({ centres }: { centres: ProcurementCentre[] }) {
  const [selected, setSelected] = useState<string | null>(centres[0]?.id ?? null);
  const centre = centres.find((c) => c.id === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="relative h-80 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_30%_20%,var(--status-normal-soft),transparent_55%),radial-gradient(circle_at_75%_70%,var(--status-info-soft),transparent_50%)] lg:h-[26rem]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />
        {centres.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c.id)}
            style={position(i)}
            aria-label={`${c.name}, load ${c.loadPercent} percent`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold shadow-card transition-transform hover:scale-105",
              markerColor[c.status],
              selected === c.id && "ring-4 ring-primary/30",
            )}
          >
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {c.name.split(" — ")[0]} · {c.loadPercent}%
            </span>
          </button>
        ))}
        <p className="absolute bottom-3 left-3 text-[11px] font-medium text-muted-foreground">
          Schematic mandi map — demonstration data
        </p>
      </div>

      {centre && (
        <div className="card-surface space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold">{centre.name}</h3>
            <StatusBadge status={centre.status} />
          </div>
          <LoadBar value={centre.loadPercent} status={centre.status} />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Current load", `${centre.loadPercent}%`],
              ["Farmers waiting", `${centre.farmersWaiting}`],
              ["Active counters", `${centre.activeCounters}`],
              ["Processing rate", `${centre.processingRatePerHour}/hr`],
              ["Avg processing", `${centre.avgProcessingMin} min`],
              ["Estimated wait", queueService.formatWait(centre.estimatedWaitMin)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
