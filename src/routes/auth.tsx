import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchMe, homeFor, errMsg } from "@/lib/me";
import { DemoBanner } from "@/components/DemoBanner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MediVault AI" },
      { name: "description", content: "Sign in or register as a patient or healthcare professional." },
      { property: "og:title", content: "Sign in — MediVault AI" },
      { property: "og:description", content: "Access your MediVault AI health record." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [sent, setSent] = useState(false);

  async function goHome(): Promise<void> {
    const me = await fetchMe();
    if (me) navigate({ to: homeFor(me.role) });
  }

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in");
    void goHome();
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    const meta: Record<string, string> = { role, full_name: String(f.get("full_name")).trim() };
    if (role === "patient") {
      meta["username"] = String(f.get("username") || "").trim().toLowerCase();
      meta["date_of_birth"] = String(f.get("dob") || "");
      if (!meta["date_of_birth"]) return toast.error("Date of birth is required for identity verification");
    } else {
      meta["hpcsa_number"] = String(f.get("hpcsa") || "");
      meta["specialty"] = String(f.get("specialty") || "");
      meta["practice_name"] = String(f.get("practice") || "");
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password,
      options: { emailRedirectTo: window.location.origin, data: meta },
    });
    setLoading(false);
    if (error) return toast.error(errMsg(error));
    if (data.session) return goHome();
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-muted">
      <DemoBanner />
      <div className="mx-auto flex max-w-md flex-col px-4 py-10">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl font-bold text-navy">
          <ShieldPlus className="h-7 w-7 text-primary" /> MediVault AI
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          {sent ? (
            <div className="py-6 text-center">
              <h2 className="text-xl font-bold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link. Once confirmed, sign in to continue.</p>
              <Button className="mt-6" variant="outline" onClick={() => setSent(false)}>Back to sign in</Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field label="Email" name="email" type="email" />
                  <Field label="Password" name="password" type="password" />
                  <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Sign in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                  {(["patient", "doctor"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`rounded-md py-2 text-sm font-medium transition ${role === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                      {r === "patient" ? "I'm a patient" : "I'm a doctor"}
                    </button>
                  ))}
                </div>
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <Field label="Full name" name="full_name" />
                  {role === "patient" ? (
                    <>
                      <Field label="Username" name="username" required={false} hint="Optional — doctors can find you by this or your patient ID" />
                      <Field label="Date of birth" name="dob" type="date" hint="Used only to verify your identity at consultations" />
                    </>
                  ) : (
                    <>
                      <Field label="HPCSA registration number" name="hpcsa" />
                      <Field label="Specialty" name="specialty" required={false} />
                      <Field label="Practice name" name="practice" required={false} />
                      <p className="rounded-md bg-warning/15 p-3 text-xs text-warning-foreground">Doctor accounts stay unverified until an administrator approves them. Clinical functions are locked until then.</p>
                    </>
                  )}
                  <Field label="Email" name="email" type="email" />
                  <Field label="Password" name="password" type="password" hint="At least 8 characters" />
                  <p className="text-xs text-muted-foreground">By registering you agree that we process your personal information to provide this service, in line with POPIA principles. We collect only what is needed.</p>
                  <Button className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Create account</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", required = true, hint }: { label: string; name: string; type?: string; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
