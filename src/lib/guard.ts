import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { meQuery, homeFor, type Role } from "@/lib/me";

export async function requireRole(qc: QueryClient, role: Role) {
  const me = await qc.ensureQueryData(meQuery);
  if (!me) throw redirect({ to: "/auth" });
  if (me.role !== role) throw redirect({ to: homeFor(me.role) });
  return me;
}
