import { supabase } from "../../core/supabase.js";

export async function fetchGuardianProfile({ organizationId, guardianId }) {
  if (!organizationId) throw new Error("organizationId is required");
  if (!guardianId) throw new Error("guardianId is required");

  const { data, error } = await supabase
    .from("guardians")
    .select(`
      id,
      organization_id,
      first_name,
      last_name,
      phone,
      email,
      status,
      relationship,
      preferred_language,
      address_line_1,
      address_line_2,
      city,
      state,
      zip_code,
      is_primary,
      is_emergency_contact,
      notes
    `)
    .eq("organization_id", organizationId)
    .eq("id", guardianId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchGuardianChildren({ organizationId, guardianId }) {
  if (!organizationId) throw new Error("organizationId is required");
  if (!guardianId) throw new Error("guardianId is required");

  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
      id,
      organization_id,
      child_id,
      relationship,
      is_authorized_pickup,
      is_primary_guardian,
      children (
        id,
        first_name,
        last_name,
        photo_url,
        status
      )
    `)
    .eq("organization_id", organizationId)
    .eq("guardian_id", guardianId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}