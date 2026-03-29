import { supabase } from "../auth.js";

export async function getCurrentOrganization() {
  // 1. obtener usuario actual
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) return null;

  // 2. buscar organización del usuario
  const { data: orgUser, error: orgError } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (orgError || !orgUser) return null;

  // 3. traer organización
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgUser.organization_id)
    .maybeSingle();

  if (error) return null;

  return org;
}

export async function applyBranding() {
  const org = await getCurrentOrganization();

  if (!org) return;

  const appName = org.app_name || "DTC";
  const businessName = org.name || "Business";

  // 👉 título del navegador
  document.title = `${appName} — Dashboard`;

  // 👉 header eyebrow (DTC CLEAN)
  const brandEl = document.querySelector("[data-brand]");
  if (brandEl) brandEl.textContent = appName;

  // 👉 nombre del negocio (Miriam Group Daycare)
  const businessEl = document.querySelector("[data-business]");
  if (businessEl) businessEl.textContent = businessName;
}