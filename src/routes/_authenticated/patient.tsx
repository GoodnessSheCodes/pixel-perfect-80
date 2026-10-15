import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { patientNav } from "@/lib/nav";
import { requireRole } from "@/lib/guard";

export const Route = createFileRoute("/_authenticated/patient")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "patient"),
  component: () => (
    <AppShell nav={patientNav} area="My health">
      <Outlet />
    </AppShell>
  ),
});
