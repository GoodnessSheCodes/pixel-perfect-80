import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/me";
import { getPrescriptions, getPatient } from "@/lib/records";
import { Empty } from "@/components/AppShell";
import { RxDocument, downloadRx } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/patient/prescriptions/$id")({
  head: () => ({ meta: [{ title: "Prescription — MediVault AI" }] }),
  component: PrescriptionDetail,
});

function PrescriptionDetail() {
  const { id } = Route.useParams();
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const rxs = useQuery({ queryKey: ["rxs", "p", uid], queryFn: () => getPrescriptions({ patient_id: uid }) });
  const patient = useQuery({ queryKey: ["patient", uid], queryFn: () => getPatient(uid) });

  const rx = rxs.data?.find((r) => r.id === id);

  useEffect(() => {
    if (rx && !rx.viewed_at) supabase.rpc("mark_prescription_viewed", { _rx: rx.id }).then(() => {});
  }, [rx]);

  if (rxs.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!rx) return <Empty>Prescription not found. <Link to="/patient/prescriptions" className="text-primary">Back to prescriptions</Link></Empty>;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/patient/prescriptions"><ArrowLeft />All prescriptions</Link></Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />Print</Button>
          <Button variant="outline" size="sm" onClick={() => downloadRx(rx, me?.profile?.full_name)}><Download />Download</Button>
        </div>
      </div>
      <RxDocument rx={rx} patientName={me?.profile?.full_name ?? ""} patientCode={patient.data?.patient_code ?? ""} />
    </div>
  );
}
