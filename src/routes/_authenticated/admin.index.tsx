import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errMsg, fmtDate } from "@/lib/me";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Doctor verification — MediVault AI" }] }),
  component: AdminDoctors,
});

function AdminDoctors() {
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => {
      const { data: d } = await supabase.from("doctor_profiles").select("*").order("created_at", { ascending: false });
      const ids = (d ?? []).map((x) => x.user_id);
      const { data: p } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
      return (d ?? []).map((x) => ({ ...x, profile: p?.find((y) => y.id === x.user_id) }));
    },
  });
  const set = useMutation({
    mutationFn: async (v: { id: string; status: "verified" | "rejected" }) => {
      const { error } = await supabase.rpc("set_doctor_verification", { _doctor: v.id, _status: v.status });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-doctors"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Doctor verification" subtitle="Approve doctors after checking their HPCSA registration." />
      <Card>
        {docs.data?.length ? (
          <ul className="divide-y">
            {docs.data.map((d) => (
              <li key={d.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{d.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{d.profile?.email} · HPCSA {d.hpcsa_number ?? "—"} · {d.specialty ?? "—"} · joined {fmtDate(d.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{d.verification_status}</Badge>
                  {d.verification_status !== "verified" && <Button size="sm" onClick={() => set.mutate({ id: d.user_id, status: "verified" })}>Verify</Button>}
                  {d.verification_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => set.mutate({ id: d.user_id, status: "rejected" })}>Reject</Button>}
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty>No doctors registered.</Empty>}
      </Card>
    </div>
  );
}
