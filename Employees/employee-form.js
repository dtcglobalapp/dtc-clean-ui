import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";
import { t } from "../core/i18n.js";
import { prepareSquareImage } from "../core/image-tools.js";

const params = new URLSearchParams(window.location.search);
const employeeId = params.get("id");

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";
const STORAGE_BUCKET = "dtc-documents";

const el = (id) => document.getElementById(id);

const firstName = el("firstName");
const lastName = el("lastName");
const email = el("email");
const phone = el("phone");
const role = el("role");
const status = el("status");
const pin = el("pin");
const pinEnabled = el("pinEnabled");
const faceEnabled = el("faceEnabled");
const saveBtn = el("saveBtn");
const photoInput = el("photoInput");
const photoPreview = el("photoPreview");

const brandMain = el("brandMain");
const brandSub = el("brandSub");
const pageTitle = el("pageTitle");
const pageSubtitle = el("pageSubtitle");

let selectedPhotoBlob = null;
let selectedPhotoName = null;
let existingPhotoUrl = null;

function buildDisplayName() {
  return `${firstName.value.trim()} ${lastName.value.trim()}`.replace(/\s+/g, " ").trim();
}

function buildPhotoPath(fileName) {
  const safeName = String(fileName || "employee-photo")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");

  return `employees/${Date.now()}-${safeName}`;
}

function validateForm() {
  if (!firstName.value.trim()) {
    alert("First Name is required.");
    return false;
  }

  if (!lastName.value.trim()) {
    alert("Last Name is required.");
    return false;
  }

  const pinValue = pin.value.trim();
  if (pinValue && !/^\d{4,8}$/.test(pinValue)) {
    alert("PIN must contain 4 to 8 digits.");
    return false;
  }

  return true;
}

function setSaving(isSaving) {
  if (!saveBtn) return;
  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "Saving..." : "Save";
}

async function uploadPhotoIfNeeded() {
  if (!selectedPhotoBlob) {
    return existingPhotoUrl;
  }

  const storagePath = buildPhotoPath(selectedPhotoName || "employee-photo.jpg");

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, selectedPhotoBlob, {
      upsert: false,
      contentType: selectedPhotoBlob.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
}

async function loadEmployee() {
  if (!employeeId) return;

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (error) throw error;
  if (!data) return;

  firstName.value = data.first_name || "";
  lastName.value = data.last_name || "";
  email.value = data.email || "";
  phone.value = data.phone || "";
  role.value = data.role || "employee";
  status.value = data.status || "active";
  pin.value = data.pin || "";
  pinEnabled.checked = Boolean(data.pin_enabled);
  faceEnabled.checked = Boolean(data.face_scan_enabled);

  existingPhotoUrl = data.photo_url || null;
  if (existingPhotoUrl && photoPreview) {
    photoPreview.src = existingPhotoUrl;
  }
}

async function saveEmployee() {
  if (!validateForm()) return;

  setSaving(true);

  try {
    const photoUrl = await uploadPhotoIfNeeded();

    const payload = {
      organization_id: ORGANIZATION_ID,
      first_name: firstName.value.trim(),
      middle_name: null,
      last_name: lastName.value.trim(),
      display_name: buildDisplayName(),
      photo_url: photoUrl,
      email: email.value.trim() || null,
      phone: phone.value.trim() || null,
      role: role.value,
      status: status.value,
      pin: pin.value.trim() || null,
      pin_enabled: pinEnabled.checked,
      face_scan_enabled: faceEnabled.checked,
      primary_location_label: "Main Daycare",
      allowed_checkin_radius_meters: 150,
    };

    if (employeeId) {
      const { error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", employeeId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("employees")
        .insert([payload]);

      if (error) throw error;
    }

    window.location.href = "./employees-list.html";
  } catch (error) {
    console.error("Save employee error:", error);
    alert(error.message || "Could not save employee.");
  } finally {
    setSaving(false);
  }
}

async function boot() {
  await requireAuth();

  const config = await getAppConfig();

  brandMain.textContent = config.platform_name;
  brandSub.textContent = config.vertical_name;

  if (employeeId) {
    pageTitle.textContent = t("employeeForm.editTitle");
  } else {
    pageTitle.textContent = t("employeeForm.addTitle");
  }

  pageSubtitle.textContent = t("employeeForm.subtitle");

  await loadEmployee();
}

photoInput?.addEventListener("change", async () => {
  const file = photoInput.files?.[0] || null;
  if (!file || !photoPreview) return;

  try {
    const prepared = await prepareSquareImage(file, {
      size: 600,
      type: "image/jpeg",
      quality: 0.88,
    });

    selectedPhotoBlob = prepared.blob;
    selectedPhotoName = prepared.fileName;
    photoPreview.src = prepared.previewUrl;
  } catch (error) {
    console.error("Prepare employee photo error:", error);
    alert("Could not prepare image.");
  }
});

saveBtn?.addEventListener("click", saveEmployee);

boot();