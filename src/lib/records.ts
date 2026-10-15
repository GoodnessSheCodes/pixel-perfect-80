import { supabase } from "@/integrations/supabase/client";

export const CONSULT_SELECT = "*, doctor:profiles!consultations_doctor_id_fkey(full_name)";
export const RX_SELECT = "*, doctor:profiles!prescriptions_doctor_id_fkey(full_name), prescription_items(*), consultation:consultations(id, reason, consultation_date, diagnosis)";

export async function getPatient(id: string) {
  const { data, error } = await supabase.from("patients").select("*, profile:profiles!patients_user_id_fkey(full_name, username, email, phone)").eq("user_id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function getConsultations(patientId: string) {
  const { data, error } = await supabase.from("consultations").select(CONSULT_SELECT).eq("patient_id", patientId).order("consultation_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function getPrescriptions(filter: { patient_id?: string; doctor_id?: string }) {
  let q = supabase.from("prescriptions").select(RX_SELECT).order("issued_at", { ascending: false });
  if (filter.patient_id) q = q.eq("patient_id", filter.patient_id);
  if (filter.doctor_id) q = q.eq("doctor_id", filter.doctor_id);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
export type Rx = Awaited<ReturnType<typeof getPrescriptions>>[number];
export type Consult = Awaited<ReturnType<typeof getConsultations>>[number];
