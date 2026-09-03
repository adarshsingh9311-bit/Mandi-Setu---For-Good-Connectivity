import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/government/login")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/$section", params: { section: "dashboard" } });
  },
});
