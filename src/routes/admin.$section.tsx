import { createFileRoute } from "@tanstack/react-router";
import { Mandis } from "@/components/admin/Overview";
import { CommandCentre } from "@/components/government/CommandCentre";
import { QueueManagement, SlotManagement, FarmerManagement } from "@/components/admin/Management";
import { Monitoring, Notifications, Reports, Settings } from "@/components/admin/Insights";
import { Predictions } from "@/components/admin/Predictions";
export const Route = createFileRoute("/admin/$section")({ component: AdminPage });
const pages = {
  dashboard: ["Procurement Command Centre", CommandCentre],
  mandis: ["Mandi management", Mandis],
  queue: ["Live procurement queue", QueueManagement],
  slots: ["Slot management", SlotManagement],
  farmers: ["Farmer management", FarmerManagement],
  procurement: ["Procurement monitoring", Monitoring],
  analytics: [
    "Waiting-time analytics",
    () => (
      <div className="space-y-6">
        <Predictions />
        <Monitoring waiting />
      </div>
    ),
  ],
  notifications: ["Notifications", Notifications],
  reports: ["Reports", Reports],
  settings: ["Settings", Settings],
} as const;
function AdminPage() {
  const { section } = Route.useParams();
  const page = pages[section as keyof typeof pages];
  if (!page) return <p>Page not found.</p>;
  const [title, Component] = page;
  return (
    <>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
          MandiSetu · Procurement operations
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      </header>
      <Component />
    </>
  );
}
