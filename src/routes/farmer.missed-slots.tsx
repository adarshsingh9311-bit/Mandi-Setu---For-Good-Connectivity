import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { missedSlotService, type RecoveryOption } from "@/services/missedSlotService";
export const Route = createFileRoute("/farmer/missed-slots")({ component: MissedSlots });
function MissedSlots() {
  const client = useQueryClient();
  const missed = useQuery({
    queryKey: ["missed-slots"],
    queryFn: missedSlotService.list,
    refetchInterval: 10000,
  });
  const pending = missed.data?.find((v) => !v.recovered_booking);
  const options = useQuery({
    queryKey: ["missed-options", pending?.id],
    queryFn: () => missedSlotService.options(pending!.id),
    enabled: !!pending,
  });
  const rebook = useMutation({
    mutationFn: (o: RecoveryOption) => missedSlotService.rebook(pending!.id, o),
    onSuccess: () => void client.invalidateQueries(),
  });
  return (
    <FarmerShell title="Missed-slot recovery" back="/farmer">
      <div className="space-y-4">
        <p className="text-sm">
          Expired slots stay in your history. Choose a future available slot to recover.
        </p>
        {missed.isPending && <p role="status">Loading missed slots…</p>}
        {missed.error && <p role="alert">{missed.error.message}</p>}
        {missed.data?.length === 0 && <p>No missed slots require recovery.</p>}
        {pending && (
          <section className="space-y-3 rounded-xl border p-4">
            <h2 className="font-semibold">
              {pending.crop_type} · {pending.booking_day} · {pending.slot_label}
            </h2>
            {options.data?.map((o) => (
              <Button
                className="mr-2"
                variant="outline"
                key={`${o.centreId}:${o.day}:${o.slotId}`}
                disabled={rebook.isPending}
                onClick={() => rebook.mutate(o)}
              >
                {o.label}
              </Button>
            ))}
            {options.data?.length === 0 && <p>No future capacity is currently available.</p>}
            {rebook.error && <p role="alert">{rebook.error.message}</p>}
          </section>
        )}
      </div>
    </FarmerShell>
  );
}
