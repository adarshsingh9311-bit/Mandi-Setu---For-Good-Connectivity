import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadBar } from "@/components/shared/LoadBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDemo } from "@/lib/demoStore";
import { queueService } from "@/services/queueService";
import { mandiService } from "@/services/mandiService";

export const Route = createFileRoute("/farmer/alternatives")({
  component: AlternativesPage,
});

function AlternativesPage() {
  const { centres, booking, savedBooking, crops, setBooking } = useDemo();
  const navigate = useNavigate();
  const current =
    centres.find((c) => c.id === (savedBooking?.centreId ?? booking.centreId)) ?? centres[0]!;
  const crop = crops.find((c) => c.id === savedBooking?.cropId)?.type ?? crops[0]?.type;
  const [ranked, setRanked] = useState<typeof centres>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!crop) return;
    void mandiService
      .listAlternatives(current.id, crop, savedBooking?.day)
      .then((list) => {
        if (active) {
          setRanked(list);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError("Could not refresh alternatives. Please retry shortly.");
      });
    return () => {
      active = false;
    };
  }, [centres, current.id, crop, savedBooking?.day]);

  const best = ranked[0];
  if (!best || error)
    return (
      <FarmerShell title="Alternative Centres" back="/farmer">
        <p role="status">
          {error ??
            (crop
              ? "No eligible alternative has capacity and future slots today."
              : "Register a crop to see eligible alternatives.")}
        </p>
      </FarmerShell>
    );

  const switchCentre = () => {
    setBooking({ centreId: best.id, slot: "—", status: "Slot Pending" });
    void navigate({ to: "/farmer/slot" });
  };

  return (
    <FarmerShell title="Alternative Centres" back="/farmer">
      <Card className="border-status-over/35 bg-status-over-soft">
        <CardContent className="space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-status-over">
            <AlertTriangle className="size-5" aria-hidden="true" />
            {current.name.split(" — ")[0]} · {current.operationalStatus ?? current.status}
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-card px-3 py-2">
              <dt className="text-xs text-muted-foreground">Current Load</dt>
              <dd className="text-xl font-bold text-status-over">{current.loadPercent}%</dd>
            </div>
            <div className="rounded-lg bg-card px-3 py-2">
              <dt className="text-xs text-muted-foreground">Estimated Waiting</dt>
              <dd className="text-xl font-bold text-status-over">
                {queueService.formatWait(current.estimatedWaitMin)}
              </dd>
            </div>
          </dl>
          <LoadBar value={current.loadPercent} status={current.status} />
        </CardContent>
      </Card>

      <h2 className="mt-6 mb-3 text-base font-bold">Recommended Alternative</h2>
      <Card className="border-primary/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{best.name}</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" /> {best.distanceKm} km away
              </p>
            </div>
            <StatusBadge status={best.status} />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Load</dt>
              <dd className="font-bold">{best.loadPercent}%</dd>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Waiting</dt>
              <dd className="font-bold">{queueService.formatWait(best.estimatedWaitMin)}</dd>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Distance</dt>
              <dd className="font-bold">{best.distanceKm} km</dd>
            </div>
          </dl>
          <p className="rounded-lg bg-status-normal-soft px-3 py-2 text-sm">
            You may be able to complete procurement faster at {best.name.split(" — ")[0]}.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" className="flex-1">
                  Switch to {best.name.split(" — ")[0]} <ArrowRight className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm centre switch</AlertDialogTitle>
                  <AlertDialogDescription>
                    KisanSetu never moves you automatically. Confirm that you want your procurement
                    moved to {best.name}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={switchCentre}>Yes, switch</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => {
                toast.info("Staying at current centre", { description: current.name });
                void navigate({ to: "/farmer" });
              }}
            >
              Stay at {current.name.split(" — ")[0]}
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mt-6 mb-3 text-base font-bold">Other eligible centres</h2>
      <div className="space-y-3">
        {ranked.slice(1).map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <h3 className="font-bold">{c.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {c.distanceKm} km · {c.loadPercent}% load ·{" "}
                  {queueService.formatWait(c.estimatedWaitMin)} wait
                </p>
              </div>
              <StatusBadge status={c.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </FarmerShell>
  );
}
