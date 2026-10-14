import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEMO_PASSWORD = "MediVault!2026";
export const DEMO_ACCOUNTS = [
  { email: "thandi@medivault.demo", label: "Patient — Thandi Molefe" },
  { email: "dr.naidoo@medivault.demo", label: "Verified doctor — Dr Priya Naidoo" },
  { email: "dr.dlamini@medivault.demo", label: "Unverified doctor — Dr Sipho Dlamini" },
  { email: "admin@medivault.demo", label: "Administrator" },
];

async function seed() {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const mk = async (email: string, meta: Record<string, unknown>) => {
    const { data, error } = await a.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { ...meta, is_demo: true },
    });
    if (error) throw new Error(`Could not create ${email}: ${error.message}`);
    return data.user!.id;
  };

  const thandi = await mk("thandi@medivault.demo", { role: "patient", full_name: "Thandi Molefe", username: "thandi.molefe", date_of_birth: "1992-04-18" });
  const naidoo = await mk("dr.naidoo@medivault.demo", { role: "doctor", full_name: "Dr Priya Naidoo", hpcsa_number: "MP 0123456 (demo)", specialty: "General Practitioner", practice_name: "Rosebank Family Practice (fictional)" });
  const khumalo = await mk("dr.khumalo@medivault.demo", { role: "doctor", full_name: "Dr Lerato Khumalo", hpcsa_number: "MP 0654321 (demo)", specialty: "General Practitioner", practice_name: "Soweto Community Clinic (fictional)" });
  await mk("dr.dlamini@medivault.demo", { role: "doctor", full_name: "Dr Sipho Dlamini", hpcsa_number: "MP 0999999 (demo)", specialty: "Family Medicine", practice_name: "Durban North Medical (fictional)" });
  const admin = await mk("admin@medivault.demo", { role: "patient", full_name: "Demo Administrator" });

  // admin: swap role, remove patient record
  await a.from("patients").delete().eq("user_id", admin);
  await a.from("user_roles").delete().eq("user_id", admin);
  await a.from("user_roles").insert({ user_id: admin, role: "admin" });

  await a.from("doctor_profiles").update({ verification_status: "verified", reviewed_at: new Date().toISOString() }).in("user_id", [naidoo, khumalo]);
  await a.from("patients").update({
    allergies: ["Penicillin (rash and hives)"],
    conditions: ["Mild intermittent asthma"],
    blood_type: "O+",
    sex: "Female",
    emergency_contact: "Sizwe Molefe (brother) — 082 000 0000 (fictional)",
  }).eq("user_id", thandi);
  await a.from("profiles").update({ phone: "071 000 0000 (fictional)" }).eq("id", thandi);

  const { data: c1 } = await a.from("consultations").insert({
    patient_id: thandi, doctor_id: khumalo, consultation_date: "2026-03-12",
    reason: "Persistent cough and wheezing for one week",
    findings: "Expiratory wheeze bilaterally, no fever, SpO2 97% on room air.",
    diagnosis: "Acute exacerbation of mild intermittent asthma",
    treatment_plan: "Short-acting bronchodilator as needed. Avoid known triggers (dust, smoke).",
    follow_up_instructions: "Return if symptoms worsen or inhaler is needed more than 3 times a week.",
  }).select("id").single();
  await a.from("consultations").insert({
    patient_id: thandi, doctor_id: khumalo, consultation_date: "2026-07-02",
    reason: "Annual wellness check",
    findings: "BP 118/76 mmHg, BMI 23.4. Chest clear.",
    diagnosis: "Healthy adult; asthma well controlled",
    treatment_plan: "Continue current asthma plan. Routine blood tests normal.",
    follow_up_instructions: "Next wellness check in 12 months.",
    follow_up_date: "2027-07-02",
  });
  const { data: rx } = await a.from("prescriptions").insert({
    patient_id: thandi, doctor_id: khumalo, consultation_id: c1!.id, notes: "Demonstration prescription — fictional.",
    issued_at: "2026-03-12T10:30:00Z", viewed_at: "2026-03-12T14:00:00Z",
  }).select("id").single();
  await a.from("prescription_items").insert({
    prescription_id: rx!.id, medication_name: "Salbutamol inhaler 100 mcg (demo)", dosage: "2 puffs",
    frequency: "As needed, up to 4 times daily", duration: "3 months", instructions: "Shake well before use. Rinse mouth after use.",
  });
  await a.from("notifications").insert({ user_id: thandi, title: "Welcome to MediVault AI", body: "Your demo health record is ready.", link: "/patient" });
  await a.from("audit_logs").insert({ actor_id: null, action: "demo_seeded", details: {} });
}

async function wipe() {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { data: demo } = await a.from("profiles").select("id").eq("is_demo", true);
  const ids = (demo ?? []).map((d) => d.id);
  if (ids.length) {
    const { data: rxs } = await a.from("prescriptions").select("id").or(`doctor_id.in.(${ids.join(",")}),patient_id.in.(${ids.join(",")})`);
    if (rxs?.length) await a.from("prescriptions").delete().in("id", rxs.map((r) => r.id));
    await a.from("consultations").delete().in("doctor_id", ids);
    for (const id of ids) await a.auth.admin.deleteUser(id);
  }
}

export const ensureDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin: a } = await import("@/integrations/supabase/client.server");
  const { count } = await a.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", true);
  if ((count ?? 0) > 0) return { created: false };
  await seed();
  return { created: true };
});

export const resetDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only administrators can reset demo data");
    await wipe();
    await seed();
    return { ok: true };
  });
