import { Activity, CalendarClock, ClipboardList, FileHeart, Gauge, PackageCheck, Pill, Settings, ShieldPlus, Syringe, UserCog, UsersRound } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/patients", label: "Patient Records", icon: UsersRound },
  { href: "/todays-patients", label: "Today’s Patient", icon: CalendarClock },
  { href: "/follow-ups", label: "For Follow up", icon: ClipboardList },
  { href: "/vaccination", label: "Vaccination", icon: Syringe },
  { href: "/emergency-cases", label: "Emergency Cases", icon: ShieldPlus },
  { href: "/inventory", label: "Inventory", icon: Pill },
  { href: "/item-requests", label: "Item Requests", icon: PackageCheck },
  { href: "/reports", label: "Reports", icon: FileHeart },
  { href: "/activity-logs", label: "Activity Logs", icon: Activity },
  { href: "/accounts", label: "Accounts", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const patients = [
  {
    id: "oting-jasnia-daud",
    lastName: "Oting",
    firstName: "Jasnia",
    middleName: "Daud",
    age: 25,
    birthDate: "1997-07-16",
    gender: "Female",
    address: "Biniruan Pob. IX",
    contact: "09558435976",
    agency: "The Clinic",
    designation: "AA VI",
    request: "Consultation, Medicines",
    status: "In progress",
  },
  {
    id: "santos-maria-luz",
    lastName: "Santos",
    firstName: "Maria",
    middleName: "Luz",
    age: 34,
    birthDate: "1990-02-21",
    gender: "Female",
    address: "Poblacion II",
    contact: "09171234567",
    agency: "Municipal Office",
    designation: "Staff",
    request: "Vaccination",
    status: "Queued",
  },
  {
    id: "dela-cruz-jomar-reyes",
    lastName: "Dela Cruz",
    firstName: "Jomar",
    middleName: "Reyes",
    age: 42,
    birthDate: "1982-11-09",
    gender: "Male",
    address: "Barangay East",
    contact: "09981234567",
    agency: "Public Works",
    designation: "Driver",
    request: "Medical Certificate",
    status: "For follow up",
  },
];

export const queues = [
  { title: "Today’s Patient", count: 18, tone: "bg-teal-50 text-teal-700", href: "/todays-patients", icon: CalendarClock },
  { title: "Completed", count: 42, tone: "bg-emerald-50 text-emerald-700", href: "/todays-patients", icon: Activity },
  { title: "For Follow up", count: 9, tone: "bg-amber-50 text-amber-700", href: "/follow-ups", icon: ClipboardList },
  { title: "Vaccination", count: 12, tone: "bg-blue-50 text-blue-700", href: "/vaccination", icon: Syringe },
  { title: "Emergency Cases", count: 3, tone: "bg-rose-50 text-rose-700", href: "/emergency-cases", icon: ShieldPlus },
];

export const visitHistory = [
  { date: "2025/07/06", time: "09:30 AM", chiefComplaint: "Dizziness", bp: "150/90", rbs: "98", temp: "37.1", pr: "82", rr: "18", services: "Consultation, Medicines", vaccine: "—", diagnosis: "Hypertension Stage II", timeout: "10:15 AM", nod: "Dr. Mamadra", status: "Pending" },
  { date: "2025/06/14", time: "11:10 AM", chiefComplaint: "Cough & cold", bp: "120/80", rbs: "—", temp: "36.9", pr: "76", rr: "18", services: "Medicines", vaccine: "—", diagnosis: "URTI", timeout: "11:35 AM", nod: "Nurse Ana", status: "Completed" },
];

export const inventoryItems = [
  { item: "Paracetamol 500mg", category: "Medicine", stock: 420, unit: "tablet", reorder: 100, status: "Healthy" },
  { item: "Amoxicillin 500mg", category: "Medicine", stock: 78, unit: "capsule", reorder: 100, status: "Low stock" },
  { item: "Syringe 3ml", category: "Supply", stock: 260, unit: "piece", reorder: 80, status: "Healthy" },
  { item: "Flu Vaccine", category: "Vaccine", stock: 24, unit: "vial", reorder: 20, status: "Watch" },
  { item: "Digital Thermometer", category: "Equipment", stock: 8, unit: "unit", reorder: 5, status: "Healthy" },
];

export const requestTypes = ["Consultation", "Medicines", "CS 211 Medical Certificate", "Regular Medical Cert", "Vaccination"];
