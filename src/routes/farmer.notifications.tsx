import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, CloudRain, ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { FarmerShell } from "@/components/farmer/FarmerShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/lib/demoStore";

export const Route = createFileRoute("/farmer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — KisanSetu" },
      {
        name: "description",
        content: "Stay up to date on centre alerts, slots and procurement recovery.",
      },
      { property: "og:title", content: "Notifications — KisanSetu" },
      {
        property: "og:description",
        content: "Stay up to date on centre alerts, slots and procurement recovery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});
function NotificationsPage() {
  const { notifications, markRead, markAllRead, notificationError, reloadNotifications } =
    useDemo();
  return (
    <FarmerShell title="Notifications" back="/farmer">
      {notificationError && (
        <p role="alert">
          {notificationError}
          <Button onClick={() => void reloadNotifications()}>Retry</Button>
        </p>
      )}
      {!notifications.length && !notificationError && <p>No notifications yet.</p>}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {notifications.filter((item) => !item.read).length} unread updates
        </p>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck /> Mark all read
        </Button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={!notification.read ? "border-primary/30 bg-status-normal-soft/40" : ""}
          >
            <CardContent className="flex gap-3 p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                {notification.kind === "weather" ? (
                  <CloudRain className="size-5" />
                ) : notification.kind === "centre" ? (
                  <MapPin className="size-5" />
                ) : notification.kind === "recovery" ? (
                  <RefreshCw className="size-5" />
                ) : (
                  <Bell className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">{notification.title}</h2>
                  {!notification.read && (
                    <span
                      className="mt-1 size-2 shrink-0 rounded-full bg-status-over"
                      aria-label="Unread"
                    />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {notification.id.startsWith("n-")
                      ? notification.time
                      : new Date(notification.time).toLocaleString()}
                  </p>
                  {!notification.read && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => markRead(notification.id)}
                    >
                      Mark read <ExternalLink />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </FarmerShell>
  );
}
