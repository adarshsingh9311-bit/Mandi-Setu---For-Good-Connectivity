import { apiGet, apiRequest } from "@/lib/api";
export interface Mandi {
  lat: number;
  lng: number;
  id: string;
  name: string;
  district: string;
  state: string;
  capacity: number;
  queue: number;
  waitingMin: number | null;
  processingMin: number;
  processingRate: number;
  activeCounters: number;
  workload: number;
  availableSlots: number;
  status: string;
  crops: string[];
}
export interface Visit {
  id: string;
  bookingId: string | null;
  farmer_id: string;
  farmerName: string;
  centre_id: string;
  crop_type: string | null;
  quantity_quintals: number | null;
  actual_quantity_quintals: number | null;
  booking_day: string | null;
  slot_label: string | null;
  status: string;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  waitingMin: number | null;
  processingMin: number | null;
  position?: number;
}
export interface ManagedSlot {
  id: string;
  centreId: string;
  day: string;
  starts: string;
  ends: string;
  window: string;
  capacity: number;
  enabled: boolean;
  booked: number;
  remaining: number;
  available: boolean;
  bookings: { farmerId: string; name: string }[];
}
export interface SlotInput {
  centreId: string;
  day: string;
  slotId: string;
  starts: string;
  ends: string;
  capacity: number;
  enabled: boolean;
}
export interface Metrics {
  totalFarmers: number;
  scheduledToday: number;
  waiting: number;
  processedToday: number;
  procurementQuintals: number;
  quantityNotRecorded: number;
  averageWaitingMin: number | null;
  activeMandis: number;
  overloadedMandis: number;
}
export interface Analytics {
  totalQuintals: number;
  farmersCompleted: number;
  farmersWaiting: number;
  averageProcessingMin: number | null;
  averageWaitingMin: number | null;
  quantityNotRecorded: number;
  byCrop: { label: string; quintals: number }[];
  byMandi: { label: string; quintals: number }[];
  waitingByMandi: { mandi: string; averageWaitingMin: number | null; samples: number }[];
  longestWaiting: Visit[];
  trend: {
    day: string;
    arrivals: number;
    completed: number;
    netGrowth: number;
    averageWaitingMin: number | null;
    samples: number;
  }[];
  peakPeriods: { hour: string; arrivals: number; averageWaitingMin: number | null }[];
  processingRatePerHour: number;
  note: string;
}
export interface FarmerRow {
  id: string;
  name: string;
  village: string;
  district: string;
  crops: string[];
  visits: number;
  latestStatus: string;
}
export interface Alternate {
  id: string;
  name: string;
  distanceKm: number;
  waitingMin: number | null;
  availableCapacity: number;
  availableSlots: number;
  crops: string[];
  workload: number;
}
export interface StaffNotifications {
  events: { id: number; centre_id: string; kind: string; message: string; created_at: string }[];
  overloaded: Mandi[];
  delayReports: {
    id: string;
    reason: string;
    arrival: string;
    resolved: boolean;
    farmerName: string;
    centreId: string;
    originalSlot: string | null;
    newSlot: string | null;
    destinationCentreId: string | null;
    rescheduled: boolean;
    createdAt: string;
  }[];
}
export interface Thresholds {
  busyPercent: number;
  overloadedPercent: number;
}
export function queryString(values: Record<string, string>) {
  const q = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  return q.toString();
}
export const adminService = {
  get: <T>(path: string, params: Record<string, string> = {}) =>
    apiGet<T>(`/api/admin/${path}?${queryString(params)}`),
  mutate: <T>(path: string, method: "POST" | "PATCH", body: unknown) =>
    apiRequest<T>(`/api/admin/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};
export function indiaDay(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 86400000));
}
