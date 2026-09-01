import { cn } from "@/lib/utils";

export function DemoBadge({ label = "SIH DEMO", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-status-info/30 bg-status-info-soft px-2 py-0.5 text-[10px] font-bold tracking-widest text-status-info uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function DemoDataNote({ className, text }: { className?: string; text?: string }) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      {text ?? "SIH Prototype — Demonstration Data. Not connected to government databases."}
    </p>
  );
}
