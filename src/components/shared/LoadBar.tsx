import { cn } from "@/lib/utils";
import type { CentreStatus } from "@/data/mockData";

const barColor = {
  normal: "bg-status-normal",
  high: "bg-status-high",
  over: "bg-status-over",
} as const;

export function LoadBar({
  value,
  status,
  className,
}: {
  value: number;
  status: CentreStatus;
  className?: string;
}) {
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={200}
      aria-label={`Centre load ${value} percent`}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", barColor[status])}
        style={{ width: `${Math.min(100, (value / 200) * 100)}%` }}
      />
    </div>
  );
}
