import { CentreWaitEstimate } from "@/components/shared/AIPredictionCard";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { List, Map as MapIcon, MapPin, Clock } from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadBar } from "@/components/shared/LoadBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DemoDataNote } from "@/components/shared/DemoBadge";
import { MandiMap } from "@/components/shared/MandiMap";
import { useDemo } from "@/lib/demoStore";
import { useI18n } from "@/lib/i18n";
import { queueService } from "@/services/queueService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer/procurement")({
  component: ProcurementPage,
});

function ProcurementPage() {
  const { t } = useI18n();
  const { centres, setBooking, booking } = useDemo();
  const [view, setView] = useState<"list" | "map">("list");
  const navigate = useNavigate();

  return (
    <FarmerShell title={t("selectCentre")} back="/farmer">
      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            { id: "list", label: "List", icon: List },
            { id: "map", label: "Map", icon: MapIcon },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <v.icon className="size-4" aria-hidden="true" /> {v.label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <MandiMap centres={centres} />
      ) : (
        <div className="space-y-3">
          {centres.map((centre) => (
            <Card key={centre.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{centre.name}</h2>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-4" aria-hidden="true" /> {centre.distanceKm} km ·{" "}
                      {centre.crops.join(", ")}
                    </p>
                  </div>
                  <StatusBadge status={centre.status} />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("currentLoad")}</span>
                    <span className="font-bold">{centre.loadPercent}%</span>
                  </div>
                  <LoadBar value={centre.loadPercent} />
                </div>

                <p className="flex items-center gap-1.5 text-sm">
                  <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">{t("estimatedWait")}:</span>
                  <span className="font-bold">
                    <CentreWaitEstimate centreId={centre.id} compact />
                  </span>
                </p>

                {centre.status === "normal" ? (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setBooking({ ...booking, centreId: centre.id, status: "Slot Pending" });
                      void navigate({ to: "/farmer/slot" });
                    }}
                  >
                    {t("selectThisCentre")}
                  </Button>
                ) : (
                  <Button asChild size="lg" variant="outline" className="w-full">
                    <Link to="/farmer/alternatives">{t("viewDetails")}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DemoDataNote className="mt-6" />
    </FarmerShell>
  );
}
