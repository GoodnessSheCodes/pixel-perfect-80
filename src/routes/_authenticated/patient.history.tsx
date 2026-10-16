import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery, fmtDate } from "@/lib/me";
import { getPatient, getConsultations } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, AllergyAlert, Row } from "@/components/RecordBits";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/patient/history")({
  head: () => ({ meta: [{ title: "Medical history — MediVault AI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const patient = useQuery({ queryKey: ["patient", uid], queryFn: () => getPatient(uid) });
  const cons = useQuery({ queryKey: ["consults", uid], queryFn: () => getConsultations(uid) });

  if (patient.isLoading) return <Skeleton className="h-64 w-full" />;
  const p = patient.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Medical history" subtitle="Your complete record of consultations and health information." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Health summary" className="lg:col-span-1">
          <AllergyAlert allergies={p?.allergies ?? []} />
          <dl className="mt-4 divide-y">
            <Row label="Blood type">{p?.blood_type}</Row>
            <Row label="Date of birth">{fmtDate(p?.date_of_birth)}</Row>
            <Row label="Existing conditions">{p?.conditions?.length ? p.conditions.join(", ") : "None recorded"}</Row>
          </dl>
        </Card>

        <div className="lg:col-span-2">
          <Card title="Consultation timeline">
            {cons.data?.length ? (
              <ol className="relative space-y-6 border-l pl-6">
                {cons.data.map((c) => (
                  <li key={c.id} className="relative">
                    <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <p className="text-xs text-muted-foreground">{fmtDate(c.consultation_date)} · {c.doctor?.full_name}</p>
                    <p className="mt-1 font-medium">{c.reason}</p>
                    <p className="mt-1 text-sm"><span className="text-muted-foreground">Diagnosis: </span>{c.diagnosis}</p>
                    {c.findings && <p className="mt-1 text-sm"><span className="text-muted-foreground">Findings: </span>{c.findings}</p>}
                    {c.treatment_plan && <p className="mt-1 text-sm"><span className="text-muted-foreground">Treatment plan: </span>{c.treatment_plan}</p>}
                    {c.follow_up_date && (
                      <p className="mt-1 text-sm text-primary">Follow-up: {fmtDate(c.follow_up_date)}{c.follow_up_instructions ? ` — ${c.follow_up_instructions}` : ""}</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : <Empty>No consultations recorded yet.</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}
