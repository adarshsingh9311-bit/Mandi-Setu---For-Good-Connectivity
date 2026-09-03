import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminService } from "@/services/adminService";
export function useAdmin<T>(path: string, params: Record<string, string> = {}) {
  return useQuery({
    queryKey: ["admin", path, params],
    queryFn: () => adminService.get<T>(path, params),
    refetchInterval: 10000,
    retry: false,
  });
}
export function useAdminMutation<T>(fn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["live-queue"] }),
        client.invalidateQueries({ queryKey: ["booking-slots"] }),
      ]);
    },
  });
}
export function LoadState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => unknown;
}) {
  if (pending)
    return (
      <p role="status" className="p-6 text-muted-foreground">
        Loading live records…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <p>{error.message}</p>
        <Button variant="outline" className="mt-2" onClick={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  return null;
}
export function Table<T>({
  rows,
  columns,
  empty = "No matching records yet.",
}: {
  rows: T[];
  columns: { label: string; render: (row: T) => ReactNode }[];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.label} className="whitespace-nowrap px-4 py-3 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/70 hover:bg-muted/30">
              {columns.map((c) => (
                <td key={c.label} className="px-4 py-3 align-top">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-8 text-center text-muted-foreground">{empty}</p>}
    </div>
  );
}
export function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-3 text-3xl font-bold tracking-tight">
          {value === null ? "—" : value}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        </p>
        {value === null && <p className="mt-1 text-xs text-muted-foreground">Not recorded yet</p>}
      </CardContent>
    </Card>
  );
}
export function Status({ value }: { value: string }) {
  const tone =
    value === "Overloaded"
      ? "bg-red-50 text-red-800"
      : value === "Busy" || value === "Waiting"
        ? "bg-amber-50 text-amber-800"
        : value === "Closed" || value === "Cancelled" || value === "Missed"
          ? "bg-slate-100 text-slate-600"
          : "bg-emerald-50 text-emerald-800";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}
export const duration = (n: number | null) => (n === null ? "Not recorded" : `${n} min`);
export const timestamp = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Not recorded";
export const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
