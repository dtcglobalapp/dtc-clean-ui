import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";

const params = new URLSearchParams(window.location.search);
const guardianId = params.get("id");

const el = (id) => document.getElementById(id);

const brandMain = el("brandMain");
const brandSub = el("brandSub");

const nameEl = el("name");
const relationshipEl = el("relationship");
const statusBadge = el("statusBadge");

const photoEl = el("photo");

const pinEl = el("pin");
const pinEnabledEl = el("pinEnabled");
const faceScanEl = el("faceScan");
const govIdEl = el("govId");

const emailEl = el("email");
const phoneEl = el("phone");
const whatsappEl = el("whatsapp");

const notesEl = el("notes");

const editBtn = el("editBtn");

function formatYesNo(value) {
  return value ? "Yes" : "No";
}

async function loadGuardian() {
  if (!guardianId) {
    alert("Missing guardian ID");
    return;
  }

  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("id", guardianId)
    .single();

  if (error) {
    console.error(error);
    alert("Error loading guardian");
    return;
  }

  if (!data) return;

  const fullName = [
    data.first_name,
    data.middle_name,
    data.last_name
  ].filter(Boolean).join(" ");

  nameEl.textContent = fullName || "Guardian";
  relationshipEl.textContent = data.relationship_default || "—";

  statusBadge.textContent = data.status || "active";
  statusBadge.className = `badge ${data.status}`;

  if (data.photo_url) {
    photoEl.src = data.photo_url;
  }

  pinEl.textContent = data.pin || "—";
  pinEnabledEl.textContent = formatYesNo(data.pin_enabled);
  faceScanEl.textContent = formatYesNo(data.face_scan_enabled);

  if (data.government_id_type || data.government_id_last4) {
    govIdEl.textContent = `${data.government_id_type || ""} • ${data.government_id_last4 || ""}`;
  }

  emailEl.textContent = data.email || "—";
  phoneEl.textContent = data.phone || "—";
  whatsappEl.textContent = data.whatsapp || "—";

  notesEl.textContent = data.notes || "No notes available.";
}

async function boot() {
  await requireAuth();

  const config = await getAppConfig();
  brandMain.textContent = config.platform_name;
  brandSub.textContent = config.vertical_name;

  editBtn.href = `./guardian-form.html?id=${guardianId}`;

  await loadGuardian();
}

boot();