import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, Sprout, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./DemoBadge";

const roles = [
  { to: "/farmer", label: "Farmer", icon: Sprout },
  { to: "/operator", label: "Centre Operator", icon: Building2 },
  { to: "/gov", label: "Government", icon: ShieldCheck },
] as const;

export function RoleSwitcher({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
        {roles.map((r) => {
          const active = pathname.startsWith(r.to);
          return (
            <Link
              key={r.to}
              to={r.to}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              <r.icon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{r.label}</span>
            </Link>
          );
        })}
      </div>
      <DemoBadge />
    </div>
  );
}
