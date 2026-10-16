import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ClipboardList, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDate } from "@/lib/me";
import { getPrescriptions } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, Stat, RxStatus } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/doctor/")({
  head: () => ({ meta: [{ title: "Doctor dashboard — MediVault AI" }] }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;

  const profile = useQuery({
    queryKey: ["doc-profile", uid],
    queryFn: async () => (await supabase.from("doctor_profiles").select("*").eq("user_id", uid).maybeSingle()).data,
  });
  const grants = useQuery({
    queryKey: ["doc-grants", uid],
    queryFn: async () =>
      (await supabase.from("access_grants").select("*, patient:patients!access_grants_patient_id_fkey(patient_code, profile:profiles!patients_user_id_fkey(full_name))").eq("doctor_id", uid).order("requested_at", { ascending: false })).data ?? [],
  });
  const rxs = useQuery({ queryKey: ["rxs", "d", uid], queryFn: () => getPrescriptions({ doctor_id: uid }) });

  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;
  const dp = profile.data;
  const active = (grants.data ?? []).filter((g) => g.status === "approved");
  const pending = (grants.data ?? []).filter((g) => g.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, Dr ${me?.profile?.full_name?.split(" ").slice(-1)[0] ?? ""}`}
        subtitle={dp?.practice_name ? `${dp.practice_name}${dp.specialty ? ` · ${dp.specialty}` : ""}` : "Your professional workspace."}
        action={<Button asChild><Link to="/doctor/search"><Search />Find a patient</Link></Button>}
      />

      {dp && dp.verification_status !== "verified" && (
        <div className="rounded-xl border border-warning bg-warning/15 p-4 text-sm">
          <p className="font-semibold">Verification {dp.verification_status}</p>
          <p className="mt-1 text-muted-foreground">
            {dp.verification_status === "pending"
              ? "Your HPCSA registration is being reviewed. You can request access to records, but prescribing is disabled until verification."
              : "Your verification was rejected. Please contact support with your HPCSA details."}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Patients with access" value={active.length} hint="Approved consent" />
        <Stat label="Pending requests" value={pending.length} hint="Awaiting patient approval" />
        <Stat label="Prescriptions issued" value={rxs.data?.length ?? "—"} hint={`${(rxs.data ?? []).filter((r) => r.viewed_at).length} viewed by patients`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="My patients" action={<Link to="/doctor/search" className="text-sm text-primary">Find patient</Link>}>
          {active.length ? (
            <ul className="divide-y">
              {active.map((g) => (
                <li key={g.id}>
                  <Link to="/doctor/patient/$id" params={{ id: g.patient_id }} className="flex items-center justify-between gap-2 py-3 hover:text-primary">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{g.patient?.profile?.full_name ?? "Patient"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{g.patient?.patient_code}</p>
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success hover:bg-success/15">Access active</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No active patient access yet. Search for a patient to request access.</Empty>}
        </Card>

        <Card title="Recent prescriptions" action={<Link to="/doctor/prescriptions" className="text-sm text-primary">View all</Link>}>
          {rxs.data?.length ? (
            <ul className="divide-y">
              {rxs.data.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{r.prescription_items.map((i) => i.medication_name).join(", ")}</p>
                    <p className="text-xs text-muted-foreground">{r.prescription_number} · {fmtDate(r.issued_at)}</p>
                  </div>
                  <RxStatus rx={r} />
                </li>
              ))}
            </ul>
          ) : <Empty>No prescriptions issued yet.</Empty>}
        </Card>
      </div>

      {pending.length > 0 && (
        <Card title="Pending access requests">
          <ul className="divide-y">
            {pending.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                <span>{g.patient?.profile?.full_name ?? "Patient"} <span className="font-mono text-xs text-muted-foreground">({g.patient?.patient_code})</span></span>
                <span className="text-muted-foreground">Requested {fmtDate(g.requested_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
