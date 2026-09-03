import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { useAuth } from "@/lib/auth";
import { useDemo } from "@/lib/demoStore";

export function OperationsShell({ children, title }: { children: ReactNode; title: string }) {
  const user = useAuth();
  const { centres } = useDemo();
  const centre = centres.find((c) => c.id === user.centreId);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <Leaf className="size-5" />
            KisanSetu
          </Link>
          <RoleSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">{centre?.name ?? user.centreId}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
