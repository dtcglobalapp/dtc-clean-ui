import { supabase } from "../../../auth.js";

async function getCurrentOrganizationId() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data: membership, error: membershipError } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (membershipError) throw membershipError;
  if (!membership?.organization_id) {
    throw new Error("No organization found for this user.");
  }

  return membership.organization_id;
}

export async function fetchChild(childId) {
  const orgId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("children")
    .select("id, organization_id, first_name, last_name")
    .eq("id", childId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchLinkedGuardians(childId) {
  const orgId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("v_child_guardians_detailed")
    .select("*")
    .eq("child_id", childId)
    .eq("organization_id", orgId);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchAvailableGuardians() {
  const orgId = await getCurrentOrganizationId();

  const { data, error } = await supabase
    .from("guardians")
    .select(`
      id,
      organization_id,
      first_name,
      last_name,
      middle_name,
      relationship_to_child,
      relationship_default,
      phone,
      phone_extension,
      secondary_phone,
      secondary_phone_extension,
      preferred_contact_method,
      email,
      whatsapp,
      photo_url,
      status
    `)
    .eq("organization_id", orgId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function clearOtherPrimaryLinks(childId, keepLinkId) {
  const orgId = await getCurrentOrganizationId();

  const { error } = await supabase
    .from("child_guardians")
    .update({ is_primary: false })
    .eq("child_id", childId)
    .eq("organization_id", orgId)
    .neq("id", keepLinkId);

  if (error) throw error;
}

export async function updateChildGuardianLink(linkId, payload) {
  const orgId = await getCurrentOrganizationId();

  const cleanPayload = { ...payload };
  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { error } = await supabase
    .from("child_guardians")
    .update(cleanPayload)
    .eq("id", linkId)
    .eq("organization_id", orgId);

  if (error) throw error;
}

export async function insertChildGuardianLink(payload) {
  const orgId = await getCurrentOrganizationId();

  const cleanPayload = {
    ...payload,
    organization_id: orgId,
  };

  Object.keys(cleanPayload).forEach((key) => {
    if (cleanPayload[key] === undefined) {
      delete cleanPayload[key];
    }
  });

  const { error } = await supabase
    .from("child_guardians")
    .insert([cleanPayload]);

  if (error) throw error;
}

export async function deleteChildGuardianLink(linkId) {
  const orgId = await getCurrentOrganizationId();

  const { error } = await supabase
    .from("child_guardians")
    .delete()
    .eq("id", linkId)
    .eq("organization_id", orgId);

  if (error) throw error;
}