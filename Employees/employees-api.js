import { supabase } from "../auth.js";

export async function getEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      organization_id,
      first_name,
      middle_name,
      last_name,
      display_name,
      photo_url,
      role,
      status,
      email,
      phone,
      pin,
      pin_enabled,
      face_scan_enabled,
      primary_location_label,
      allowed_checkin_radius_meters,
      notes,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}