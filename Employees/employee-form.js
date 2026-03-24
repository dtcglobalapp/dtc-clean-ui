import { requireAuth, supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);
const employeeId = params.get("id");

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const formTitle = document.getElementById("formTitle");
const employeeForm = document.getElementById("employeeForm");

const photoInput = document.getElementById("photoInput");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const roleInput = document.getElementById("role");
const statusInput = document.getElementById("status");
const pinInput = document.getElementById("pin");
const pinEnabledInput = document.getElementById("pinEnabled");
const faceEnabledInput = document.getElementById("faceEnabled");

let selectedPhotoFile = null;
let existingPhotoUrl = "";

function buildDisplayName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function buildPhotoPath(fileName) {
  const safeName = String(fileName || "employee-photo")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");
  return `employees/${Date.now()}-${safeName}`;
}

async function uploadPhotoIfNeeded() {
  if (!selectedPhotoFile) {
    return existingPhotoUrl || null;
  }

  const storagePath = buildPhotoPath(selectedPhotoFile.name);

  const { error: uploadError } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, selectedPhotoFile, {
      upsert: false,
      contentType: selectedPhotoFile.type || "application/octet-stream",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("dtc-documents")
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

  formTitle.textContent = "Edit Employee";

  firstNameInput.value = data.first_name || "";
  lastNameInput.value = data.last_name || "";
  emailInput.value = data.email || "";
  phoneInput.value = data.phone || "";
  roleInput.value = data.role || "employee";
  statusInput.value = data.status || "active";
  pinInput.value = data.pin || "";
  pinEnabledInput.checked = Boolean(data.pin_enabled);
  faceEnabledInput.checked = Boolean(data.face_scan_enabled);

  existingPhotoUrl = data.photo_url || "";
}

async function saveEmployee(event) {
  event.preventDefault();

  const first_name = firstNameInput.value.trim();
  const last_name = lastNameInput.value.trim();
  const email = emailInput.value.trim() || null;
  const phone = phoneInput.value.trim() || null;
  const role = roleInput.value;
  const status = statusInput.value;
  const pin = pinInput.value.trim() || null;
  const pin_enabled = pinEnabledInput.checked;
  const face_scan_enabled = faceEnabledInput.checked;

  if (!first_name || !last_name) {
    alert("First Name and Last Name are required.");
    return;
  }

  if (pin && !/^\d{4,8}$/.test(pin)) {
    alert("PIN must be 4 to 8 digits.");
    return;
  }

  try {
    const photo_url = await uploadPhotoIfNeeded();

    const payload = {
      organization_id: ORGANIZATION_ID,
      first_name,
      middle_name: null,
      last_name,
      display_name: buildDisplayName(first_name, last_name),
      photo_url,
      role,
      status,
      email,
      phone,
      pin,
      pin_enabled,
      face_scan_enabled,
      primary_location_label: "Main Daycare",
      allowed_checkin_radius_meters: 150,
      notes: null,
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
  }
}

photoInput?.addEventListener("change", () => {
  selectedPhotoFile = photoInput.files?.[0] || null;
});

employeeForm?.addEventListener("submit", saveEmployee);

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  if (employeeId) {
    await loadEmployee();
  }
}

boot();