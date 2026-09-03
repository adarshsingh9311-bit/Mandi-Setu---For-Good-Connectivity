import { Link } from "@tanstack/react-router";
import { Building2, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, workspaceFor } from "@/lib/auth";

export function RoleSwitcher({ className }: { className?: string }) {
  const user = useAuth();
  const operator = user.role !== "farmer";
  const Icon = operator ? Building2 : Sprout;
  return (
    <nav aria-label="My workspace" className={cn("flex items-center", className)}>
      <Link
        {...workspaceFor(user)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold"
      >
        <Icon className="size-4" aria-hidden="true" />
        {operator ? "Centre operations" : "Farmer workspace"}
      </Link>
    </nav>
  );
}
