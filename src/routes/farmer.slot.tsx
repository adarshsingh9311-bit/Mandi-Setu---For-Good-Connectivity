import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";
import { procurementService } from "@/services/procurementService";
export const Route = createFileRoute("/farmer/slot")({ component: SlotPage });
function SlotPage() {
  const {
    centres,
    booking,
    crops,
    farmerLoading,
    farmerError,
    reloadFarmer,
    savedBooking,
    bookingError,
    reloadBooking,
  } = useDemo();
  const [day, setDay] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + 86400000)),
  );
  const [cropId, setCropId] = useState("");
  const [slotId, setSlotId] = useState("");
  const client = useQueryClient();
  const centre = centres.find((c) => c.id === booking.centreId);
  const eligible = crops.filter((c) => centre?.crops.includes(c.type));
  const selectedCrop = eligible.find((c) => c.id === cropId) ?? eligible[0];
  const slots = useQuery({
    queryKey: ["booking-slots", booking.centreId, day],
    queryFn: () => procurementService.getSlots(booking.centreId, day),
    enabled: !!day,
    retry: false,
    refetchInterval: 15000,
  });
  const mutation = useMutation({
    mutationFn: async (cancel: boolean) => {
      if (cancel) return procurementService.cancel();
      if (!selectedCrop) throw new Error("Choose a crop first");
      return procurementService.confirmSlot({
        centreId: booking.centreId,
        cropId: selectedCrop.id,
        day,
        slotId,
      });
    },
    onSuccess: async () => {
      await Promise.all([reloadBooking(), reloadFarmer()]);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["booking-slots"] });
    },
  });
  return (
    <FarmerShell title="Book procurement slot" back="/farmer/procurement">
      {bookingError && (
        <p role="alert">
          {bookingError}
          <Button onClick={() => void reloadBooking()}>Retry</Button>
        </p>
      )}
      {savedBooking && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-bold">Confirmed booking</h2>
            <p>{centres.find((c) => c.id === savedBooking.centreId)?.name}</p>
            <p>{savedBooking.slot}</p>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(true)}
            >
              Cancel booking
            </Button>
            <p className="text-sm">Confirming a new slot will replace this booking.</p>
          </CardContent>
        </Card>
      )}
      <h2 className="mt-4 font-bold">{centre?.name}</h2>
      {farmerLoading && <p role="status">Loading crops…</p>}
      {farmerError && (
        <p role="alert">
          {farmerError}
          <Button onClick={() => void reloadFarmer()}>Retry</Button>
        </p>
      )}
      {!farmerLoading && !farmerError && !eligible.length && (
        <p>
          No registered crops are accepted here. <Link to="/farmer/crop">Register a crop</Link> or
          choose another centre.
        </p>
      )}
      <label htmlFor="booking-crop" className="mt-4 block">
        Crop
      </label>
      <select
        id="booking-crop"
        className="w-full rounded border p-2"
        value={selectedCrop?.id ?? ""}
        disabled={mutation.isPending}
        onChange={(e) => setCropId(e.target.value)}
      >
        {eligible.map((c) => (
          <option key={c.id} value={c.id}>
            {c.type} · {c.quantity} {c.unit}
          </option>
        ))}
      </select>
      <label htmlFor="booking-date" className="mt-4 block">
        Date (India time)
      </label>
      <input
        id="booking-date"
        type="date"
        className="w-full rounded border p-2"
        value={day}
        disabled={mutation.isPending}
        onChange={(e) => {
          setDay(e.target.value);
          setSlotId("");
          mutation.reset();
        }}
      />
      {slots.isFetching && <p role="status">Checking availability…</p>}
      {slots.isError && (
        <p role="alert">
          {slots.error.message}
          <Button onClick={() => void slots.refetch()}>Retry</Button>
        </p>
      )}
      <div className="mt-4 space-y-2">
        {slots.data?.map((s) => (
          <Button
            key={s.id}
            className="w-full"
            variant={slotId === s.id ? "default" : "outline"}
            aria-pressed={slotId === s.id}
            disabled={!s.available || mutation.isPending}
            onClick={() => {
              setSlotId(s.id);
              mutation.reset();
            }}
          >
            {s.window} · {s.available ? `${s.remaining} places available` : "Unavailable"}
          </Button>
        ))}
      </div>
      <Button
        className="mt-4 w-full"
        disabled={
          mutation.isPending ||
          farmerLoading ||
          !!farmerError ||
          !!bookingError ||
          !selectedCrop ||
          !day ||
          slots.isError ||
          !slots.data?.some((s) => s.id === slotId && s.available)
        }
        onClick={() => mutation.mutate(false)}
      >
        {mutation.isPending ? "Saving…" : "Confirm slot"}
      </Button>
      {mutation.isError && (
        <p role="alert" className="mt-3">
          {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="mt-3">
          Booking updated successfully.
        </p>
      )}
    </FarmerShell>
  );
}
