import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/me";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card } from "@/components/RecordBits";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — MediVault AI" }] }),
  component: AuditPage,
});

function AuditPage() {
  const logs = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Every sensitive action recorded on the platform." />
      <Card>
        {logs.data?.length ? (
          <ul className="divide-y text-sm">
            {logs.data.map((l) => (
              <li key={l.id} className="py-2">
                <span className="font-mono text-xs text-muted-foreground">{fmtDateTime(l.created_at)}</span>{" "}
                <span className="font-medium">{l.action}</span>{" "}
                <span className="text-xs text-muted-foreground">{JSON.stringify(l.details)}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>No events yet.</Empty>}
      </Card>
    </div>
  );
}
