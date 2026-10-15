import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { adminNav } from "@/lib/nav";
import { requireRole } from "@/lib/guard";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => requireRole(context.queryClient, "admin"),
  component: () => (
    <AppShell nav={adminNav} area="Administration">
      <Outlet />
    </AppShell>
  ),
});
