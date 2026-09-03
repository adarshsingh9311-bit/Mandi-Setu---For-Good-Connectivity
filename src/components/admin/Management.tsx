import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  adminService,
  indiaDay,
  type Visit,
  type Mandi,
  type ManagedSlot,
  type SlotInput,
  type FarmerRow,
} from "@/services/adminService";
import {
  useAdmin,
  useAdminMutation,
  LoadState,
  Table,
  Status,
  duration,
  timestamp,
  Field,
  inputClass,
} from "./shared";
const transitions: Record<string, string[]> = {
  Booked: ["Checked In", "Missed", "Cancelled"],
  "Checked In": ["Waiting", "Quality Check", "Cancelled"],
  Waiting: ["Quality Check", "Missed", "Cancelled"],
  "Quality Check": ["Procurement", "Cancelled"],
  Procurement: ["Completed", "Cancelled"],
};
export const visitColumns = [
  { label: "Position", render: (v: Visit) => v.position ?? "—" },
  { label: "Farmer", render: (v: Visit) => v.farmerName },
  {
    label: "Booking ID",
    render: (v: Visit) => (
      <span title={v.bookingId ?? ""}>{v.bookingId?.slice(0, 8) ?? "Walk-in"}</span>
    ),
  },
  { label: "Mandi", render: (v: Visit) => v.centre_id },
  { label: "Crop", render: (v: Visit) => v.crop_type ?? "Not recorded" },
  {
    label: "Quantity",
    render: (v: Visit) =>
      v.quantity_quintals === null ? "Not recorded" : `${v.quantity_quintals} qtl`,
  },
  {
    label: "Slot",
    render: (v: Visit) =>
      v.booking_day ? `${v.booking_day} · ${v.slot_label ?? "Not recorded"}` : "Not booked",
  },
  { label: "Arrival (India)", render: (v: Visit) => timestamp(v.arrived_at) },
  { label: "Wait", render: (v: Visit) => duration(v.waitingMin) },
  { label: "Status", render: (v: Visit) => <Status value={v.status} /> },
];
function MandiSelect({
  value,
  onChange,
  all = true,
}: {
  value: string;
  onChange: (s: string) => void;
  all?: boolean;
}) {
  const q = useAdmin<Mandi[]>("mandis");
  return (
    <Field label="Mandi">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {all && <option value="">All assigned mandis</option>}
        {q.data?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function QueueManagement() {
  const user = useAuth();
  const [centre, setCentre] = useState(user.centreId ?? "");
  const [status, setStatus] = useState("");
  const [day, setDay] = useState("");
  const [selected, setSelected] = useState<Visit | null>(null);
  const [next, setNext] = useState("");
  const q = useAdmin<Visit[]>("queue", { centreId: centre, status, day });
  const mutation = useAdminMutation(
    (body: {
      id: string;
      expectedStatus: string;
      status: string;
      actualQuantityQuintals?: number;
    }) =>
      adminService.mutate(`queue/${body.id}`, "PATCH", {
        expectedStatus: body.expectedStatus,
        status: body.status,
        ...(body.actualQuantityQuintals !== undefined
          ? { actualQuantityQuintals: body.actualQuantityQuintals }
          : {}),
      }),
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MandiSelect value={centre} onChange={setCentre} />
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {[
              "Booked",
              "Checked In",
              "Waiting",
              "Quality Check",
              "Procurement",
              "Completed",
              "Missed",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Date (optional)">
          <input
            className={inputClass}
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </Field>
      </div>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <Table
          rows={q.data}
          columns={[
            ...visitColumns,
            {
              label: "Action",
              render: (v) =>
                transitions[v.status]?.length ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(v);
                      setNext(transitions[v.status]![0]!);
                      mutation.reset();
                    }}
                  >
                    Update
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update procurement status</DialogTitle>
            <DialogDescription>
              {selected?.farmerName} · Current: {selected?.status}. Changes are saved to the shared
              queue.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selected) return;
              const f = new FormData(e.currentTarget);
              mutation.mutate(
                {
                  id: selected.id,
                  expectedStatus: selected.status,
                  status: next,
                  ...(next === "Completed"
                    ? { actualQuantityQuintals: Number(f.get("quantity")) }
                    : {}),
                },
                { onSuccess: () => setSelected(null) },
              );
            }}
          >
            <Field label="New status">
              <select className={inputClass} value={next} onChange={(e) => setNext(e.target.value)}>
                {(transitions[selected?.status ?? ""] ?? []).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            {next === "Completed" && (
              <Field label="Actual quantity procured (quintals)">
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className={inputClass}
                />
              </Field>
            )}
            {mutation.isError && (
              <p role="alert" className="text-destructive">
                {mutation.error.message}
              </p>
            )}
            <Button disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save status"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function SlotManagement() {
  const user = useAuth();
  const [centre, setCentre] = useState(user.centreId ?? "mandi-a");
  const [day, setDay] = useState(indiaDay(1));
  const [editing, setEditing] = useState<ManagedSlot | null>(null);
  const [open, setOpen] = useState(false);
  const q = useAdmin<ManagedSlot[]>("slots", { centreId: centre, day });
  const mutation = useAdminMutation((body: SlotInput) =>
    adminService.mutate("slots", editing ? "PATCH" : "POST", body),
  );
  return (
    <div className="space-y-5">
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <MandiSelect value={centre} onChange={setCentre} all={false} />
        <Field label="Slot date">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
            mutation.reset();
          }}
        >
          Create slot
        </Button>
      </div>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <Table
          rows={q.data}
          columns={[
            { label: "Window", render: (s) => <span className="font-semibold">{s.window}</span> },
            { label: "Capacity", render: (s) => s.capacity },
            { label: "Booked", render: (s) => s.booked },
            { label: "Remaining", render: (s) => s.remaining },
            {
              label: "Status",
              render: (s) => <Status value={s.enabled ? "Enabled" : "Disabled"} />,
            },
            {
              label: "Bookings",
              render: (s) =>
                s.bookings.length ? (
                  <details>
                    <summary className="cursor-pointer text-emerald-800">
                      View {s.bookings.length} farmers
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {s.bookings.map((b) => (
                        <li key={b.farmerId}>{b.name}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  "No bookings"
                ),
            },
            {
              label: "Action",
              render: (s) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                    mutation.reset();
                  }}
                >
                  Edit
                </Button>
              ),
            },
          ]}
        />
      )}
      <p className="text-sm text-muted-foreground">
        Disabling prevents new reservations while preserving existing bookings. Capacity cannot fall
        below the booked count.
      </p>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!mutation.isPending) setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit slot" : "Create slot"}</DialogTitle>
            <DialogDescription>
              {centre} · {day}. Existing booked slot times cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <form
            key={editing?.id ?? "new"}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              mutation.mutate(
                {
                  centreId: centre,
                  day,
                  slotId: String(f.get("id")),
                  starts: String(f.get("starts")),
                  ends: String(f.get("ends")),
                  capacity: Number(f.get("capacity")),
                  enabled: f.get("enabled") === "on",
                },
                { onSuccess: () => setOpen(false) },
              );
            }}
          >
            <Field label="Slot ID">
              <input
                name="id"
                required
                pattern="[a-zA-Z0-9_-]+"
                maxLength={80}
                readOnly={!!editing}
                defaultValue={editing?.id ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start (India time)">
                <input
                  type="time"
                  name="starts"
                  required
                  defaultValue={editing?.starts ?? "14:00"}
                  className={inputClass}
                />
              </Field>
              <Field label="End (India time)">
                <input
                  type="time"
                  name="ends"
                  required
                  defaultValue={editing?.ends ?? "15:00"}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Capacity">
              <input
                name="capacity"
                type="number"
                min={0}
                max={100000}
                required
                defaultValue={editing?.capacity ?? 1}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="enabled" defaultChecked={editing?.enabled ?? true} />
              Enabled for new bookings
            </label>
            {mutation.isError && (
              <p role="alert" className="text-destructive">
                {mutation.error.message}
              </p>
            )}
            <Button disabled={mutation.isPending}>Save slot</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function FarmerManagement() {
  const [search, setSearch] = useState("");
  const [centre, setCentre] = useState("");
  const [crop, setCrop] = useState("");
  const [status, setStatus] = useState("");
  const [day, setDay] = useState("");
  const q = useAdmin<FarmerRow[]>("farmers", { search, centreId: centre, crop, status, day });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Search name, village or ID">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
          />
        </Field>
        <MandiSelect value={centre} onChange={setCentre} />
        <Field label="Crop">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className={inputClass}>
            <option value="">All crops</option>
            {["Wheat", "Paddy", "Mustard", "Gram", "Sugarcane"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Visit status">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {[
              "Booked",
              "Checked In",
              "Waiting",
              "Quality Check",
              "Procurement",
              "Completed",
              "Missed",
              "Cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <LoadState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data && (
        <Table
          rows={q.data}
          columns={[
            {
              label: "Farmer",
              render: (f) => (
                <div>
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-xs text-muted-foreground" title={f.id}>
                    {f.id.slice(0, 12)}…
                  </p>
                </div>
              ),
            },
            { label: "Village", render: (f) => f.village || "Not provided" },
            { label: "District", render: (f) => f.district || "Not provided" },
            { label: "Registered crops", render: (f) => f.crops.join(", ") || "None yet" },
            { label: "Visits", render: (f) => f.visits },
            { label: "Latest status", render: (f) => <Status value={f.latestStatus} /> },
          ]}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Contact numbers, passwords, sessions, and other account credentials are excluded from this
        view.
      </p>
    </div>
  );
}
