import { apiGet, apiRequest } from "@/lib/api";
import { type AppNotification } from "@/data/mockData";

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    return apiGet<AppNotification[]>("/api/notifications");
  },
  markRead: (id: string) =>
    apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  markAllRead: () => apiRequest("/api/notifications/read-all", { method: "POST" }),
  create(kind: AppNotification["kind"], title: string, body: string): AppNotification {
    return {
      id: `n-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      kind,
      title: `Demo: ${title}`,
      body,
      time: "Just now",
      read: false,
    };
  },
};
