import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errMsg } from "@/lib/me";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/RecordBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/search")({
  head: () => ({ meta: [{ title: "Find a patient — MediVault AI" }] }),
  component: DoctorSearch,
});

type Hit = { patient_id: string; patient_code: string; display_name: string; birth_year: number };

function DoctorSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [dob, setDob] = useState("");
  const [shareCode, setShareCode] = useState("");

  const search = useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.rpc("search_patient", { _q: query });
      if (error) throw error;
      return data as Hit[];
    },
    onSuccess: (data) => { setHits(data); setSelected(null); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const request = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_access", {
        _patient: selected!.patient_id,
        _dob: dob,
        _share_code: shareCode || undefined,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (result) => {
      if (result === "approved") {
        toast.success("Access granted via one-time code.");
        navigate({ to: "/doctor/patient/$id", params: { id: selected!.patient_id } });
      } else {
        toast.success("Access request sent. The patient will be notified to approve it.");
        setSelected(null); setHits(null); setQ(""); setDob(""); setShareCode("");
      }
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Find a patient" subtitle="Search by patient ID or username. For privacy, results show initials and birth year only." />

      <Card title="Patient search">
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) search.mutate(q.trim()); }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. MV-1234-5678 or username" className="max-w-md" />
          <Button type="submit" disabled={search.isPending}><Search />Search</Button>
        </form>

        {hits && (
          <div className="mt-4">
            {hits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients matched that search. Check the ID with the patient.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {hits.map((h) => (
                  <li key={h.patient_id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="font-medium">{h.display_name}</p>
                      <p className="text-xs text-muted-foreground">Born {h.birth_year} · <span className="font-mono">{h.patient_code}</span></p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelected(h)}>Request access</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {selected && (
        <Card title="Verify identity & request access">
          <p className="mb-4 text-sm text-muted-foreground">
            To protect {selected.display_name}'s privacy, confirm their date of birth. If the patient is with you, they can give you their one-time access code instead.
          </p>
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => { e.preventDefault(); request.mutate(); }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="dob">Patient's date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="code" className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />One-time access code (optional, for in-person visits)</Label>
              <Input id="code" value={shareCode} onChange={(e) => setShareCode(e.target.value.toUpperCase())} placeholder="e.g. 8F2K1Q" className="font-mono" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={request.isPending}><ShieldCheck />{shareCode ? "Verify & open record" : "Send access request"}</Button>
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">All searches and access requests are recorded in the audit log.</p>
          </form>
        </Card>
      )}
    </div>
  );
}
