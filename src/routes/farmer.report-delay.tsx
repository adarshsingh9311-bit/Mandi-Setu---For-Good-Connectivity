import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudRain, Truck, Construction, Building2, CircleAlert, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notificationService";

export const Route = createFileRoute("/farmer/report-delay")({
  component: ReportDelayPage,
});

const reasons = [
  { id: "weather", label: "Weather", icon: CloudRain },
  { id: "vehicle", label: "Vehicle Problem", icon: Truck },
  { id: "road", label: "Road Blockage", icon: Construction },
  { id: "centre", label: "Centre Problem", icon: Building2 },
  { id: "other", label: "Other", icon: CircleAlert },
] as const;

const options = [
  { id: "o1", title: "Option 1 — Next available slot", detail: "1:00 PM" },
  { id: "o2", title: "Option 2 — Nearby eligible centre", detail: "Mandi B — 42 min wait" },
  { id: "o3", title: "Option 3 — Keep current slot", detail: "11:30 AM (risk of missing)" },
];

function ReportDelayPage() {
  const { booking, setBooking, pushNotification } = useDemo();
  const navigate = useNavigate();
  const [reason, setReason] = useState<string | null>(null);
  const [option, setOption] = useState("o1");

  const submit = () => {
    if (option === "o1") setBooking({ ...booking, slot: "1:00 PM", status: "Recovery Slot" });
    if (option === "o2") setBooking({ centreId: "mandi-b", slot: "12:40 PM", status: "Recovery Slot" });
    pushNotification(
      notificationService.create("recovery", "Slot Updated", `Recovery applied: ${options.find((o) => o.id === option)?.detail}.`),
    );
    toast.success("Recovery option applied");
    void navigate({ to: "/farmer/track" });
  };

  return (
    <FarmerShell title="Report Delay" back="/farmer">
      <h2 className="mb-3 text-base font-bold">What happened?</h2>
      <div className="grid grid-cols-2 gap-3">
        {reasons.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReason(r.id)}
            aria-pressed={reason === r.id}
            className={cn(
              "card-surface flex min-h-24 flex-col items-start justify-between p-4 text-left transition-colors",
              reason === r.id && "border-primary bg-status-normal-soft",
            )}
          >
            <r.icon className="size-6 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold">{r.label}</span>
          </button>
        ))}
      </div>

      {reason && (
        <>
          <Card className="mt-5">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">Current Slot</p>
                <p className="font-bold">{booking.slot}</p>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                <p className="font-bold">12:35 PM</p>
              </div>
              <div className="rounded-lg bg-status-over-soft px-3 py-2">
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="flex items-center gap-1.5 font-bold text-status-over">
                  <CircleDot className="size-4" aria-hidden="true" /> May miss slot
                </p>
              </div>
            </CardContent>
          </Card>

          <h2 className="mt-6 mb-3 text-base font-bold">Recommended Recovery</h2>
          <div className="space-y-3">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOption(o.id)}
                aria-pressed={option === o.id}
                className={cn(
                  "card-surface w-full p-4 text-left transition-colors",
                  option === o.id && "border-primary bg-status-normal-soft",
                )}
              >
                <p className="font-semibold">{o.title}</p>
                <p className="text-sm text-muted-foreground">{o.detail}</p>
              </button>
            ))}
          </div>

          <Button size="lg" className="mt-4 w-full" onClick={submit}>
            Select Option
          </Button>
        </>
      )}
    </FarmerShell>
  );
}
