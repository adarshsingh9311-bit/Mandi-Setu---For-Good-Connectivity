// Mock implementation — API ready.
import { initialNotifications, type AppNotification } from "@/data/mockData";

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    return initialNotifications;
  },
  create(kind: AppNotification["kind"], title: string, body: string): AppNotification {
    return {
      id: `n-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      kind,
      title,
      body,
      time: "Just now",
      read: false,
    };
  },
};
