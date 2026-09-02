import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  centres as fallbackCentres,
  initialCrops,
  initialNotifications,
  journeySteps,
  type AppNotification,
  type Crop,
  type ProcurementCentre,
} from "@/data/mockData";
import { notificationService } from "@/services/notificationService";
import { mandiService, statusFromLoad } from "@/services/mandiService";

export type ScenarioId = "overload" | "weather" | "vehicle" | "queue" | "alternative";

interface Booking {
  centreId: string;
  slot: string;
  status: string;
}

interface DemoState {
  demoMode: boolean;
  toggleDemoMode: () => void;
  activeScenarios: ScenarioId[];
  runScenario: (id: ScenarioId) => void;
  resetDemo: () => void;

  centres: ProcurementCentre[];
  booking: Booking;
  setBooking: (b: Booking) => void;

  crops: Crop[];
  addCrop: (c: Crop) => void;

  queue: { token: string; farmersAhead: number; activeCounters: number; lastUpdated: string };
  advanceQueue: () => void;
  refreshQueue: () => void;

  journeyIndex: number;
  advanceJourney: () => void;
  journey: typeof journeySteps;

  etaMinutesLate: number;
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  pushNotification: (n: AppNotification) => void;
}

const DemoContext = createContext<DemoState | null>(null);

function nowLabel() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<ScenarioId[]>([]);
  const [sourceCentres, setSourceCentres] = useState<ProcurementCentre[]>(fallbackCentres);
  const [loadOverrides, setLoadOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    void mandiService.listCentres().then(setSourceCentres);
  }, []);
  const [booking, setBooking] = useState<Booking>({ centreId: "mandi-a", slot: "11:30 AM", status: "Confirmed" });
  const [crops, setCrops] = useState<Crop[]>(initialCrops);
  const [queue, setQueue] = useState({
    token: "#4582",
    farmersAhead: 18,
    activeCounters: 3,
    lastUpdated: "10:42 AM",
  });
  const [journeyIndex, setJourneyIndex] = useState(3);
  const [etaMinutesLate, setEtaMinutesLate] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  const centres = useMemo(
    () =>
      sourceCentres.map((c) => {
        const load = loadOverrides[c.id] ?? c.loadPercent;
        const factor = load / Math.max(c.loadPercent, 1);
        return {
          ...c,
          loadPercent: load,
          status: statusFromLoad(load),
          estimatedWaitMin: Math.round(c.estimatedWaitMin * factor),
          farmersWaiting: Math.round(c.farmersWaiting * factor),
        };
      }),
    [loadOverrides, sourceCentres],
  );

  const pushNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  const runScenario = useCallback(
    (id: ScenarioId) => {
      setActiveScenarios((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (id === "overload" || id === "alternative") {
        setLoadOverrides((prev) => ({ ...prev, "mandi-a": 174 }));
        pushNotification(
          notificationService.create("centre", "Centre Alert", "Mandi A has become overloaded (174% load)."),
        );
      }
      if (id === "weather") {
        setEtaMinutesLate(65);
        pushNotification(
          notificationService.create("weather", "Weather Alert", "Heavy rainfall may affect your route to Mandi A."),
        );
      }
      if (id === "vehicle") {
        setEtaMinutesLate(72);
        pushNotification(
          notificationService.create("recovery", "Slot Risk", "Vehicle problem reported — you may miss your slot."),
        );
      }
      if (id === "queue") {
        setQueue((q) => ({ ...q, farmersAhead: 10, lastUpdated: nowLabel() }));
      }
    },
    [pushNotification],
  );

  const value = useMemo<DemoState>(
    () => ({
      demoMode,
      toggleDemoMode: () => setDemoMode((d) => !d),
      activeScenarios,
      runScenario,
      resetDemo: () => {
        setActiveScenarios([]);
        setLoadOverrides({});
        setEtaMinutesLate(0);
        setQueue({ token: "#4582", farmersAhead: 18, activeCounters: 3, lastUpdated: "10:42 AM" });
        setJourneyIndex(3);
        setBooking({ centreId: "mandi-a", slot: "11:30 AM", status: "Confirmed" });
        setNotifications(initialNotifications);
      },
      centres,
      booking,
      setBooking,
      crops,
      addCrop: (c) => setCrops((prev) => [...prev, c]),
      queue,
      advanceQueue: () =>
        setQueue((q) => ({ ...q, farmersAhead: Math.max(0, q.farmersAhead - 1), lastUpdated: nowLabel() })),
      refreshQueue: () =>
        setQueue((q) => ({
          ...q,
          farmersAhead: Math.max(0, q.farmersAhead - 2),
          lastUpdated: nowLabel(),
        })),
      journeyIndex,
      advanceJourney: () => setJourneyIndex((i) => Math.min(journeySteps.length - 1, i + 1)),
      journey: journeySteps,
      etaMinutesLate,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead: (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      pushNotification,
    }),
    [
      demoMode,
      activeScenarios,
      runScenario,
      centres,
      booking,
      crops,
      queue,
      journeyIndex,
      etaMinutesLate,
      notifications,
      pushNotification,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
