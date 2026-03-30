import { requireAuth, supabase } from "../auth.js";
import { getChildById, updateChild } from "./children-api.js";

const form = document.getElementById("childEditForm");
const loadingState = document.getElementById("loadingState");
const messageBox = document.getElementById("messageBox");
const guardiansMessageBox = document.getElementById("guardiansMessageBox");
const guardiansSection = document.getElementById("guardiansSection");
const saveBtn = document.getElementById("saveBtn");
const dobInput = document.getElementById("date_of_birth");
const classroomSelect = document.getElementById("classroom");
const photoInput = document.getElementById("photo_file");
const photoPreview = document.getElementById("photoPreview");
const selectedPhotoName = document.getElementById("selectedPhotoName");
const backToProfileBtn = document.getElementById("backToProfileBtn");
const cancelToProfileBtn = document.getElementById("cancelToProfileBtn");

const assignedGuardiansEmpty = document.getElementById("assignedGuardiansEmpty");
const assignedGuardiansList = document.getElementById("assignedGuardiansList");
const existingGuardianSelect = document.getElementById("existing_guardian_id");
const linkGuardianForm = document.getElementById("linkGuardianForm");
const createGuardianForm = document.getElementById("createGuardianForm");
const guardianPhotoInput = document.getElementById("guardian_photo_file");
const guardianSelectedPhotoName = document.getElementById("guardianSelectedPhotoName");

const params = new URLSearchParams(window.location.search);
const childId = params.get("id");

let currentChild = null;
let selectedGuardianPhotoFile = null;
let currentOrganizationId = null;

function normalizePhone(v = "") {
  return String(v).replace(/\D/g, "");
}

function normalizeEmail(v = "") {
  return String(v).trim().toLowerCase();
}

function setNavigationLinks() {
  const profileUrl = childId
    ? `../children/child-profile.html?id=${encodeURIComponent(childId)}`
    : "../children/children-list.html";

  if (backToProfileBtn) backToProfileBtn.href = profileUrl;
  if (cancelToProfileBtn) cancelToProfileBtn.href = profileUrl;
}

async function getCurrentUserAndOrg() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  return data.organization_id;
}

async function createGuardianAndAssign() {
  const payload = {
    organization_id: currentOrganizationId,
    first_name: document.getElementById("guardian_first_name").value.trim(),
    last_name: document.getElementById("guardian_last_name").value.trim(),
    relationship_to_child:
      document.getElementById("guardian_relationship").value || null,

    phone: normalizePhone(
      document.getElementById("guardian_phone").value
    ) || null,

    phone_extension:
      document.getElementById("guardian_phone_extension").value.trim() || null,

    secondary_phone: normalizePhone(
      document.getElementById("guardian_secondary_phone").value
    ) || null,

    secondary_phone_extension:
      document.getElementById("guardian_secondary_phone_extension").value.trim() || null,

    email:
      normalizeEmail(document.getElementById("guardian_email").value) || null,

    preferred_contact_method:
      document.getElementById("guardian_preferred_contact_method").value || null,
  };

  // 🔥 LIMPIEZA CLAVE
  Object.keys(payload).forEach((k) => {
    if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
  });

  const { data: guardian, error } = await supabase
    .from("guardians")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("ERROR GUARDIAN:", error);
    throw error;
  }

  await supabase.from("child_guardians").insert([
    {
      child_id: childId,
      guardian_id: guardian.id,
      is_primary:
        document.getElementById("new_is_primary").value === "true",
      pickup_authorized:
        document.getElementById("new_pickup_authorized").value === "true",
      emergency_contact:
        document.getElementById("new_emergency_contact").value === "true",
    },
  ]);

  return guardian.id;
}

createGuardianForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await createGuardianAndAssign();

    guardiansMessageBox.textContent = "Guardian created ✔";
    await loadAssignedGuardians();
  } catch (err) {
    guardiansMessageBox.textContent = err.message;
  }
});

async function loadAssignedGuardians() {
  const { data } = await supabase
    .from("child_guardians")
    .select("*")
    .eq("child_id", childId);

  assignedGuardiansList.innerHTML = JSON.stringify(data, null, 2);
}

async function boot() {
  await requireAuth();

  setNavigationLinks();

  const child = await getChildById(childId);
  currentChild = child;

  currentOrganizationId = await getCurrentUserAndOrg();

  await loadAssignedGuardians();
}

boot();