import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map as MapIcon, Gauge, ChevronRight, Timer, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MandiDetail } from "@/components/admin/Overview";
import { duration, Status, Table } from "@/components/admin/shared";
import type { Mandi } from "@/services/adminService";
import { SectionCard } from "./section-card";
const dots: Record<string, string> = {
  Normal: "bg-emerald-600",
  Busy: "bg-amber-500",
  Overloaded: "bg-red-600",
  Closed: "bg-slate-400",
};

export function CentrePanels({ mandis, day }: { mandis: Mandi[]; day: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const centre = mandis.find((m) => m.id === selected);
  const minLat = Math.min(...mandis.map((m) => m.lat)),
    maxLat = Math.max(...mandis.map((m) => m.lat));
  const minLng = Math.min(...mandis.map((m) => m.lng)),
    maxLng = Math.max(...mandis.map((m) => m.lng));
  return (
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Live Centre Map"
          description="Recorded centre coordinates · schematic view"
          icon={<MapIcon className="size-4" />}
          className="xl:col-span-2"
          bodyClassName="p-0"
        >
          <div className="flex flex-wrap gap-3 border-b px-5 py-3">
            {Object.entries(dots).map(([status, color]) => (
              <span
                key={status}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className={`size-2 rounded-full ${color}`} />
                {status}
              </span>
            ))}
          </div>
          <div className="relative min-h-72 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:22px_22px]">
            <span className="absolute right-4 top-3 text-xs font-semibold text-muted-foreground">
              N ↑
            </span>
            {!mandis.length && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No centres match these filters.
              </p>
            )}
            {mandis.map((m) => (
              <button
                key={m.id}
                aria-label={`View ${m.name}, ${m.status}, ${m.workload}% workload`}
                onClick={() => setSelected(m.id)}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-blue-600"
                style={{
                  left: `${maxLng === minLng ? 50 : 15 + ((m.lng - minLng) / (maxLng - minLng)) * 70}%`,
                  top: `${maxLat === minLat ? 50 : 15 + ((maxLat - m.lat) / (maxLat - minLat)) * 65}%`,
                }}
              >
                <span
                  className={`size-4 rounded-full ring-4 ring-white ${dots[m.status] ?? dots["Closed"]}`}
                />
                <span className="rounded border bg-white/95 px-2 py-1 text-xs font-medium shadow-sm">
                  {m.name.split(" — ")[0]} · {m.workload}%
                </span>
              </button>
            ))}
          </div>
          <p className="px-5 py-3 text-xs text-muted-foreground">
            Positions use latitude and longitude from the shared catalogue. This is not a road or
            boundary map. Select a centre to view its live queue, slots and alternatives.
          </p>
        </SectionCard>
        <SectionCard
          title="Centre Load Ranking"
          description="Active queue ÷ configured capacity"
          icon={<Gauge className="size-4" />}
          bodyClassName="p-2"
        >
          <ul className="divide-y">
            {[...mandis]
              .sort((a, b) => b.workload - a.workload)
              .map((m) => (
                <li key={m.id}>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg p-3 text-left hover:bg-muted"
                    onClick={() => setSelected(m.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {m.name.split(" — ")[0]}
                        </span>
                        <Status value={m.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${dots[m.status] ?? dots["Closed"]}`}
                            style={{ width: `${Math.min(100, m.workload)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold">{m.workload}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.queue} active · {m.activeCounters} counters · {m.availableSlots} slot
                        places
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
          </ul>
          {!mandis.length && (
            <p className="p-5 text-sm text-muted-foreground">No matching centres.</p>
          )}
        </SectionCard>
      </div>
      <Dialog
        open={!!centre}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="government-workspace max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{centre?.name}</DialogTitle>
            <DialogDescription>
              Shared backend data. Configuration changes are saved for both dashboards.
            </DialogDescription>
          </DialogHeader>
          {centre && <MandiDetail key={centre.id} mandi={centre} day={day} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QueueMonitor({ mandis }: { mandis: Mandi[] }) {
  return (
    <SectionCard
      title="Live Queue Monitor"
      description="The same queues tracked by farmers"
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/$section" params={{ section: "queue" }}>
            Manage queue <ArrowRight className="size-3" />
          </Link>
        </Button>
      }
      bodyClassName="p-0"
    >
      <Table
        rows={mandis}
        columns={[
          { label: "Centre", render: (m) => m.name },
          { label: "Active queue", render: (m) => m.queue },
          { label: "Counters", render: (m) => m.activeCounters },
          { label: "Processing rate", render: (m) => `${m.processingRate}/hour (configured)` },
          { label: "Load", render: (m) => `${m.workload}%` },
          {
            label: "Estimated wait",
            render: (m) => (
              <span className="flex items-center gap-1">
                <Timer className="size-3" />
                {duration(m.waitingMin)}
              </span>
            ),
          },
          { label: "Status", render: (m) => <Status value={m.status} /> },
        ]}
      />
    </SectionCard>
  );
}
