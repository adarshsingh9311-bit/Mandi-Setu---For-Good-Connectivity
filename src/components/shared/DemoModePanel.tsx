import { useState } from "react";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDemo, type ScenarioId } from "@/lib/demoStore";
import { cn } from "@/lib/utils";

const scenarios: { id: ScenarioId; title: string; detail: string }[] = [
  { id: "overload", title: "1 — Centre Overload", detail: "Mandi A: Normal → Overloaded (174%)" },
  { id: "weather", title: "2 — Weather Delay", detail: "Normal ETA → Delayed ETA" },
  { id: "vehicle", title: "3 — Vehicle Problem", detail: "On-time → Missed slot risk" },
  {
    id: "alternative",
    title: "5 — Alternative Mandi",
    detail: "Mandi A overloaded → Mandi B recommended",
  },
];

export function DemoModePanel() {
  const { demoMode, toggleDemoMode, activeScenarios, runScenario, resetDemo } = useDemo();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-24 z-50 md:bottom-6">
      {open && (
        <div className="mb-3 w-[19rem] rounded-2xl border border-border bg-card p-4 shadow-float">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold">SIH Demo Mode</h2>
              <p className="text-xs text-muted-foreground">
                Drive the prototype with local scenarios.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close demo panel"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <Label htmlFor="demo-mode" className="text-sm font-medium">
              Enable Demo Mode
            </Label>
            <Switch id="demo-mode" checked={demoMode} onCheckedChange={toggleDemoMode} />
          </div>

          <div className={cn("mt-3 space-y-2", !demoMode && "pointer-events-none opacity-50")}>
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => runScenario(s.id)}
                className={cn(
                  "w-full rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent",
                  activeScenarios.includes(s.id) && "border-primary bg-status-normal-soft",
                )}
              >
                <p className="text-xs font-semibold">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.detail}</p>
              </button>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={resetDemo}>
              <RotateCcw className="size-3.5" /> Reset scenarios
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full shadow-float"
        aria-expanded={open}
        aria-label="Toggle SIH demo mode panel"
      >
        <FlaskConical className="size-4" />
        SIH Demo
      </Button>
    </div>
  );
}
