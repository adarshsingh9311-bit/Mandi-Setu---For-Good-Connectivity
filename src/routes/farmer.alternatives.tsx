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
  const { centres, booking, setBooking, pushNotification } = useDemo();
  const navigate = useNavigate();
  const current = centres.find((c) => c.id === booking.centreId) ?? centres[0]!;
  const [ranked, setRanked] = useState(() =>
    mandiService
      .rankAlternatives(current.id, "Wheat")
      .map((c) => centres.find((x) => x.id === c.id) ?? c)
      .sort((a, b) => a.estimatedWaitMin - b.estimatedWaitMin),
  );

  useEffect(() => {
    void mandiService.listAlternatives(current.id, "Wheat").then((list) => {
      setRanked(
        list
          .map((c) => centres.find((x) => x.id === c.id) ?? c)
          .sort((a, b) => a.estimatedWaitMin - b.estimatedWaitMin),
      );
    });
  }, [centres, current.id]);

  const best = ranked[0];
  if (!best) return null;

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
            {current.name.split(" — ")[0]}{" "}
            {current.status === "over" ? "Has Become Overloaded" : "Is Under Pressure"}
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
          <LoadBar value={current.loadPercent} />
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
