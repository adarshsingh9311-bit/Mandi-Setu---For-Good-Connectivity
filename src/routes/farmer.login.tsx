import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/farmer/login")({
  beforeLoad: () => {
    throw redirect({ to: "/farmer" });
  },
});
