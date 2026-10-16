import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, fmtDate, fmtDateTime, errMsg } from "@/lib/me";
import { getPatient, getConsultations, getPrescriptions } from "@/lib/records";
import { PageHeader, Empty } from "@/components/AppShell";
import { Card, AllergyAlert, Row, RxStatus } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/patient/$id")({
  head: () => ({ meta: [{ title: "Patient record — MediVault AI" }] }),
  component: PatientRecord,
});

type RxItem = { medication_name: string; dosage: string; frequency: string; duration: string; instructions: string };
const emptyItem: RxItem = { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };

function PatientRecord() {
  const { id } = Route.useParams();
  const { data: me } = useQuery(meQuery);
  const uid = me!.user.id;
  const qc = useQueryClient();

  const patient = useQuery({ queryKey: ["patient", id], queryFn: () => getPatient(id) });
  const cons = useQuery({ queryKey: ["consults", id], queryFn: () => getConsultations(id) });
  const rxs = useQuery({ queryKey: ["rxs", "p", id], queryFn: () => getPrescriptions({ patient_id: id }) });
  const verified = useQuery({
    queryKey: ["doc-verified", uid],
    queryFn: async () => (await supabase.from("doctor_profiles").select("verification_status").eq("user_id", uid).maybeSingle()).data?.verification_status === "verified",
  });

  // Log the record view once
  useEffect(() => { supabase.rpc("log_record_view", { _patient: id }).then(() => {}); }, [id]);

  const [consOpen, setConsOpen] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [confirmRx, setConfirmRx] = useState(false);
  const [cForm, setCForm] = useState({ reason: "", diagnosis: "", findings: "", treatment_plan: "", follow_up_date: "", follow_up_instructions: "" });
  const [items, setItems] = useState<RxItem[]>([{ ...emptyItem }]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxConsult, setRxConsult] = useState<string>("");

  const addConsult = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_consultation", {
        _patient: id, _reason: cForm.reason, _diagnosis: cForm.diagnosis,
        _findings: cForm.findings, _plan: cForm.treatment_plan,
        _follow: cForm.follow_up_instructions, _follow_date: cForm.follow_up_date,
        _date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consultation recorded.");
      setConsOpen(false);
      setCForm({ reason: "", diagnosis: "", findings: "", treatment_plan: "", follow_up_date: "", follow_up_instructions: "" });
      qc.invalidateQueries({ queryKey: ["consults", id] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const issueRx = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("issue_prescription", {
        _patient: id,
        _consultation: rxConsult || null,
        _notes: rxNotes,
        _items: items as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prescription issued and delivered to the patient.");
      setConfirmRx(false); setRxOpen(false);
      setItems([{ ...emptyItem }]); setRxNotes(""); setRxConsult("");
      qc.invalidateQueries({ queryKey: ["rxs", "p", id] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (patient.isLoading) return <Skeleton className="h-64 w-full" />;
  const p = patient.data;
  if (!p) return <Empty>You don't have access to this patient's record, or the record doesn't exist. Request access from the Find patient page.</Empty>;

  const canWrite = verified.data === true;
  const itemsValid = items.every((i) => i.medication_name && i.dosage && i.frequency && i.duration);

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.profile?.full_name ?? "Patient"}
        subtitle={<span className="font-mono">{p.patient_code}</span> as never}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConsOpen(true)} disabled={!canWrite}><Plus />New consultation</Button>
            <Button onClick={() => setRxOpen(true)} disabled={!canWrite}><FileText />New prescription</Button>
          </div>
        }
      />

      {!canWrite && (
        <div className="rounded-xl border border-warning bg-warning/15 p-4 text-sm">
          Your account is not yet verified, so consultation and prescription forms are disabled.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Patient details" className="lg:col-span-1">
          <dl className="divide-y">
            <Row label="Date of birth">{fmtDate(p.date_of_birth)}</Row>
            <Row label="Sex">{p.sex}</Row>
            <Row label="Blood type">{p.blood_type}</Row>
            <Row label="Phone">{p.profile?.phone}</Row>
            <Row label="Emergency contact">{p.emergency_contact}</Row>
          </dl>
          <div className="mt-4"><AllergyAlert allergies={p.allergies ?? []} /></div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Existing conditions</p>
            <p className="text-sm text-muted-foreground">{p.conditions?.length ? p.conditions.join(", ") : "None recorded"}</p>
          </div>
        </Card>

        <Card title="Consultation history" className="lg:col-span-2">
          {cons.data?.length ? (
            <ul className="space-y-4">
              {cons.data.map((c) => (
                <li key={c.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{c.reason}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(c.consultation_date)} · {c.doctor?.full_name}</p>
                  </div>
                  <p className="mt-1 text-sm"><span className="text-muted-foreground">Diagnosis: </span>{c.diagnosis}</p>
                  {c.treatment_plan && <p className="mt-1 text-sm"><span className="text-muted-foreground">Plan: </span>{c.treatment_plan}</p>}
                  {c.follow_up_date && <p className="mt-1 text-sm text-primary">Follow-up: {fmtDate(c.follow_up_date)}</p>}
                </li>
              ))}
            </ul>
          ) : <Empty>No consultations recorded.</Empty>}
        </Card>
      </div>

      <Card title="Prescriptions">
        {rxs.data?.length ? (
          <ul className="divide-y">
            {rxs.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{r.prescription_items.map((i) => i.medication_name).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{r.prescription_number} · {fmtDateTime(r.issued_at)}</p>
                </div>
                <RxStatus rx={r} />
              </li>
            ))}
          </ul>
        ) : <Empty>No prescriptions issued.</Empty>}
      </Card>

      {/* Consultation dialog */}
      <Dialog open={consOpen} onOpenChange={setConsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>New consultation</DialogTitle></DialogHeader>
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); addConsult.mutate(); }}>
            <div className="grid gap-1.5"><Label>Reason for visit</Label><Input value={cForm.reason} onChange={(e) => setCForm({ ...cForm, reason: e.target.value })} required /></div>
            <div className="grid gap-1.5"><Label>Diagnosis</Label><Input value={cForm.diagnosis} onChange={(e) => setCForm({ ...cForm, diagnosis: e.target.value })} required /></div>
            <div className="grid gap-1.5"><Label>Findings</Label><Textarea value={cForm.findings} onChange={(e) => setCForm({ ...cForm, findings: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Treatment plan</Label><Textarea value={cForm.treatment_plan} onChange={(e) => setCForm({ ...cForm, treatment_plan: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Follow-up date</Label><Input type="date" value={cForm.follow_up_date} onChange={(e) => setCForm({ ...cForm, follow_up_date: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Follow-up instructions</Label><Input value={cForm.follow_up_instructions} onChange={(e) => setCForm({ ...cForm, follow_up_instructions: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={addConsult.isPending}>Save consultation</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prescription builder */}
      <Dialog open={rxOpen} onOpenChange={setRxOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>New prescription</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {(p.allergies ?? []).length > 0 && <AllergyAlert allergies={p.allergies} />}
            {items.map((it, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Medication {idx + 1}</p>
                  {items.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
                <Input placeholder="Medication name" value={it.medication_name} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, medication_name: e.target.value } : x))} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Dosage (e.g. 500mg)" value={it.dosage} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, dosage: e.target.value } : x))} />
                  <Input placeholder="Frequency" value={it.frequency} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, frequency: e.target.value } : x))} />
                  <Input placeholder="Duration" value={it.duration} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, duration: e.target.value } : x))} />
                </div>
                <Input placeholder="Instructions (optional)" value={it.instructions} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, instructions: e.target.value } : x))} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setItems([...items, { ...emptyItem }])}><Plus />Add another medication</Button>
            <div className="grid gap-1.5">
              <Label>Link to consultation (optional)</Label>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={rxConsult} onChange={(e) => setRxConsult(e.target.value)}>
                <option value="">None</option>
                {(cons.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.reason} — {fmtDate(c.consultation_date)}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Notes</Label><Textarea value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} /></div>
            <DialogFooter>
              <Button onClick={() => setConfirmRx(true)} disabled={!itemsValid}>Review & issue</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmRx} onOpenChange={setConfirmRx}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm prescription</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Once issued, a prescription cannot be edited. Please review carefully.</p>
          <ul className="mt-2 space-y-2 text-sm">
            {items.map((i, idx) => (
              <li key={idx} className="rounded-lg bg-muted p-3">
                <p className="font-semibold">{i.medication_name}</p>
                <p className="text-muted-foreground">{i.dosage} · {i.frequency} · {i.duration}</p>
              </li>
            ))}
          </ul>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setConfirmRx(false)}>Back</Button>
            <Button onClick={() => issueRx.mutate()} disabled={issueRx.isPending}>Issue prescription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
