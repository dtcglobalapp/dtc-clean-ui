import { supabase } from "../../../auth.js";

export async function fetchChild(childId) {
  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, last_name")
    .eq("id", childId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchLinkedGuardians(childId) {
  const { data, error } = await supabase
    .from("v_child_guardians_detailed")
    .select("*")
    .eq("child_id", childId);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchAvailableGuardians() {
  let firstTry = await supabase
    .from("guardians")
    .select("id, first_name, last_name, display_name, phone, email, photo_url")
    .order("first_name", { ascending: true });

  if (!firstTry.error) {
    return Array.isArray(firstTry.data) ? firstTry.data : [];
  }

  let secondTry = await supabase
    .from("guardians")
    .select("*");

  if (secondTry.error) throw secondTry.error;
  return Array.isArray(secondTry.data) ? secondTry.data : [];
}

export async function clearOtherPrimaryLinks(childId, keepLinkId) {
  const { error } = await supabase
    .from("child_guardians")
    .update({ is_primary: false })
    .eq("child_id", childId)
    .neq("id", keepLinkId);

  if (error) throw error;
}

export async function updateChildGuardianLink(linkId, payload) {
  const { error } = await supabase
    .from("child_guardians")
    .update(payload)
    .eq("id", linkId);

  if (error) throw error;
}

export async function insertChildGuardianLink(payload) {
  const { error } = await supabase
    .from("child_guardians")
    .insert(payload);

  if (error) throw error;
}

export async function deleteChildGuardianLink(linkId) {
  const { error } = await supabase
    .from("child_guardians")
    .delete()
    .eq("id", linkId);

  if (error) throw error;
}