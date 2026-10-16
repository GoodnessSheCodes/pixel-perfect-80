import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery, fmtDateTime } from "@/lib/me";
import { getPrescriptions } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, RxStatus } from "@/components/RecordBits";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/doctor/prescriptions")({
  head: () => ({ meta: [{ title: "Issued prescriptions — MediVault AI" }] }),
  component: DoctorPrescriptions,
});

function DoctorPrescriptions() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const rxs = useQuery({ queryKey: ["rxs", "d", uid], queryFn: () => getPrescriptions({ doctor_id: uid }) });

  if (rxs.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Issued prescriptions" subtitle="Every prescription you have issued, with delivery and viewing status." />
      <Card>
        {rxs.data?.length ? (
          <ul className="divide-y">
            {rxs.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{r.prescription_items.map((i) => i.medication_name).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{r.prescription_number}</span> · Issued {fmtDateTime(r.issued_at)}
                    {r.consultation && <> · Linked: {r.consultation.reason}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RxStatus rx={r} />
                  <Link to="/doctor/patient/$id" params={{ id: r.patient_id }} className="text-sm text-primary">View patient</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : <Empty>You haven't issued any prescriptions yet. Open a patient's record to create one.</Empty>}
      </Card>
    </div>
  );
}
