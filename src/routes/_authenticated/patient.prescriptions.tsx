import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery, fmtDate } from "@/lib/me";
import { getPrescriptions } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, RxStatus } from "@/components/RecordBits";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/patient/prescriptions")({
  head: () => ({ meta: [{ title: "My prescriptions — MediVault AI" }] }),
  component: PrescriptionsPage,
});

function PrescriptionsPage() {
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const rxs = useQuery({ queryKey: ["rxs", "p", uid], queryFn: () => getPrescriptions({ patient_id: uid }) });

  if (rxs.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader title="My prescriptions" subtitle="Digital prescriptions issued by your doctors." />
      <Card>
        {rxs.data?.length ? (
          <ul className="divide-y">
            {rxs.data.map((r) => (
              <li key={r.id}>
                <Link to="/patient/prescriptions/$id" params={{ id: r.id }} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-primary">
                  <div>
                    <p className="font-medium">{r.prescription_items.map((i) => i.medication_name).join(", ")}</p>
                    <p className="text-xs text-muted-foreground">{r.doctor?.full_name} · {fmtDate(r.issued_at)} · <span className="font-mono">{r.prescription_number}</span></p>
                  </div>
                  <RxStatus rx={r} />
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>No prescriptions yet. When a doctor issues one, it will appear here.</Empty>}
      </Card>
    </div>
  );
}
