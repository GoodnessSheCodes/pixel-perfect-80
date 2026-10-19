import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, ShieldPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/DemoBanner";

export type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

export function AppShell({ nav, children, area }: { nav: NavItem[]; children: ReactNode; area: string }) {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", me?.user.id],
    enabled: !!me,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          activeOptions={{ exact: n.exact ?? false }}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={`no-print fixed inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar p-4 text-sidebar-foreground ${open ? "flex" : "hidden"} lg:flex`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-sidebar-accent-foreground">
            <ShieldPlus className="h-6 w-6 text-sidebar-primary" /> MediVault AI
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">{area}</p>
        {navLinks}
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <p className="truncate px-3 text-sm font-medium text-sidebar-accent-foreground">{me?.profile?.full_name}</p>
          <p className="truncate px-3 text-xs text-sidebar-foreground/60">{me?.user.email}</p>
          <button onClick={signOut} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <DemoBanner />
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted-foreground lg:block">Welcome, {me?.profile?.full_name?.split(" ")[0]}</div>
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Link to="/notifications">
              <Bell />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread}</span>
              )}
            </Link>
          </Button>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
