import { supabase } from "../auth.js";

const DEFAULT_BRAND = {
  shortName: "DTC",
  verticalName: "Control Total (Daycares)",
  businessName: "Business",
};

async function getCurrentSessionUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("brand.js getSession error:", error);
    return null;
  }

  return session?.user ?? null;
}

async function getCurrentOrganizationUser(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("brand.js organization_users error:", error);
    return null;
  }

  return data ?? null;
}

async function getOrganizationById(organizationId) {
  if (!organizationId) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("brand.js organizations error:", error);
    return null;
  }

  return data ?? null;
}

function normalizeBranding(org) {
  if (!org) {
    return { ...DEFAULT_BRAND };
  }

  const shortName =
    org.app_name ||
    org.brand_name ||
    org.short_name ||
    org.system_name ||
    DEFAULT_BRAND.shortName;

  const verticalName =
    org.vertical_name ||
    org.brand_vertical ||
    org.app_subtitle ||
    org.description ||
    DEFAULT_BRAND.verticalName;

  const businessName =
    org.name ||
    org.business_name ||
    org.organization_name ||
    DEFAULT_BRAND.businessName;

  return {
    shortName: String(shortName).trim() || DEFAULT_BRAND.shortName,
    verticalName: String(verticalName).trim() || DEFAULT_BRAND.verticalName,
    businessName: String(businessName).trim() || DEFAULT_BRAND.businessName,
  };
}

function applyText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
}

function applyMetaTitle(shortName, verticalName) {
  const pageTitleEl = document.querySelector("[data-page-title]");
  const pageTitle = pageTitleEl?.textContent?.trim() || document.title || "Dashboard";
  document.title = `${shortName} — ${pageTitle}`;
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) {
    appleTitle.setAttribute("content", shortName);
  }

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && !metaDescription.getAttribute("content")) {
    metaDescription.setAttribute("content", `${shortName} ${verticalName}`);
  }
}

function applyBrandingToDom(branding) {
  applyText("[data-brand]", branding.shortName);
  applyText("[data-brand-vertical]", branding.verticalName);
  applyText("[data-business]", branding.businessName);

  const brandCombo = `${branding.shortName}\n${branding.verticalName}`;
  document.querySelectorAll("[data-brand-combo]").forEach((el) => {
    el.innerHTML = `
      <span class="brand-short">${escapeHtml(branding.shortName)}</span>
      <span class="brand-vertical">${escapeHtml(branding.verticalName)}</span>
    `;
  });

  applyMetaTitle(branding.shortName, branding.verticalName);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function getCurrentOrganization() {
  const user = await getCurrentSessionUser();
  if (!user) return null;

  const orgUser = await getCurrentOrganizationUser(user.id);
  if (!orgUser?.organization_id) return null;

  return await getOrganizationById(orgUser.organization_id);
}

export async function getBranding() {
  const org = await getCurrentOrganization();
  return normalizeBranding(org);
}

export async function applyBranding() {
  const branding = await getBranding();
  applyBrandingToDom(branding);
  return branding;
}