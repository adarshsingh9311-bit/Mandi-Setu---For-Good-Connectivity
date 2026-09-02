import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CheckCircle2, Leaf, ShieldCheck, Sprout, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { DemoBadge, DemoDataNote } from "@/components/shared/DemoBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KisanSetu — Smarter Procurement" },
      { name: "description", content: "One connected view for crop procurement, live mandi queues and resilient recovery." },
      { property: "og:title", content: "KisanSetu — Smarter Procurement" },
      { property: "og:description", content: "One connected view for crop procurement, live mandi queues and resilient recovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          KisanSetu
        </Link>
        <RoleSwitcher />
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-hero-gradient px-6 py-12 text-primary-foreground shadow-float sm:px-10 lg:px-16 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <DemoBadge label="SIH 2026 PROTOTYPE" className="border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground" />
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">Every harvest deserves a clear path to market.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/80 sm:text-lg">
              KisanSetu brings farmers, procurement centres and government teams into one live operational picture.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/farmer"><Sprout className="size-4" /> Open farmer view <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" className="border border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
                <Link to="/gov"><ShieldCheck className="size-4" /> View command centre</Link>
              </Button>
            </div>
          </div>
          <div className="absolute right-8 bottom-8 hidden w-72 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-sm lg:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">Today, across the network</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><p className="text-2xl font-bold">18.4k</p><p className="text-xs text-primary-foreground/70">farmers served</p></div>
              <div><p className="text-2xl font-bold">250</p><p className="text-xs text-primary-foreground/70">centres connected</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-3" aria-labelledby="roles-heading">
          <div className="md:col-span-3"><p className="text-sm font-semibold text-primary">Choose your workspace</p><h2 id="roles-heading" className="mt-1 text-2xl font-bold">One system, three useful views.</h2></div>
          <WorkspaceCard to="/farmer" icon={Sprout} title="Farmer workspace" detail="Register crops, book a slot and follow your procurement journey." />
          <WorkspaceCard to="/operator" icon={Building2} title="Centre operations" detail="Keep counters moving and coordinate the next farmer in line." />
          <WorkspaceCard to="/gov" icon={ShieldCheck} title="Government command centre" detail="See network health, disruptions and recovery outcomes at a glance." />
        </section>

        <section className="grid gap-4 border-t border-border pt-8 sm:grid-cols-3">
          <Signal icon={TimerReset} title="Live queue visibility" detail="Know the wait before you travel." />
          <Signal icon={CheckCircle2} title="Consent-led recovery" detail="Farmers stay in control of every switch." />
          <Signal icon={Leaf} title="Grounded operations" detail="Built for real centre workflows." />
        </section>
        <DemoDataNote className="mt-10" />
      </main>
    </div>
  );
}

function WorkspaceCard({ to, icon: Icon, title, detail }: { to: "/farmer" | "/operator" | "/gov"; icon: typeof Sprout; title: string; detail: string }) {
  return <Card className="transition-shadow hover:shadow-float"><CardContent className="p-5"><Icon className="size-7 text-primary" aria-hidden="true" /><h3 className="mt-6 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p><Button asChild variant="link" className="mt-3 h-auto px-0"><Link to={to}>Open workspace <ArrowRight className="size-4" /></Link></Button></CardContent></Card>;
}

function Signal({ icon: Icon, title, detail }: { icon: typeof Sprout; title: string; detail: string }) {
  return <div className="flex gap-3"><span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-normal-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div></div>;
}
