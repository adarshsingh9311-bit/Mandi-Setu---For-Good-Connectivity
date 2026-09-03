import { cn } from "@/lib/utils";
import type { CentreStatus } from "@/data/mockData";

const map: Record<CentreStatus, { label: string; className: string }> = {
  normal: { label: "Available", className: "bg-status-normal-soft text-status-normal" },
  high: { label: "High Load", className: "bg-status-high-soft text-status-high-foreground" },
  over: { label: "Overloaded", className: "bg-status-over-soft text-status-over" },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: CentreStatus;
  label?: string | undefined;
  className?: string;
}) {
  const cfg = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        cfg.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label ?? cfg.label}
    </span>
  );
}
