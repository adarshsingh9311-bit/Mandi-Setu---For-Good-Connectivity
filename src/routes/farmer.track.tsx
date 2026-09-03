import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Clock, MapPin, Navigation, Truck } from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { queueService } from "@/services/queueService";

export const Route = createFileRoute("/farmer/track")({
  head: () => ({
    meta: [
      { title: "Track Procurement — KisanSetu" },
      {
        name: "description",
        content: "Follow your crop procurement journey from slot to payment.",
      },
      { property: "og:title", content: "Track Procurement — KisanSetu" },
      {
        property: "og:description",
        content: "Follow your crop procurement journey from slot to payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});
function TrackPage() {
  const {
    savedBooking,
    bookingError,
    reloadBooking,
    centres,
    journey,
    journeyIndex,
    advanceJourney,
    etaMinutesLate,
  } = useDemo();
  const booking = savedBooking;
  if (bookingError || !booking)
    return (
      <FarmerShell title="Track procurement" back="/farmer">
        <p>{bookingError ?? "No confirmed booking yet. Book a slot to start."}</p>
        <Button onClick={() => void reloadBooking()}>Refresh booking</Button>
      </FarmerShell>
    );
  const centre = centres.find((c) => c.id === booking.centreId) ?? centres[0];
  if (!centre) return null;
  return (
    <FarmerShell title="Track procurement" back="/farmer">
      <Card className="border-0 bg-brand-gradient text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm opacity-80">{booking.status}</p>
              <h2 className="mt-1 text-xl font-bold">{centre.name.split(" — ")[0]}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm opacity-80">
                <MapPin className="size-4" />
                {centre.district}, {centre.state}
              </p>
            </div>
            <Truck className="size-7 opacity-90" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <p className="text-xs opacity-80">Booked slot</p>
              <p className="mt-1 font-bold">{booking.slot}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <p className="text-xs opacity-80">Arrival status</p>
              <p className="mt-1 font-bold">
                {etaMinutesLate ? `${etaMinutesLate} min delayed` : "On time"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Procurement journey</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your place in the process</p>
            </div>
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <ol className="mt-6 space-y-0">
            {journey.map((step, index) => {
              const done = index <= journeyIndex;
              return (
                <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                  <span
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {done ? <Check className="size-4" /> : <Circle className="size-3" />}
                  </span>
                  {index < journey.length - 1 && (
                    <span
                      className={`absolute top-8 left-4 h-full w-px ${done ? "bg-primary" : "bg-border"}`}
                    />
                  )}
                  <div className="pt-1">
                    <p
                      className={`font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {done ? step.time : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button
            variant="outline"
            className="mt-5 w-full"
            disabled={journeyIndex >= journey.length - 1}
            onClick={advanceJourney}
          >
            <Navigation className="size-4" /> Update journey
          </Button>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Updates are based on demonstration data.
      </p>
    </FarmerShell>
  );
}
