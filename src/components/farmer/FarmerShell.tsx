import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Sprout, Warehouse, Route as RouteIcon, User, Bell, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useDemo } from "@/lib/demoStore";

const nav = [
  { to: "/farmer", key: "home", icon: Home, exact: true },
  { to: "/farmer/crop", key: "myCrop", icon: Sprout, exact: false },
  { to: "/farmer/procurement", key: "procurement", icon: Warehouse, exact: false },
  { to: "/farmer/track", key: "track", icon: RouteIcon, exact: false },
  { to: "/farmer/profile", key: "profile", icon: User, exact: false },
] as const;

export function FarmerShell({
  title,
  back,
  children,
}: {
  title?: string;
  back?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { unreadCount } = useDemo();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-24">
      {title && (
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          {back && (
            <Link
              to={back}
              aria-label="Go back"
              className="inline-flex size-9 items-center justify-center rounded-full hover:bg-accent"
            >
              <ChevronLeft className="size-5" />
            </Link>
          )}
          <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
          <Link
            to="/farmer/notifications"
            aria-label={`${t("notifications")}${unreadCount ? `, ${unreadCount} unread` : ""}`}
            className="relative inline-flex size-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-status-over" aria-hidden="true" />
            )}
          </Link>
        </header>
      )}

      <main className="px-4 py-4">{children}</main>

      <nav
        aria-label="Farmer navigation"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl items-stretch justify-around border-t border-border bg-card px-1 pt-1 pb-[env(safe-area-inset-bottom)]"
      >
        {nav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:bg-accent",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn("size-5", active && "scale-110")} aria-hidden="true" />
              <span className="text-center leading-tight">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
