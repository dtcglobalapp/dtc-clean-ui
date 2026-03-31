import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";
import { prepareSquareImage } from "../core/image-tools.js";

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";
const STORAGE_BUCKET = "dtc-documents";

const params = new URLSearchParams(window.location.search);
const guardianId = params.get("id");

const el = (id) => document.getElementById(id);

const pageTitle = el("pageTitle");

const firstName = el("firstName");
const middleName = el("middleName");
const lastName = el("lastName");
const relationshipDefault = el("relationshipDefault");
const email = el("email");
const phone = el("phone");
const whatsapp = el("whatsapp");
const status = el("status");
const pin = el("pin");
const governmentIdType = el("governmentIdType");
const governmentIdLast4 = el("governmentIdLast4");
const pinEnabled = el("pinEnabled");
const faceScanEnabled = el("faceScanEnabled");
const notes = el("notes");
const photoInput = el("photoInput");
const photoPreview = el("photoPreview");
const saveBtn = el("saveBtn");

let selectedPhotoBlob = null;
let selectedPhotoName = null;
let existingPhotoUrl = null;

function buildPhotoPath(fileName) {
  const safeName = String(fileName || "guardian-photo")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");

  return `guardians/${Date.now()}-${safeName}`;
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

  const idLast4 = governmentIdLast4.value.trim();
  if (idLast4 && !/^\d{4}$/.test(idLast4)) {
    alert("Government ID Last 4 must contain exactly 4 digits.");
    return false;
  }

  return true;
}

function setSaving(isSaving) {
  if (!saveBtn) return;
  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "Saving..." : "Save Guardian";
}

async function uploadPhotoIfNeeded() {
  if (!selectedPhotoBlob) {
    return existingPhotoUrl;
  }

  const storagePath = buildPhotoPath(selectedPhotoName || "guardian-photo.jpg");

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

async function loadGuardian() {
  if (!guardianId) return;

  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("id", guardianId)
    .single();

  if (error) throw error;
  if (!data) return;

  firstName.value = data.first_name || "";
  middleName.value = data.middle_name || "";
  lastName.value = data.last_name || "";
  relationshipDefault.value = data.relationship_default || "";
  email.value = data.email || "";
  phone.value = data.phone || "";
  whatsapp.value = data.whatsapp || "";
  status.value = data.status || "active";
  pin.value = data.pin || "";
  governmentIdType.value = data.government_id_type || "";
  governmentIdLast4.value = data.government_id_last4 || "";
  pinEnabled.checked = Boolean(data.pin_enabled);
  faceScanEnabled.checked = Boolean(data.face_scan_enabled);
  notes.value = data.notes || "";

  existingPhotoUrl = data.photo_url || null;
  if (existingPhotoUrl && photoPreview) {
    photoPreview.src = existingPhotoUrl;
  }
}

async function saveGuardian() {
  if (!validateForm()) return;

  setSaving(true);

  try {
    const photoUrl = await uploadPhotoIfNeeded();

    const payload = {
      organization_id: ORGANIZATION_ID,
      first_name: firstName.value.trim(),
      middle_name: middleName.value.trim() || null,
      last_name: lastName.value.trim(),
      photo_url: photoUrl,
      email: email.value.trim() || null,
      phone: phone.value.trim() || null,
      whatsapp: whatsapp.value.trim() || null,
      relationship_default: relationshipDefault.value || null,
      status: status.value,
      pin: pin.value.trim() || null,
      pin_enabled: pinEnabled.checked,
      face_scan_enabled: faceScanEnabled.checked,
      government_id_type: governmentIdType.value || null,
      government_id_last4: governmentIdLast4.value.trim() || null,
      notes: notes.value.trim() || null,
    };

    if (guardianId) {
      const { error } = await supabase
        .from("guardians")
        .update(payload)
        .eq("id", guardianId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("guardians")
        .insert([payload]);

      if (error) throw error;
    }

    window.location.href = "./guardians-list.html";
  } catch (error) {
    console.error("Save guardian error:", error);
    alert(error.message || "Could not save guardian.");
  } finally {
    setSaving(false);
  }
}

async function boot() {
  await requireAuth();
  await getAppConfig();

  pageTitle.textContent = guardianId ? "Edit Guardian" : "Add Guardian";
  await loadGuardian();
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
    console.error("Prepare guardian photo error:", error);
    alert("Could not prepare image.");
  }
});

saveBtn?.addEventListener("click", saveGuardian);

boot();