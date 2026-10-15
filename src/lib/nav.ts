import { LayoutDashboard, History, Pill, Sparkles, ShieldCheck, Search, ClipboardList, Users, ScrollText } from "lucide-react";
import type { NavItem } from "@/components/AppShell";
import type { Role } from "@/lib/me";

export const patientNav: NavItem[] = [
  { to: "/patient", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/patient/history", label: "Medical history", icon: History },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: Pill },
  { to: "/patient/assistant", label: "AI assistant", icon: Sparkles },
  { to: "/patient/privacy", label: "Profile & privacy", icon: ShieldCheck },
];
export const doctorNav: NavItem[] = [
  { to: "/doctor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/doctor/search", label: "Find patient", icon: Search },
  { to: "/doctor/prescriptions", label: "Issued prescriptions", icon: ClipboardList },
];
export const adminNav: NavItem[] = [
  { to: "/admin", label: "Doctor verification", icon: Users, exact: true },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];
export function navFor(role: Role) {
  return role === "admin" ? adminNav : role === "doctor" ? doctorNav : patientNav;
}
export function areaFor(role: Role) {
  return role === "admin" ? "Administration" : role === "doctor" ? "Professional" : "My health";
}
