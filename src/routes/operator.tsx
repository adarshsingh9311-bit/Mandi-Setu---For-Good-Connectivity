import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Pause, Play, Users, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { OperationsShell } from "@/components/operations/OperationsShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadBar } from "@/components/shared/LoadBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDemo } from "@/lib/demoStore";
import { farmers } from "@/data/mockData";

export const Route = createFileRoute("/operator")({
  head: () => ({ meta: [{ title: "Centre Operations — KisanSetu" }, { name: "description", content: "Run a live procurement centre with clear queue and counter controls." }, { property: "og:title", content: "Centre Operations — KisanSetu" }, { property: "og:description", content: "Run a live procurement centre with clear queue and counter controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: OperatorPage,
});

function OperatorPage() {
  const { centres, queue, advanceQueue } = useDemo();
  const [paused, setPaused] = useState(false);
  const centre = centres[0];
  const waiting = farmers.filter((farmer) => farmer.status === "Waiting").slice(0, 5);
  if (!centre) return null;
  return <OperationsShell title="Centre operations" area="operator">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="Farmers waiting" value={String(centre.farmersWaiting)} tone="text-status-high-foreground" />
      <Metric icon={Warehouse} label="Centre load" value={`${centre.loadPercent}%`} tone="text-primary" />
      <Metric icon={Play} label="Active counters" value={String(centre.activeCounters)} tone="text-status-info" />
      <Metric icon={CheckCircle2} label="Processed today" value="164" tone="text-primary" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">Mandi A — Meerut Krishi Upaj</p><h2 className="mt-1 text-xl font-bold">Live floor status</h2></div><StatusBadge status={centre.status} /></div><div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Utilisation</span><span className="font-bold">{centre.loadPercent}%</span></div><LoadBar value={centre.loadPercent} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Counter label="Counter 01" status="Serving" /><Counter label="Counter 02" status="Serving" /><Counter label="Counter 03" status={paused ? "Paused" : "Ready"} /></div><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => { setPaused((value) => !value); toast.success(paused ? "Counter resumed" : "Counter paused"); }}>{paused ? <Play /> : <Pause />}{paused ? "Resume counter" : "Pause counter"}</Button><Button variant="outline" onClick={() => { advanceQueue(); toast.success("Next farmer called"); }}><ArrowRight /> Call next farmer</Button></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Now serving</p><h2 className="mt-1 text-3xl font-bold">Token {queue.token}</h2></div><span className="rounded-full bg-status-normal-soft px-2.5 py-1 text-xs font-bold text-primary">Quality check</span></div><div className="mt-5 space-y-3">{waiting.map((farmer, index) => <div key={farmer.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"><div><p className="text-xs font-bold text-muted-foreground">#{index + 1} · {farmer.id}</p><p className="font-semibold">{farmer.name}</p></div><p className="text-sm text-muted-foreground">{farmer.crop} · {farmer.quantityQuintals} qtl</p></div>)}</div></CardContent></Card>
    </div>
  </OperationsShell>;
}
function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone: string }) { return <Card><CardContent className="p-4"><Icon className={`size-5 ${tone}`} /><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
function Counter({ label, status }: { label: string; status: string }) { return <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold"><span className="size-2 rounded-full bg-status-normal" />{status}</p></div>; }