import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/farmer/login")({
  component: FarmerLoginRedirect,
});
function FarmerLoginRedirect() {
  useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/farmer", replace: true });
  }, [navigate]);
  return (
    <p role="status" className="p-8">
      Opening farmer workspace…
    </p>
  );
}
