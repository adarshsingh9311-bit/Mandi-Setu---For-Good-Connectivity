import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <div>
              {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={cn("min-w-0 flex-1 p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
