import { useAuth } from "@/lib/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  centres as fallbackCentres,
  currentFarmer,
  journeySteps,
  type AppNotification,
  type Crop,
  type ProcurementCentre,
} from "@/data/mockData";
import { notificationService } from "@/services/notificationService";
import { farmerService, type FarmerProfile, type CropInput } from "@/services/farmerService";
import { mandiService, statusFromLoad } from "@/services/mandiService";
import { procurementService, type SavedBooking } from "@/services/procurementService";

export type ScenarioId = "overload" | "weather" | "vehicle" | "alternative";

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
  savedBooking: SavedBooking | null;
  bookingError: string | null;
  reloadBooking: () => Promise<void>;

  crops: Crop[];
  farmer: FarmerProfile;
  farmerLoading: boolean;
  farmerError: string | null;
  reloadFarmer: () => Promise<void>;
  addCrop: (c: CropInput) => Promise<void>;

  journeyIndex: number;
  advanceJourney: () => void;
  journey: typeof journeySteps;

  etaMinutesLate: number;
  notificationError: string | null;
  reloadNotifications: () => Promise<void>;
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  pushNotification: (n: AppNotification) => void;
}

const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const user = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<ScenarioId[]>([]);
  const [sourceCentres, setSourceCentres] = useState<ProcurementCentre[]>(fallbackCentres);
  const [loadOverrides, setLoadOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    void mandiService.listCentres().then(setSourceCentres);
  }, []);
  const [booking, setBooking] = useState<Booking>({
    centreId: "mandi-a",
    slot: "—",
    status: "Not booked",
  });
  const [savedBooking, setSavedBooking] = useState<SavedBooking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const reloadBooking = useCallback(async () => {
    try {
      setSavedBooking(await procurementService.getBooking());
      setBookingError(null);
    } catch {
      setBookingError("Could not load your saved booking.");
    }
  }, []);
  useEffect(() => {
    if (user.role === "farmer") void reloadBooking();
  }, [reloadBooking, user.role]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [farmer, setFarmer] = useState<FarmerProfile>({
    ...currentFarmer,
    id: user.id,
    name: user.username,
    village: "",
    district: "",
    state: "",
    mobile: "",
    transport: "",
    history: [],
  });
  const [farmerLoading, setFarmerLoading] = useState(true);
  const [farmerError, setFarmerError] = useState<string | null>(null);
  const reloadFarmer = useCallback(async () => {
    setFarmerLoading(true);
    setFarmerError(null);
    try {
      const [profile, savedCrops] = await Promise.all([
        farmerService.getProfile(),
        farmerService.listCrops(),
      ]);
      setFarmer(profile);
      setCrops(savedCrops);
    } catch {
      setFarmerError("Could not load your farmer data. Please check the connection and retry.");
    } finally {
      setFarmerLoading(false);
    }
  }, []);
  useEffect(() => {
    if (user.role === "farmer") void reloadFarmer();
  }, [reloadFarmer, user.role]);
  const [journeyIndex, setJourneyIndex] = useState(3);
  const [etaMinutesLate, setEtaMinutesLate] = useState(0);
  const [savedNotifications, setSavedNotifications] = useState<AppNotification[]>([]);
  const [demoNotifications, setDemoNotifications] = useState<AppNotification[]>([]);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const notifications = useMemo(
    () => [...demoNotifications, ...savedNotifications],
    [demoNotifications, savedNotifications],
  );
  const reloadNotifications = useCallback(async () => {
    try {
      setSavedNotifications(await notificationService.list());
      setNotificationError(null);
    } catch {
      setNotificationError("Could not load notifications. Please retry.");
    }
  }, []);
  useEffect(() => {
    if (user.role !== "farmer") return;
    void reloadNotifications();
    const timer = setInterval(() => void reloadNotifications(), 10000);
    return () => clearInterval(timer);
  }, [reloadNotifications, user.role]);
  const markRead = useCallback(
    async (id: string) => {
      if (id.startsWith("n-")) {
        setDemoNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        return;
      }
      try {
        await notificationService.markRead(id);
        await reloadNotifications();
      } catch {
        setNotificationError("Could not mark notification read. Please retry.");
      }
    },
    [reloadNotifications],
  );
  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setDemoNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await reloadNotifications();
    } catch {
      setNotificationError("Could not mark notifications read. Please retry.");
    }
  }, [reloadNotifications, user.role]);

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
    setDemoNotifications((prev) => [n, ...prev]);
  }, []);

  const runScenario = useCallback(
    (id: ScenarioId) => {
      setActiveScenarios((prev) => (prev.includes(id) ? prev : [...prev, id]));
      if (id === "overload" || id === "alternative") {
        setLoadOverrides((prev) => ({ ...prev, "mandi-a": 174 }));
        pushNotification(
          notificationService.create(
            "centre",
            "Centre Alert",
            "Mandi A has become overloaded (174% load).",
          ),
        );
      }
      if (id === "weather") {
        setEtaMinutesLate(65);
        pushNotification(
          notificationService.create(
            "weather",
            "Weather Alert",
            "Heavy rainfall may affect your route to Mandi A.",
          ),
        );
      }
      if (id === "vehicle") {
        setEtaMinutesLate(72);
        pushNotification(
          notificationService.create(
            "recovery",
            "Slot Risk",
            "Vehicle problem reported — you may miss your slot.",
          ),
        );
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
        setJourneyIndex(3);
        setDemoNotifications([]);
      },
      centres,
      booking,
      setBooking,
      savedBooking,
      bookingError,
      reloadBooking,
      crops,
      farmer,
      farmerLoading,
      farmerError,
      reloadFarmer,
      addCrop: async (c) => {
        const saved = await farmerService.addCrop(c);
        setCrops((prev) => [...prev, saved]);
      },
      journeyIndex,
      advanceJourney: () => setJourneyIndex((i) => Math.min(journeySteps.length - 1, i + 1)),
      journey: journeySteps,
      etaMinutesLate,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead,
      markAllRead,
      notificationError,
      reloadNotifications,
      pushNotification,
    }),
    [
      demoMode,
      activeScenarios,
      runScenario,
      centres,
      booking,
      savedBooking,
      bookingError,
      reloadBooking,
      crops,
      farmer,
      farmerLoading,
      farmerError,
      reloadFarmer,
      journeyIndex,
      etaMinutesLate,
      notifications,
      markRead,
      markAllRead,
      notificationError,
      reloadNotifications,
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
