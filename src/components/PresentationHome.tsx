import {
  ArrowRight,
  Building2,
  CalendarClock,
  Database,
  Leaf,
  ListOrdered,
  ShieldCheck,
  Sprout,
  Timer,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PresentationHome() {
  return (
    <div className="min-h-screen bg-[#f7faf7] text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3 font-bold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white">
            <Leaf className="size-5" />
          </span>
          <span className="text-xl tracking-tight">
            MandiSetu
            <span className="block text-[10px] font-medium uppercase tracking-[.18em] text-slate-500">
              One harvest. One connected journey.
            </span>
          </span>
        </Link>
        <a href="#walkthrough" className="text-sm font-semibold text-emerald-800">
          Presentation guide <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#103e32] px-6 py-10 text-white sm:p-12">
          <div
            className="absolute -right-24 -top-24 size-80 rounded-full border-[50px] border-white/5"
            aria-hidden="true"
          />
          <p className="relative inline-flex rounded-full border border-emerald-200/25 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-100">
            Smart India Hackathon · Working prototype
          </p>
          <h1 className="relative mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Less time in queues.
            <br />
            <span className="text-emerald-200">More certainty for farmers.</span>
          </h1>
          <p className="relative mt-5 max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg">
            One website connects farmers with mandi teams: book procurement slots, follow live
            queues, and coordinate capacity across centres.
          </p>
          <div className="relative mt-7 flex flex-wrap gap-3 text-xs text-emerald-50">
            {[
              [CalendarClock, "Planned arrivals"],
              [ListOrdered, "Live queue tracking"],
              [Timer, "Measured waiting time"],
            ].map(([Icon, label]) => {
              const Symbol = Icon as typeof Timer;
              return (
                <span
                  key={String(label)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"
                >
                  <Symbol className="size-4" />
                  {String(label)}
                </span>
              );
            })}
          </div>
        </section>
        <section id="workspaces" className="py-9" aria-labelledby="workspaces-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Two perspectives. One system.
              </p>
              <h2 id="workspaces-heading" className="mt-2 text-2xl font-bold">
                Choose your dashboard
              </h2>
            </div>
            <p className="max-w-sm text-sm text-slate-500">
              Open both portals in separate tabs to demonstrate how a saved change reaches the other
              side.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <Sprout className="size-7" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                  For farmers
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-bold">Farmer Dashboard</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Plan your visit and follow your crop from registration to procurement.
              </p>
              <ul className="my-6 space-y-3 text-sm">
                {[
                  "Register crops and choose a mandi",
                  "Book an available procurement slot",
                  "Track your token and queue progress",
                  "Report delays and confirm recovery options",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1 text-emerald-600">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="mt-auto w-full bg-emerald-800 text-white hover:bg-emerald-900"
              >
                <Link to="/farmer" target="_blank" rel="noopener noreferrer">
                  Open Farmer Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Sign in or create a farmer account · Opens in a new tab
              </p>
            </article>
            <article className="flex flex-col rounded-2xl border border-blue-100 bg-[#132338] p-6 text-white shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-blue-400/15 p-3 text-blue-200">
                  <Building2 className="size-7" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                  For government & mandi teams
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-bold">Government Dashboard</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Monitor procurement and help farmers move through the mandi efficiently.
              </p>
              <ul className="my-6 space-y-3 text-sm text-slate-100">
                {[
                  "Monitor mandi workload and waiting times",
                  "Manage queues and slot capacity",
                  "Review procurement and farmer recovery",
                  "Identify overloaded centres and alternatives",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1 text-blue-300">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                className="mt-auto w-full bg-blue-500 text-white hover:bg-blue-600"
              >
                <Link
                  to="/admin/$section"
                  params={{ section: "dashboard" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Government Dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-slate-300">
                Use your assigned staff account · Opens in a new tab
              </p>
            </article>
          </div>
        </section>
        <section
          className="flex flex-col items-center justify-between gap-5 rounded-2xl border bg-white p-6 text-center sm:flex-row sm:text-left"
          aria-label="Connected platform"
        >
          <div className="flex items-center gap-3">
            <Users className="size-7 text-emerald-700" />
            <p className="font-semibold">Farmer actions</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-5 py-4">
            <Database className="size-6 text-blue-700" />
            <div>
              <p className="font-semibold">One shared backend & database</p>
              <p className="mt-1 text-xs text-slate-500">
                Saved bookings, queue updates and recovery decisions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-7 text-blue-700" />
            <p className="font-semibold">Government operations</p>
          </div>
        </section>
        <section id="walkthrough" className="pt-10" aria-labelledby="walkthrough-heading">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            SIH presentation walkthrough
          </p>
          <h2 id="walkthrough-heading" className="mt-2 text-2xl font-bold">
            Show one farmer's complete journey
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Register", "On the farmer side, register a crop and choose an eligible mandi."],
              ["Book", "Reserve an available slot. Show the same booking in the government queue."],
              [
                "Check in",
                "Join the queue as the farmer. Show the waiting visit on the government side.",
              ],
              [
                "Process",
                "Use government queue management to move through quality check and procurement.",
              ],
              [
                "Verify",
                "Return to the farmer tab and show the updated token status after refresh.",
              ],
            ].map(([title, body], i) => (
              <li key={title} className="rounded-xl border bg-white p-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-slate-500">
            Use separate farmer and authorized staff accounts. Changes persist; this walkthrough
            does not create sample records automatically.
          </p>
        </section>
        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs text-slate-500">
          <span>MandiSetu · SIH procurement coordination prototype</span>
          <span>Rule-based estimates · Not connected to external government systems</span>
        </footer>
      </main>
    </div>
  );
}
