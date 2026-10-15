import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { doctorNav } from "@/lib/nav";
import { requireRole } from "@/lib/guard";

export const Route = createFileRoute("/_authenticated/doctor")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "doctor"),
  component: () => (
    <AppShell nav={doctorNav} area="Professional">
      <Outlet />
    </AppShell>
  ),
});
