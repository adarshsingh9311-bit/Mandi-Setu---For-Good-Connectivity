import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/government/login")({
  component: GovernmentLoginRedirect,
});
function GovernmentLoginRedirect() {
  const user = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({
      to: "/admin/$section",
      params: { section: user.role === "operator" ? "queue" : "dashboard" },
      replace: true,
    });
  }, [navigate, user.role]);
  return (
    <p role="status" className="p-8">
      Opening government workspace…
    </p>
  );
}
