import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
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
  const { savedBooking, bookingError, reloadBooking, centres } = useDemo();
  const visits = useQuery({
    queryKey: ["farmer-visits"],
    queryFn: () =>
      apiGet<
        {
          status: string;
          booked_at: string | null;
          arrived_at: string | null;
          started_at: string | null;
          completed_at: string | null;
        }[]
      >("/api/farmers/me/visits"),
    refetchInterval: 5000,
  });
  const visit = visits.data?.[0];
  const journey = [
    { key: "booked", label: "Slot booked", time: visit?.booked_at },
    { key: "arrived", label: "Checked in", time: visit?.arrived_at },
    { key: "quality", label: "Quality check", time: visit?.started_at },
    { key: "procurement", label: "Procurement", time: null },
    { key: "completed", label: "Completed", time: visit?.completed_at },
  ];
  const journeyIndex =
    (
      {
        Booked: 0,
        "Checked In": 1,
        Waiting: 1,
        "Quality Check": 2,
        Procurement: 3,
        Completed: 4,
      } as Record<string, number>
    )[visit?.status ?? ""] ?? -1;
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
              <p className="mt-1 font-bold">{visit?.status ?? "Not recorded"}</p>
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
                      {done
                        ? step.time
                          ? new Date(step.time).toLocaleString()
                          : "Timestamp not recorded"
                        : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button
            variant="outline"
            className="mt-5 w-full"
            disabled={visits.isFetching}
            onClick={() => void visits.refetch()}
          >
            <Navigation className="size-4" /> Refresh recorded journey
          </Button>
        </CardContent>
      </Card>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        {visits.error
          ? visits.error.message
          : "Updates come from your saved booking and mandi operations."}
      </p>
    </FarmerShell>
  );
}
