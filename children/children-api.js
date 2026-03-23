import { supabase } from "../auth.js";

export async function getChildren() {
  const { data, error } = await supabase
    .from("children")
    .select(`
      id,
      organization_id,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      enrollment_date,
      status,
      classroom,
      notes,
      photo_url,
      created_at,
      updated_at
    `)
    .order("first_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChildById(childId) {
  const { data, error } = await supabase
    .from("children")
    .select(`
      id,
      organization_id,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      enrollment_date,
      status,
      classroom,
      notes,
      photo_url,
      created_at,
      updated_at
    `)
    .eq("id", childId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createChild(payload) {
  const { data, error } = await supabase
    .from("children")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateChild(childId, payload) {
  const { data, error } = await supabase
    .from("children")
    .update(payload)
    .eq("id", childId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}