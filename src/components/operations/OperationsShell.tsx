import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bell, Building2, ClipboardList, Leaf, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";

const operatorNav = [{ to: "/operator", label: "Operations", icon: Activity }, { to: "/farmer/queue", label: "Live queue", icon: ClipboardList } ] as const;
const govNav = [
  { to: "/gov", label: "Overview", icon: Activity },
  { to: "/gov/centres", label: "Centres", icon: Building2 },
  { to: "/gov/queues", label: "Live queues", icon: ClipboardList },
  { to: "/gov/farmers", label: "Farmers", icon: Users },
  { to: "/gov/analytics", label: "Analytics", icon: Leaf },
  { to: "/gov/disruptions", label: "Disruptions", icon: Bell },
  { to: "/gov/recovery", label: "Recovery", icon: ShieldCheck },
  { to: "/gov/settings", label: "Settings", icon: Settings },
] as const;

export function OperationsShell({ children, title, area = "gov" }: { children: ReactNode; title: string; area?: "gov" | "operator" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = area === "gov" ? govNav : operatorNav;
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-8"><Link to="/" className="flex items-center gap-2 font-bold"><span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Leaf className="size-5" /></span><span className="hidden sm:inline">KisanSetu</span></Link><div className="flex items-center gap-3"><DemoBadge /><RoleSwitcher /></div></div></header>
    <div className="mx-auto flex max-w-[1440px]">
      <aside className="hidden w-60 shrink-0 border-r border-border px-4 py-6 lg:block"><p className="px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{area === "gov" ? "Command centre" : "Centre operations"}</p><nav className="mt-4 space-y-1" aria-label="Workspace navigation">{nav.map((item) => <Link key={item.to} to={item.to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors", pathname === item.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><item.icon className="size-4" />{item.label}</Link>)}</nav></aside>
      <main className="min-w-0 flex-1 px-5 py-6 pb-12 lg:px-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">{area === "gov" ? "Network view" : "Mandi A · Meerut"}</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1></div><div className="hidden rounded-lg border border-border bg-card px-3 py-2 text-right sm:block"><p className="text-xs text-muted-foreground">Last synced</p><p className="text-sm font-semibold">Just now</p></div></div>{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card px-2 py-1 lg:hidden" aria-label="Mobile workspace navigation">{nav.slice(0, 5).map((item) => <Link key={item.to} to={item.to} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold", pathname === item.to ? "text-primary" : "text-muted-foreground")}><item.icon className="size-4" />{item.label}</Link>)}</nav>
  </div>;
}