import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "patient" | "doctor" | "admin";

export async function fetchMe() {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return null;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);
  const list = (roles ?? []).map((r) => r.role as Role);
  const role: Role = list.includes("admin") ? "admin" : list.includes("doctor") ? "doctor" : "patient";
  return { user, role, profile };
}

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: fetchMe, staleTime: 30_000 });

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}
