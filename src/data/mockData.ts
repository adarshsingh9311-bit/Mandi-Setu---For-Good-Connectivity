// Demonstration data only — SIH 2026 prototype. Not connected to any government database.

export type CentreStatus = "normal" | "high" | "over";

export interface ProcurementCentre {
  id: string;
  name: string;
  district: string;
  state: string;
  distanceKm: number;
  crops: string[];
  capacityPerDay: number;
  farmersWaiting: number;
  activeCounters: number;
  processingRatePerHour: number;
  avgProcessingMin: number;
  loadPercent: number;
  estimatedWaitMin: number;
  status: CentreStatus;
  lat: number;
  lng: number;
}

export interface Farmer {
  id: string;
  name: string;
  village: string;
  district: string;
  crop: string;
  quantityQuintals: number;
  centreId: string;
  language: string;
  mobile: string;
  status: "Waiting" | "In Process" | "Completed" | "Scheduled";
}

export interface Crop {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  expectedDate: string;
  preferredCentreId: string;
  transportAvailable: boolean;
  status: string;
}

export interface AppNotification {
  id: string;
  kind: "centre" | "slot" | "weather" | "recovery";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export const centres: ProcurementCentre[] = [
  {
    id: "mandi-a",
    name: "Mandi A — Meerut Krishi Upaj",
    district: "Meerut",
    state: "Uttar Pradesh",
    distanceKm: 18,
    crops: ["Wheat", "Mustard", "Gram"],
    capacityPerDay: 420,
    farmersWaiting: 18,
    activeCounters: 3,
    processingRatePerHour: 26,
    avgProcessingMin: 7,
    loadPercent: 82,
    estimatedWaitMin: 47,
    status: "high",
    lat: 28.98,
    lng: 77.7,
  },
  {
    id: "mandi-b",
    name: "Mandi B — Sardhana Centre",
    district: "Meerut",
    state: "Uttar Pradesh",
    distanceKm: 23,
    crops: ["Wheat", "Paddy", "Gram"],
    capacityPerDay: 380,
    farmersWaiting: 9,
    activeCounters: 4,
    processingRatePerHour: 31,
    avgProcessingMin: 6,
    loadPercent: 58,
    estimatedWaitMin: 42,
    status: "normal",
    lat: 29.14,
    lng: 77.6,
  },
  {
    id: "mandi-c",
    name: "Mandi C — Mawana Centre",
    district: "Meerut",
    state: "Uttar Pradesh",
    distanceKm: 12,
    crops: ["Wheat", "Sugarcane"],
    capacityPerDay: 300,
    farmersWaiting: 26,
    activeCounters: 2,
    processingRatePerHour: 19,
    avgProcessingMin: 9,
    loadPercent: 108,
    estimatedWaitMin: 95,
    status: "high",
    lat: 29.1,
    lng: 77.92,
  },
  {
    id: "mandi-d",
    name: "Mandi D — Baghpat Centre",
    district: "Baghpat",
    state: "Uttar Pradesh",
    distanceKm: 34,
    crops: ["Wheat", "Mustard"],
    capacityPerDay: 260,
    farmersWaiting: 6,
    activeCounters: 3,
    processingRatePerHour: 24,
    avgProcessingMin: 6,
    loadPercent: 48,
    estimatedWaitMin: 28,
    status: "normal",
    lat: 28.94,
    lng: 77.22,
  },
  {
    id: "mandi-e",
    name: "Mandi E — Hapur Centre",
    district: "Hapur",
    state: "Uttar Pradesh",
    distanceKm: 41,
    crops: ["Wheat", "Paddy", "Gram", "Mustard"],
    capacityPerDay: 450,
    farmersWaiting: 14,
    activeCounters: 4,
    processingRatePerHour: 29,
    avgProcessingMin: 7,
    loadPercent: 66,
    estimatedWaitMin: 38,
    status: "normal",
    lat: 28.73,
    lng: 77.78,
  },
];

const names = [
  "Rajesh Kumar",
  "Sunita Devi",
  "Harpal Singh",
  "Mahesh Yadav",
  "Kavita Sharma",
  "Ramesh Chandra",
  "Balwinder Kaur",
  "Sanjay Tomar",
  "Anil Verma",
  "Meena Kumari",
  "Dharmveer Singh",
  "Prakash Rathi",
  "Geeta Chauhan",
  "Naresh Pal",
  "Om Prakash",
  "Shanti Devi",
  "Jitender Malik",
  "Rekha Bisht",
  "Satpal Singh",
  "Vikram Chaudhary",
];
const villages = ["Sisauli", "Kharkhauda", "Bhagwanpur", "Daurala", "Rohta", "Jani Khurd", "Parikshitgarh"];
const crops = ["Wheat", "Paddy", "Gram", "Mustard"];
const statuses: Farmer["status"][] = ["Waiting", "In Process", "Completed", "Scheduled"];

export const farmers: Farmer[] = names.map((name, i) => ({
  id: `KS-UP-${23180 + i}`,
  name,
  village: villages[i % villages.length]!,
  district: centres[i % centres.length]!.district,
  crop: crops[i % crops.length]!,
  quantityQuintals: 20 + ((i * 7) % 60),
  centreId: centres[i % centres.length]!.id,
  language: ["hi", "en", "pa", "mr", "bn"][i % 5]!,
  mobile: `+91 9${(800000000 + i * 137911).toString().slice(0, 9)}`,
  status: statuses[i % statuses.length]!,
}));

export const currentFarmer = {
  id: "KS-UP-23180",
  name: "Rajesh Kumar",
  village: "Sisauli",
  district: "Meerut",
  state: "Uttar Pradesh",
  mobile: "+91 98371 44210",
  language: "en",
  transport: "Own Tractor Trolley",
  history: [
    { season: "Rabi 2025", crop: "Wheat", qty: "48 Quintals", centre: "Mandi A", status: "Completed" },
    { season: "Kharif 2025", crop: "Paddy", qty: "36 Quintals", centre: "Mandi B", status: "Completed" },
  ],
};

export const initialCrops: Crop[] = [
  {
    id: "crop-1",
    type: "Wheat",
    quantity: 50,
    unit: "Quintals",
    expectedDate: "5 September 2026",
    preferredCentreId: "mandi-a",
    transportAvailable: true,
    status: "Slot Confirmed",
  },
  {
    id: "crop-2",
    type: "Mustard",
    quantity: 18,
    unit: "Quintals",
    expectedDate: "22 September 2026",
    preferredCentreId: "mandi-b",
    transportAvailable: false,
    status: "Not Scheduled",
  },
];

export const initialNotifications: AppNotification[] = [
  {
    id: "n1",
    kind: "centre",
    title: "Centre Alert",
    body: "Mandi A has become overloaded.",
    time: "10:44 AM",
    read: false,
  },
  {
    id: "n2",
    kind: "slot",
    title: "Slot Confirmed",
    body: "Your procurement slot is confirmed for 11:30 AM.",
    time: "09:12 AM",
    read: false,
  },
  {
    id: "n3",
    kind: "weather",
    title: "Weather Alert",
    body: "Heavy rainfall may affect your route.",
    time: "08:30 AM",
    read: true,
  },
  {
    id: "n4",
    kind: "recovery",
    title: "Slot Updated",
    body: "Your recovery slot is now 1:00 PM.",
    time: "Yesterday",
    read: true,
  },
];

export const govKpis = {
  totalFarmers: 18420,
  currentlyWaiting: 4281,
  centres: 250,
  overloadedCentres: 18,
  averageWaiting: "1h 28m",
  recoveredSlots: 342,
};

export const waitingTrend = [
  { time: "6 AM", wait: 22 },
  { time: "8 AM", wait: 48 },
  { time: "10 AM", wait: 87 },
  { time: "12 PM", wait: 104 },
  { time: "2 PM", wait: 76 },
  { time: "4 PM", wait: 52 },
  { time: "6 PM", wait: 31 },
];

export const dailyProcurement = [
  { day: "Mon", quintals: 12400 },
  { day: "Tue", quintals: 15230 },
  { day: "Wed", quintals: 13980 },
  { day: "Thu", quintals: 17110 },
  { day: "Fri", quintals: 18620 },
  { day: "Sat", quintals: 14050 },
  { day: "Sun", quintals: 6120 },
];

export const procurementStatusSplit = [
  { name: "Completed", value: 612 },
  { name: "In Queue", value: 284 },
  { name: "Scheduled", value: 196 },
  { name: "Recovered", value: 84 },
];

export const disruptions = [
  { id: "d1", centre: "Mandi A", type: "Weather", farmers: 42, reported: "10:12 AM", severity: "High" },
  { id: "d2", centre: "Mandi C", type: "Counter Downtime", farmers: 18, reported: "09:40 AM", severity: "Medium" },
  { id: "d3", centre: "Mandi B", type: "Road Blockage", farmers: 7, reported: "08:55 AM", severity: "Low" },
  { id: "d4", centre: "Mandi E", type: "Vehicle Problem", farmers: 3, reported: "08:20 AM", severity: "Low" },
];

export const recoveries = [
  { id: "r1", farmer: "Sunita Devi", from: "Mandi A", to: "Mandi B", saved: "2h 30m", status: "Confirmed" },
  { id: "r2", farmer: "Harpal Singh", from: "Mandi C", to: "Mandi D", saved: "1h 05m", status: "Confirmed" },
  { id: "r3", farmer: "Mahesh Yadav", from: "Mandi A", to: "Mandi E", saved: "1h 48m", status: "Awaiting Farmer" },
  { id: "r4", farmer: "Anil Verma", from: "Mandi C", to: "Mandi B", saved: "0h 52m", status: "Confirmed" },
];

export const journeySteps = [
  { key: "slot", label: "Slot Confirmed", time: "10:00 AM" },
  { key: "travel", label: "Farmer Travelling", time: "10:15 AM" },
  { key: "checkin", label: "Gate Check-in", time: "10:48 AM" },
  { key: "queue", label: "Queue", time: "Current" },
  { key: "grading", label: "Quality Grading", time: "Pending" },
  { key: "weighing", label: "Weighing", time: "Pending" },
  { key: "completed", label: "Procurement Completed", time: "Pending" },
  { key: "payment", label: "Payment Disbursed", time: "Pending" },
];
