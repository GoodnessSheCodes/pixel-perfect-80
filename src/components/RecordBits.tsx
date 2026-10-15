import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtDateTime } from "@/lib/me";
import type { Rx } from "@/lib/records";

export function Card({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-card ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AllergyAlert({ allergies }: { allergies: string[] }) {
  if (!allergies.length) return <p className="text-sm text-muted-foreground">No allergies recorded.</p>;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-semibold text-destructive">Allergies</p>
        <p className="text-sm">{allergies.join(", ")}</p>
      </div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || <span className="text-muted-foreground">Not recorded</span>}</dd>
    </div>
  );
}

export function RxStatus({ rx }: { rx: Pick<Rx, "viewed_at"> }) {
  return rx.viewed_at ? (
    <Badge className="bg-success/15 text-success hover:bg-success/15">Viewed {fmtDate(rx.viewed_at)}</Badge>
  ) : (
    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Delivered · not yet viewed</Badge>
  );
}

export function RxDocument({ rx, patientName, patientCode }: { rx: Rx; patientName?: string; patientCode?: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="font-display text-lg font-bold text-navy">Digital prescription</p>
          <p className="font-mono text-sm text-muted-foreground">{rx.prescription_number}</p>
        </div>
        <div className="text-right text-sm">
          <p>Issued {fmtDateTime(rx.issued_at)}</p>
          <p className="text-muted-foreground">by {rx.doctor?.full_name}</p>
        </div>
      </div>
      {patientName && (
        <p className="mt-4 text-sm">Patient: <strong>{patientName}</strong> {patientCode && <span className="font-mono text-muted-foreground">({patientCode})</span>}</p>
      )}
      {rx.consultation && <p className="mt-1 text-sm text-muted-foreground">Linked consultation: {rx.consultation.reason} ({fmtDate(rx.consultation.consultation_date)})</p>}
      <div className="mt-4 space-y-3">
        {rx.prescription_items.map((it) => (
          <div key={it.id} className="rounded-lg bg-muted p-4">
            <p className="font-semibold">{it.medication_name}</p>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted-foreground">Dosage</dt><dd>{it.dosage}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Frequency</dt><dd>{it.frequency}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Duration</dt><dd>{it.duration}</dd></div>
            </dl>
            {it.instructions && <p className="mt-2 text-sm"><span className="text-muted-foreground">Instructions: </span>{it.instructions}</p>}
          </div>
        ))}
      </div>
      {rx.notes && <p className="mt-4 text-sm"><span className="text-muted-foreground">Notes: </span>{rx.notes}</p>}
      <p className="mt-6 border-t pt-3 text-xs text-muted-foreground">Prototype record — not valid for dispensing. Signed prescriptions cannot be edited by patients.</p>
    </div>
  );
}

export function downloadRx(rx: Rx, patientName?: string) {
  const lines = [
    "MEDIVAULT AI — DIGITAL PRESCRIPTION SUMMARY (PROTOTYPE, NOT VALID FOR DISPENSING)",
    `Number: ${rx.prescription_number}`,
    `Patient: ${patientName ?? ""}`,
    `Prescriber: ${rx.doctor?.full_name ?? ""}`,
    `Issued: ${fmtDateTime(rx.issued_at)}`,
    "",
    ...rx.prescription_items.flatMap((i) => [
      `- ${i.medication_name}`,
      `  Dosage: ${i.dosage}`,
      `  Frequency: ${i.frequency}`,
      `  Duration: ${i.duration}`,
      ...(i.instructions ? [`  Instructions: ${i.instructions}`] : []),
    ]),
    "",
    rx.notes ? `Notes: ${rx.notes}` : "",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${rx.prescription_number}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
