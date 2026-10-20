import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldPlus, FileHeart, Stethoscope, Sparkles, Lock, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/DemoBanner";
import { ensureDemo, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo.functions";
import { errMsg } from "@/lib/me";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediVault AI — Personal health records & digital prescriptions" },
      { name: "description", content: "Store your medical history in one secure place, receive digital prescriptions from authorised doctors, and understand your records with AI." },
      { property: "og:title", content: "MediVault AI — Your health record, in one place" },
      { property: "og:description", content: "Patient-controlled health records and digital prescriptions for South Africa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const ensure = useServerFn(ensureDemo);
  const [busy, setBusy] = useState(false);
  async function prepare() {
    setBusy(true);
    try {
      const r = await ensure();
      toast.success(r.created ? "Demo accounts created" : "Demo accounts are ready");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const features = [
    { icon: FileHeart, title: "One lifelong record", text: "Consultations, diagnoses, allergies and prescriptions in a single timeline." },
    { icon: Stethoscope, title: "Doctor workflow", text: "Verified professionals find you by patient ID, confirm your identity and ask your permission." },
    { icon: Lock, title: "You control access", text: "Approve, review and revoke access. Every view and change is audit-logged." },
    { icon: Sparkles, title: "AI that explains", text: "Plain-language explanations of what's recorded — never new diagnoses or dosages." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-6">
          <nav className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-lg font-bold"><ShieldPlus className="h-6 w-6" /> MediVault AI</span>
            <div className="flex gap-2"><Button asChild variant="heroOutline" size="sm"><Link to="/presentation" search={{ slide: 1, print: false }}>Stakeholder slides</Link></Button><Button asChild variant="heroOutline" size="sm"><Link to="/auth">Sign in</Link></Button></div>
          </nav>
          <div className="mt-20 max-w-2xl">
            <p className="mb-4 inline-block rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium">Built for South African healthcare · POPIA-aligned principles</p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">Your medical history. Finally in one place.</h1>
            <p className="mt-5 text-lg text-primary-foreground/80">Replace paper files and lost scripts with a secure digital record you own — shared only with the doctors you authorise.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg"><Link to="/auth">Get started</Link></Button>
              <Button asChild variant="heroOutline" size="lg"><a href="#demo">Try the demo</a></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border bg-secondary p-6 md:p-8">
          <h2 className="text-2xl font-bold">Demonstration accounts</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">All people, records and medications are fictional. Click "Prepare demo" once, then sign in with any account below. Password for all: <code className="rounded bg-card px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code></p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} onClick={() => { navigator.clipboard.writeText(a.email); toast.success("Email copied"); }}
                className="flex items-center justify-between rounded-lg border bg-card p-3 text-left text-sm hover:border-primary">
                <span><span className="block font-medium">{a.label}</span><span className="font-mono text-xs text-muted-foreground">{a.email}</span></span>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <Button className="mt-5" onClick={prepare} disabled={busy}>{busy && <Loader2 className="animate-spin" />}Prepare demo</Button>
          <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Sign in as Thandi — note her patient ID and one-time access code on the dashboard.</li>
            <li>Sign in as Dr Naidoo — search the patient ID, confirm date of birth (18 Apr 1992) and enter the access code (or request access and approve as Thandi).</li>
            <li>Record a consultation and issue a prescription after reviewing it.</li>
            <li>Sign in as Thandi — open the notification, the prescription, and ask the AI assistant to explain it.</li>
          </ol>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-3xl px-4">MediVault AI is a prototype. Digital prescriptions here are not valid for dispensing. Real-world prescribing, electronic signatures, HPCSA verification and pharmacy integration require further implementation and regulatory review. Privacy design follows POPIA principles but has not been legally assessed.</p>
      </footer>
    </div>
  );
}
