import { CentreWaitEstimate } from "@/components/shared/AIPredictionCard";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Compass,
  MapPin,
  Sprout,
  CalendarClock,
  TriangleAlert,
} from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadBar } from "@/components/shared/LoadBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DemoDataNote } from "@/components/shared/DemoBadge";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { useDemo } from "@/lib/demoStore";
import { useI18n } from "@/lib/i18n";
import { queueService } from "@/services/queueService";

export const Route = createFileRoute("/farmer/")({
  component: FarmerHome,
});

const quickActions = [
  { to: "/farmer/crop", key: "myCrop", icon: Sprout },
  { to: "/farmer/procurement", key: "bookSlot", icon: CalendarClock },
  { to: "/farmer/alternatives", key: "findBetterCentre", icon: Compass },
  { to: "/farmer/report-delay", key: "reportDelay", icon: TriangleAlert },
  { to: "/farmer/ivr", key: "IVR demo", icon: Clock },
  { to: "/farmer/missed-slots", key: "Recover missed slot", icon: CalendarClock },
] as const;

function FarmerHome() {
  const { t } = useI18n();
  const { centres, savedBooking, bookingError, farmer: currentFarmer } = useDemo();
  const booking = savedBooking ?? {
    centreId: "mandi-a",
    slot: "—",
    status: bookingError ?? "Not booked",
  };
  const centre = centres.find((c) => c.id === booking.centreId) ?? centres[0]!;

  return (
    <FarmerShell>
      <div className="mb-4 flex items-center justify-between gap-2 pt-2">
        <Link to="/" className="text-sm font-bold text-primary">
          {t("appName")}
        </Link>
        <RoleSwitcher />
      </div>

      <header className="mb-4">
        <h1 className="text-2xl font-bold">
          {t("greeting")}, {currentFarmer.name.split(" ")[0]} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {currentFarmer.district}, {currentFarmer.state}
        </p>
      </header>

      <Card className="overflow-hidden border-0 bg-brand-gradient text-primary-foreground shadow-float">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm/5 opacity-90">{t("wheatProcurement")}</p>
              <h2 className="text-xl font-bold">{centre.name}</h2>
            </div>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
              {booking.status === "Confirmed" ? t("confirmed") : booking.status}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <dt className="text-xs opacity-90">{t("slot")}</dt>
              <dd className="text-lg font-bold">{booking.slot}</dd>
            </div>
            <div className="rounded-xl bg-primary-foreground/12 p-3">
              <dt className="text-xs opacity-90">{t("estimatedWaiting")}</dt>
              <dd className="text-lg font-bold">
                <CentreWaitEstimate centreId={centre.id} compact />
              </dd>
            </div>
          </dl>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="opacity-90">{t("centreLoad")}</span>
              <span className="font-bold">{centre.loadPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-foreground/20">
              <div
                className="h-full rounded-full bg-primary-foreground/90"
                style={{ width: `${Math.min(100, (centre.loadPercent / 200) * 100)}%` }}
              />
            </div>
          </div>

          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link to="/farmer/queue">
              <Clock className="size-4" /> {t("viewLiveQueue")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="mt-6" aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 text-base font-bold">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="card-surface flex min-h-24 flex-col justify-between p-4 transition-shadow hover:shadow-float"
            >
              <a.icon className="size-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">{t(a.key)}</span>
            </Link>
          ))}
        </div>
      </section>

      {centre.status !== "normal" && (
        <Card className="mt-6 border-status-high/40 bg-status-high-soft">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 size-5 text-status-high-foreground"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-bold">{t("centreLoadIncreased")}</h3>
                <p className="text-sm text-muted-foreground">{t("centreLoadIncreasedBody")}</p>
                <div className="mt-2">
                  <StatusBadge status={centre.status} label={centre.operationalStatus} />
                </div>
              </div>
            </div>
            <LoadBar value={centre.loadPercent} status={centre.status} />
            <Button asChild className="w-full" size="lg">
              <Link to="/farmer/alternatives">
                {t("checkAlternatives")} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <DemoDataNote className="mt-8" />
    </FarmerShell>
  );
}
