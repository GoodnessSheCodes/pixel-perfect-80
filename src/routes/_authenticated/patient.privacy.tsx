import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDateTime, errMsg } from "@/lib/me";
import { getPatient } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, Row } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/privacy")({
  head: () => ({ meta: [{ title: "Profile & privacy — MediVault AI" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const qc = useQueryClient();
  const patient = useQuery({ queryKey: ["patient", uid], queryFn: () => getPatient(uid) });
  const grants = useQuery({
    queryKey: ["grants-all", uid],
    queryFn: async () =>
      (await supabase.from("access_grants").select("*, doctor:profiles!access_grants_doctor_id_fkey(full_name)").eq("patient_id", uid).order("requested_at", { ascending: false })).data ?? [],
  });
  const respond = useMutation({
    mutationFn: async ({ grant, approve }: { grant: string; approve: boolean }) => {
      const { error } = await supabase.rpc("respond_access", { _grant: grant, _approve: approve });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["grants-all", uid] }); qc.invalidateQueries({ queryKey: ["grants", uid] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const p = patient.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & privacy" subtitle="Control who can see your medical records." />
      <Card title="My details">
        <dl className="divide-y">
          <Row label="Name">{p?.profile?.full_name}</Row>
          <Row label="Patient ID"><span className="font-mono">{p?.patient_code}</span></Row>
          <Row label="Email">{p?.profile?.email}</Row>
          <Row label="Phone">{p?.profile?.phone}</Row>
          <Row label="Emergency contact">{p?.emergency_contact}</Row>
        </dl>
      </Card>
      <Card title="Doctor access">
        {grants.data?.length ? (
          <ul className="divide-y">
            {grants.data.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{g.doctor?.full_name}</p>
                  <p className="text-xs text-muted-foreground">Requested {fmtDateTime(g.requested_at)} · via {g.method}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{g.status}</Badge>
                  {g.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => respond.mutate({ grant: g.id, approve: true })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => respond.mutate({ grant: g.id, approve: false })}>Deny</Button>
                    </>
                  )}
                  {g.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => respond.mutate({ grant: g.id, approve: false })}>Revoke</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty>No doctor has requested access yet.</Empty>}
      </Card>
    </div>
  );
}
