import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { useI18n } from "@/lib/i18n";
import { procurementService } from "@/services/procurementService";
import { predictionService } from "@/services/predictionService";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer/slot")({
  component: SlotPage,
});

function SlotPage() {
  const { t } = useI18n();
  const { centres, booking, setBooking, crops, pushNotification } = useDemo();
  const navigate = useNavigate();
  const centre = centres.find((c) => c.id === booking.centreId) ?? centres[0]!;
  const crop = crops[0]!;
  const [selectedSlot, setSelectedSlot] = useState("s1");

  const { data: processingMin = 42 } = useQuery({
    queryKey: ["processing", crop.quantity],
    queryFn: () => predictionService.predictProcessingTime(crop.quantity),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["slots", centre.id, processingMin],
    queryFn: () => procurementService.getSlots(centre.id, processingMin),
  });

  const confirm = async () => {
    const slot = slots.find((s) => s.id === selectedSlot);
    await procurementService.confirmSlot(centre.id, selectedSlot);
    setBooking({ centreId: centre.id, slot: slot?.window.split(" – ")[0] ?? "11:30 AM", status: "Confirmed" });
    pushNotification(
      notificationService.create("slot", "Slot Confirmed", `Your procurement slot is confirmed for ${slot?.window}.`),
    );
    toast.success("Slot confirmed", { description: slot?.window });
    void navigate({ to: "/farmer/track" });
  };

  return (
    <FarmerShell title="Dynamic Slot" back="/farmer/procurement">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Selected centre</p>
            <h2 className="text-lg font-bold">{centre.name}</h2>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Your crop</dt>
              <dd className="font-semibold">{crop.type}</dd>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Quantity</dt>
              <dd className="font-semibold">
                {crop.quantity} {crop.unit}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4 border-status-info/25 bg-status-info-soft/50">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-status-info" aria-hidden="true" /> AI Estimated Processing Time
            </p>
            <p className="text-2xl font-bold text-status-info">{processingMin} minutes</p>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">ML prediction — demo</span>
        </CardContent>
      </Card>

      <section className="mt-5" aria-labelledby="slots">
        <h2 id="slots" className="mb-3 text-base font-bold">
          Recommended Slot
        </h2>
        <div className="space-y-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlot(slot.id)}
              aria-pressed={selectedSlot === slot.id}
              className={cn(
                "card-surface w-full p-4 text-left transition-colors",
                selectedSlot === slot.id && "border-primary bg-status-normal-soft",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{slot.window}</span>
                {slot.recommended ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    Recommended
                  </span>
                ) : (
                  selectedSlot === slot.id && <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                )}
              </div>
              {slot.reason && <p className="mt-1.5 text-sm text-muted-foreground">{slot.reason}</p>}
            </button>
          ))}
        </div>
      </section>

      <Button size="lg" className="mt-5 w-full" onClick={() => void confirm()}>
        {t("confirmSlot")}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">ML prediction — demonstration data</p>
    </FarmerShell>
  );
}
