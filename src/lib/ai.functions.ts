import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMERGENCY = /(chest pain|can'?t breathe|cannot breathe|difficulty breathing|unconscious|suicid|kill myself|overdose|severe bleeding|stroke|seizure|anaphyla|throat (is )?swelling)/i;

const SYSTEM = `You are the MediVault AI Health Information Assistant for a South African personal health record prototype.
You help a patient understand ONLY the information already recorded in their own medical record, provided below as RECORD.
Strict rules:
- Explain medical terminology in simple, friendly language (plain English, short sentences).
- When summarising prescriptions, repeat medication name, dosage, frequency and duration EXACTLY as recorded. Never change, round, or add to them.
- Never diagnose, never suggest starting, stopping or changing medication, never invent a prescription or dosage, never claim an unrecorded diagnosis.
- If the requested information is not in RECORD, say clearly: "This is not recorded in your MediVault record." Do not guess.
- When quoting, label recorded facts as "Recorded by your healthcare professional:" and your explanations as "Explanation:".
- If something cannot be answered safely, advise consulting a qualified healthcare professional.
- If the patient describes possible emergency symptoms, tell them to seek urgent care immediately (call 10177 or 112 from a mobile, or go to the nearest emergency unit).
- Keep answers under 300 words. Use short headings or bullet points when helpful.`;

type Msg = { role: "user" | "assistant"; content: string };

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[] }) => {
    if (!Array.isArray(d?.messages) || d.messages.length === 0) throw new Error("Message required");
    const messages = d.messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content ?? "").slice(0, 2000),
    }));
    return { messages };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const last = data.messages[data.messages.length - 1]?.content ?? "";
    if (EMERGENCY.test(last)) {
      return {
        mode: "safety" as const,
        text: "This sounds like it could be a medical emergency. Please get urgent help now: call 10177 (ambulance) or 112 from a mobile phone, or go to your nearest emergency unit. MediVault AI cannot assess emergencies.",
      };
    }

    const [{ data: profile }, { data: patient }, { data: cons }, { data: rxs }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase.from("patients").select("allergies, conditions, blood_type, date_of_birth").eq("user_id", userId).maybeSingle(),
      supabase.from("consultations").select("consultation_date, reason, findings, diagnosis, treatment_plan, follow_up_instructions, follow_up_date, doctor:profiles!consultations_doctor_id_fkey(full_name)").eq("patient_id", userId).order("consultation_date"),
      supabase.from("prescriptions").select("prescription_number, issued_at, notes, doctor:profiles!prescriptions_doctor_id_fkey(full_name), prescription_items(medication_name, dosage, frequency, duration, instructions)").eq("patient_id", userId).order("issued_at"),
    ]);
    if (!patient) throw new Error("The AI assistant is available to patient accounts only.");

    const record = JSON.stringify({ patient: profile?.full_name, ...patient, consultations: cons ?? [], prescriptions: rxs ?? [] }, null, 1);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      return {
        mode: "demo" as const,
        text: `Demo mode — no live AI service is configured.\n\nRecorded by your healthcare professional: you have ${cons?.length ?? 0} consultation(s) and ${rxs?.length ?? 0} prescription(s) on file.\n\nExplanation: once the AI service is connected, I can explain these records in plain language.`,
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: `${SYSTEM}\n\nRECORD (JSON):\n${record}`,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
        reasoning: { effort: "low" },
        store: false,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, body);
      if (res.status === 429) throw new Error("The AI assistant is busy. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits have run out for this workspace. Please top up to keep using the assistant.");
      if (res.status === 403) throw new Error("The AI service is not available for this workspace right now.");
      throw new Error("The AI assistant could not respond. Please try again later.");
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error("AI response failed");
        } catch (e) {
          if (e instanceof Error && e.message === "AI response failed") throw new Error("The AI assistant could not respond. Please try again later.");
        }
      }
    }
    if (!text.trim()) return { mode: "live" as const, text: "I couldn't produce an answer for that. Please consult your healthcare professional." };
    return { mode: "live" as const, text };
  });
