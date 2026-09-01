import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo } from "@/lib/demoStore";
import { useI18n, languages } from "@/lib/i18n";
import { StatusBadge } from "@/components/shared/StatusBadge";

export const Route = createFileRoute("/farmer/crop")({
  component: MyCropPage,
});

const schema = z.object({
  type: z.string().min(2, "Select a crop type"),
  quantity: z.coerce.number().positive("Enter a valid quantity"),
  unit: z.string().min(1),
  expectedDate: z.string().min(4, "Select expected selling date"),
  preferredCentreId: z.string().min(1, "Select a preferred centre"),
  transportAvailable: z.boolean(),
  language: z.string().min(1),
});

type FormValues = z.input<typeof schema>;

function MyCropPage() {
  const { t } = useI18n();
  const { crops, centres, addCrop } = useDemo();
  const [open, setOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "Wheat",
      quantity: 20,
      unit: "Quintals",
      expectedDate: "",
      preferredCentreId: "mandi-a",
      transportAvailable: true,
      language: "en",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    addCrop({
      id: `crop-${Date.now()}`,
      type: values.type,
      quantity: Number(values.quantity),
      unit: values.unit,
      expectedDate: values.expectedDate,
      preferredCentreId: values.preferredCentreId,
      transportAvailable: values.transportAvailable,
      status: "Not Scheduled",
    });
    toast.success("Crop registered", { description: `${values.quantity} ${values.unit} of ${values.type}` });
    setOpen(false);
    form.reset();
  });

  return (
    <FarmerShell title={t("myCrop")} back="/farmer">
      <div className="space-y-3">
        {crops.map((crop) => {
          const centre = centres.find((c) => c.id === crop.preferredCentreId);
          return (
            <Card key={crop.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-status-normal-soft">
                      <Sprout className="size-5 text-primary" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold">{crop.type}</h2>
                      <p className="text-sm text-muted-foreground">
                        {crop.quantity} {crop.unit}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={crop.status === "Slot Confirmed" ? "normal" : "high"}
                    label={crop.status}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Expected selling date</dt>
                    <dd className="font-semibold">{crop.expectedDate || "—"}</dd>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">Preferred centre</dt>
                    <dd className="font-semibold">{centre?.name ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="mt-4 w-full">
            <Plus className="size-4" /> {t("addCrop")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop Registration</DialogTitle>
            <DialogDescription>Demonstration form — data stays on this device.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Crop type</Label>
              <Select
                defaultValue={form.getValues("type")}
                onValueChange={(v) => form.setValue("type", v, { shouldValidate: true })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  {["Wheat", "Paddy", "Gram", "Mustard", "Sugarcane"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={form.formState.errors.type?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min={1} {...form.register("quantity")} />
                <FieldError message={form.formState.errors.quantity?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  defaultValue={form.getValues("unit")}
                  onValueChange={(v) => form.setValue("unit", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quintals">Quintals</SelectItem>
                    <SelectItem value="Tonnes">Tonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedDate">Expected selling date</Label>
              <Input id="expectedDate" type="date" {...form.register("expectedDate")} />
              <FieldError message={form.formState.errors.expectedDate?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="centre">Preferred centre</Label>
              <Select
                defaultValue={form.getValues("preferredCentreId")}
                onValueChange={(v) => form.setValue("preferredCentreId", v, { shouldValidate: true })}
              >
                <SelectTrigger id="centre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <Label htmlFor="transport">Transport available</Label>
              <Switch
                id="transport"
                defaultChecked
                onCheckedChange={(v) => form.setValue("transportAvailable", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lang">Preferred language</Label>
              <Select
                defaultValue={form.getValues("language")}
                onValueChange={(v) => form.setValue("language", v)}
              >
                <SelectTrigger id="lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.native}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Save crop
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </FarmerShell>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
