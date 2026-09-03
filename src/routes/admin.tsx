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
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
        className={`${open ? "block" : "hidden"} fixed inset-y-0 left-0 z-40 w-64 bg-[#123d32] text-white lg:block`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 p-6">
          <Building2 className="size-9 text-emerald-300" />
          <div>
            <p className="text-xl font-bold tracking-tight">MandiSetu</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-emerald-200">
              Government operations
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
        <nav aria-label="Government navigation" className="space-y-1 p-3">
          {visible.map(([key, label, Icon]) => (
            <Link
              key={key}
              to="/admin/$section"
              params={{ section: key }}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${path.endsWith("/" + key) ? "bg-white/15 font-semibold text-white" : "text-emerald-100/80 hover:bg-white/10"}`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 px-6 text-xs text-emerald-100/70">
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
