import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Pill, Sparkles, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDate, fmtDateTime } from "@/lib/me";
import { getPatient, getConsultations, getPrescriptions } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, Stat, AllergyAlert, RxStatus } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/patient/")({
  head: () => ({ meta: [{ title: "Dashboard — MediVault AI" }] }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const patient = useQuery({ queryKey: ["patient", uid], queryFn: () => getPatient(uid) });
  const cons = useQuery({ queryKey: ["consults", uid], queryFn: () => getConsultations(uid) });
  const rxs = useQuery({ queryKey: ["rxs", "p", uid], queryFn: () => getPrescriptions({ patient_id: uid }) });
  const pending = useQuery({
    queryKey: ["grants", uid],
    queryFn: async () => (await supabase.from("access_grants").select("id,status").eq("patient_id", uid).eq("status", "pending")).data ?? [],
  });
  const activity = useQuery({
    queryKey: ["activity", uid],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  if (patient.isLoading) return <Skeleton className="h-64 w-full" />;
  const p = patient.data;
  const today = new Date().toISOString().slice(0, 10);
  const followUps = (cons.data ?? []).filter((c) => c.follow_up_date && c.follow_up_date >= today);

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${me?.profile?.full_name?.split(" ")[0] ?? ""}`} subtitle="Here's an overview of your health record." />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-hero p-5 text-primary-foreground shadow-card md:col-span-1">
          <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Your patient ID</p>
          <p className="mt-2 font-mono text-2xl font-bold">{p?.patient_code}</p>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary-foreground/10 p-3">
            <KeyRound className="h-4 w-4" />
            <div>
              <p className="text-xs text-primary-foreground/70">One-time access code for your doctor</p>
              <p className="font-mono text-lg font-semibold tracking-widest">{p?.share_code}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/70">Share it only in person. It changes after each use.</p>
        </div>
        <Stat label="Consultations" value={cons.data?.length ?? "—"} hint="Recorded visits" />
        <Stat label="Prescriptions" value={rxs.data?.length ?? "—"} hint={`${(rxs.data ?? []).filter((r) => !r.viewed_at).length} unread`} />
      </div>

      {(pending.data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning/15 p-4">
          <p className="text-sm font-medium">You have {pending.data!.length} pending request(s) to access your records.</p>
          <Button asChild size="sm"><Link to="/patient/privacy">Review requests</Link></Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Important health information" className="lg:col-span-1">
          <AllergyAlert allergies={p?.allergies ?? []} />
          <div className="mt-4">
            <p className="text-sm font-semibold">Existing conditions</p>
            <p className="text-sm text-muted-foreground">{p?.conditions?.length ? p.conditions.join(", ") : "None recorded"}</p>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Upcoming follow-ups</p>
            {followUps.length ? followUps.map((c) => (
              <p key={c.id} className="text-sm">{fmtDate(c.follow_up_date)} — {c.reason}</p>
            )) : <p className="text-sm text-muted-foreground">None recorded</p>}
          </div>
        </Card>

        <Card title="Recent prescriptions" className="lg:col-span-2" action={<Link to="/patient/prescriptions" className="text-sm text-primary">View all</Link>}>
          {rxs.data?.length ? (
            <ul className="divide-y">
              {rxs.data.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link to="/patient/prescriptions/$id" params={{ id: r.id }} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary">
                    <div>
                      <p className="font-medium">{r.prescription_items.map((i) => i.medication_name).join(", ")}</p>
                      <p className="text-xs text-muted-foreground">{r.doctor?.full_name} · {fmtDate(r.issued_at)}</p>
                    </div>
                    <RxStatus rx={r} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No prescriptions yet.</Empty>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent activity" className="lg:col-span-2">
          {activity.data?.length ? (
            <ul className="space-y-3">
              {activity.data.map((n) => (
                <li key={n.id} className="text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground">{n.body} · {fmtDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>No activity yet.</Empty>}
        </Card>
        <Card title="Quick actions">
          <div className="grid gap-2">
            <Button asChild variant="outline" className="justify-start"><Link to="/patient/history"><History />Medical history</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/patient/prescriptions"><Pill />Prescriptions</Link></Button>
            <Button asChild className="justify-start"><Link to="/patient/assistant"><Sparkles />Ask the AI assistant</Link></Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
