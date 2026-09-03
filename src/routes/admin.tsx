import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  Users,
  ListOrdered,
  CalendarClock,
  Wheat,
  ChartNoAxesCombined,
  Bell,
  FileText,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import "@/components/government/government.css";
export const Route = createFileRoute("/admin")({ component: AdminShell });
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["mandis", "Mandis", Building2],
  ["queue", "Queue", ListOrdered],
  ["farmers", "Farmers", Users],
  ["slots", "Slots", CalendarClock],
  ["procurement", "Procurement", Wheat],
  ["analytics", "Analytics", ChartNoAxesCombined],
  ["notifications", "Notifications", Bell],
  ["reports", "Reports", FileText],
  ["settings", "Settings", Settings],
] as const;
function AdminShell() {
  const user = useAuth();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const visible = nav.filter(
    ([key]) => user.role !== "operator" || ["queue", "mandis", "slots"].includes(key),
  );
  return (
    <div className="government-workspace min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b bg-white p-4 lg:hidden">
        <span className="font-bold">MandiSetu · Operations</span>
        <Button
          variant="outline"
          size="icon"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      <aside
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 p-6">
          <Building2 className="size-9 text-blue-300" />
          <div>
            <p className="text-xl font-bold tracking-tight">MandiSetu</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-blue-200">
              Procurement operations
            </p>
          </div>
          <button
            className="ml-auto lg:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Government navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {visible.map(([key, label, Icon]) => (
            <Link
              key={key}
              to="/admin/$section"
              params={{ section: key }}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${path.endsWith("/" + key) ? "bg-sidebar-primary font-semibold text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"}`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-6 text-xs text-sidebar-foreground/70">
          <p className="font-semibold">{user.username}</p>
          <p className="mt-1">
            {user.role === "operator"
              ? "Assigned mandi operator"
              : user.role === "super_admin"
                ? "Super administrator"
                : "Government officer"}
          </p>
          <p className="mt-4">Shared procurement database</p>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="p-4 sm:p-7 lg:ml-64 lg:p-9">
        <Outlet />
      </main>
    </div>
  );
}
