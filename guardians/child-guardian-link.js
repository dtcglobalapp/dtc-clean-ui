import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const params = new URLSearchParams(window.location.search);
const preselectedChildId = params.get("child_id");

const el = (id) => document.getElementById(id);

const brandMain = el("brandMain");
const brandSub = el("brandSub");

const childSelect = el("childSelect");
const guardianSelect = el("guardianSelect");
const relationshipToChild = el("relationshipToChild");
const isPrimary = el("isPrimary");
const pickupAllowed = el("pickupAllowed");
const emergencyContact = el("emergencyContact");
const remoteSignatureAllowed = el("remoteSignatureAllowed");
const custodyNotes = el("custodyNotes");
const saveLinkBtn = el("saveLinkBtn");
const refreshBtn = el("refreshBtn");
const linksList = el("linksList");
const messageBox = el("messageBox");

let children = [];
let guardians = [];

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadChildren() {
  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, first_name, last_name")
    .eq("organization_id", ORGANIZATION_ID)
    .order("first_name", { ascending: true });

  if (error) throw error;
  children = data || [];

  childSelect.innerHTML = `
    <option value="">Select child</option>
    ${children
      .map((child) => {
        const name =
          child.display_name ||
          [child.first_name, child.last_name].filter(Boolean).join(" ") ||
          "Unnamed Child";
        return `<option value="${child.id}">${escapeHtml(name)}</option>`;
      })
      .join("")}
  `;

  if (preselectedChildId) {
    childSelect.value = preselectedChildId;
  }
}

async function loadGuardians() {
  const { data, error } = await supabase
    .from("guardians")
    .select("id, display_name, first_name, last_name")
    .eq("organization_id", ORGANIZATION_ID)
    .order("first_name", { ascending: true });

  if (error) throw error;
  guardians = data || [];

  guardianSelect.innerHTML = `
    <option value="">Select guardian</option>
    ${guardians
      .map((guardian) => {
        const name =
          guardian.display_name ||
          [guardian.first_name, guardian.last_name].filter(Boolean).join(" ") ||
          "Unnamed Guardian";
        return `<option value="${guardian.id}">${escapeHtml(name)}</option>`;
      })
      .join("")}
  `;
}

function renderLinks(rows) {
  if (!rows.length) {
    linksList.innerHTML = `
      <div class="state-box" style="grid-column:1/-1;">
        No guardian links found for this child.
      </div>
    `;
    return;
  }

  linksList.innerHTML = rows
    .map(
      (row) => `
        <article class="guardian-card">
          <div class="guardian-photo-wrap">
            <img
              class="guardian-photo"
              src="${escapeHtml(row.guardian_photo_url || "https://placehold.co/500x500?text=Guardian")}"
              alt="${escapeHtml(row.guardian_display_name || "Guardian")}"
            />
            <span class="badge ${escapeHtml(row.status || "active")}">${escapeHtml(row.status || "active")}</span>
          </div>

          <div class="guardian-body">
            <h3 class="guardian-name">${escapeHtml(row.guardian_display_name || "Guardian")}</h3>
            <p class="guardian-subtitle">${escapeHtml(row.relationship_to_child || row.guardian_relationship_default || "Guardian")}</p>

            <div class="guardian-meta">
              <div class="meta-row"><span class="meta-label">Primary</span><span class="meta-value">${row.is_primary ? "Yes" : "No"}</span></div>
              <div class="meta-row"><span class="meta-label">Pickup Allowed</span><span class="meta-value">${row.pickup_allowed ? "Yes" : "No"}</span></div>
              <div class="meta-row"><span class="meta-label">Emergency</span><span class="meta-value">${row.emergency_contact ? "Yes" : "No"}</span></div>
              <div class="meta-row"><span class="meta-label">Remote Signature</span><span class="meta-value">${row.remote_signature_allowed ? "Yes" : "No"}</span></div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

async function loadLinks() {
  const childId = childSelect.value;

  if (!childId) {
    linksList.innerHTML = `
      <div class="state-box" style="grid-column:1/-1;">
        Select a child to view assigned guardians.
      </div>
    `;
    return;
  }

  const { data, error } = await supabase
    .from("v_child_guardians_detailed")
    .select("*")
    .eq("organization_id", ORGANIZATION_ID)
    .eq("child_id", childId)
    .order("is_primary", { ascending: false });

  if (error) throw error;

  renderLinks(data || []);
}

async function saveLink() {
  hideMessage();

  if (!childSelect.value) {
    showMessage("Please select a child.", "error");
    return;
  }

  if (!guardianSelect.value) {
    showMessage("Please select a guardian.", "error");
    return;
  }

  try {
    if (isPrimary.checked) {
      await supabase
        .from("child_guardians")
        .update({ is_primary: false })
        .eq("organization_id", ORGANIZATION_ID)
        .eq("child_id", childSelect.value);
    }

    const payload = {
      organization_id: ORGANIZATION_ID,
      child_id: childSelect.value,
      guardian_id: guardianSelect.value,
      relationship_to_child: relationshipToChild.value || null,
      is_primary: isPrimary.checked,
      pickup_allowed: pickupAllowed.checked,
      emergency_contact: emergencyContact.checked,
      remote_signature_allowed: remoteSignatureAllowed.checked,
      custody_notes: custodyNotes.value.trim() || null,
      status: "active"
    };

    const { error } = await supabase
      .from("child_guardians")
      .upsert(payload, { onConflict: "child_id,guardian_id" });

    if (error) throw error;

    showMessage("Guardian link saved successfully.", "info");
    await loadLinks();
  } catch (error) {
    console.error("Save guardian-child link error:", error);
    showMessage(error.message || "Could not save guardian link.", "error");
  }
}

async function boot() {
  await requireAuth();

  const config = await getAppConfig();
  brandMain.textContent = config.platform_name;
  brandSub.textContent = config.vertical_name;

  await loadChildren();
  await loadGuardians();
  await loadLinks();
}

childSelect?.addEventListener("change", loadLinks);
refreshBtn?.addEventListener("click", loadLinks);
saveLinkBtn?.addEventListener("click", saveLink);

boot();