import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDateTime } from "@/lib/me";
import { navFor, areaFor } from "@/lib/nav";
import { AppShell, PageHeader, Empty } from "@/components/AppShell";
import { Card } from "@/components/RecordBits";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MediVault AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", me?.user.id],
    enabled: !!me,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  useEffect(() => {
    if (!me) return;
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", me.user.id)
      .then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
  }, [me, qc]);

  const role = me?.role ?? "patient";
  return (
    <AppShell nav={navFor(role)} area={areaFor(role)}>
      <PageHeader title="Notifications" />
      <Card>
        {list.data?.length ? (
          <ul className="divide-y">
            {list.data.map((n) => (
              <li key={n.id} className="py-3">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : <Empty>No notifications.</Empty>}
      </Card>
    </AppShell>
  );
}
