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

const guardianEditModal = document.getElementById("guardianEditModal");
const closeGuardianModalBtn = document.getElementById("closeGuardianModalBtn");
const cancelGuardianModalBtn = document.getElementById("cancelGuardianModalBtn");
const guardianEditForm = document.getElementById("guardianEditForm");
const guardianEditMessageBox = document.getElementById("guardianEditMessageBox");
const saveGuardianChangesBtn = document.getElementById("saveGuardianChangesBtn");

const params = new URLSearchParams(window.location.search);
const childId = params.get("id");

let currentChild = null;
let selectedPhotoFile = null;
let selectedGuardianPhotoFile = null;
let currentOrganizationId = null;
let currentGuardiansRows = [];

function showMessage(text, type = "info") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function showGuardiansMessage(text, type = "info") {
  if (!guardiansMessageBox) return;
  guardiansMessageBox.textContent = text;
  guardiansMessageBox.className = `message ${type}`;
}

function hideGuardiansMessage() {
  if (!guardiansMessageBox) return;
  guardiansMessageBox.textContent = "";
  guardiansMessageBox.className = "message hidden";
}

function showGuardianEditMessage(text, type = "info") {
  if (!guardianEditMessageBox) return;
  guardianEditMessageBox.textContent = text;
  guardianEditMessageBox.className = `message ${type}`;
}

function hideGuardianEditMessage() {
  if (!guardianEditMessageBox) return;
  guardianEditMessageBox.textContent = "";
  guardianEditMessageBox.className = "message hidden";
}

function setLoading(loading) {
  if (!saveBtn) return;
  saveBtn.disabled = loading;
  saveBtn.textContent = loading ? "Saving..." : "Save Changes";
}

function setGuardianEditLoading(loading) {
  if (!saveGuardianChangesBtn) return;
  saveGuardianChangesBtn.disabled = loading;
  saveGuardianChangesBtn.textContent = loading ? "Saving..." : "Save Guardian Changes";
}

function getDefaultPhoto() {
  return "https://placehold.co/320x320?text=Child+Photo";
}

function setPhotoPreview(url) {
  if (!photoPreview) return;
  photoPreview.src = url || getDefaultPhoto();
}

function setNavigationLinks() {
  const profileUrl = childId
    ? `./child-profile.html?id=${encodeURIComponent(childId)}`
    : "./children-list.html";

  if (backToProfileBtn) backToProfileBtn.href = profileUrl;
  if (cancelToProfileBtn) cancelToProfileBtn.href = profileUrl;
}

function parseDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function calculateClassroom(dob) {
  const parsed = parseDateOnly(dob);
  if (!parsed) return null;

  const today = new Date();
  let ageYears = today.getFullYear() - parsed.year;

  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  if (
    currentMonth < parsed.month ||
    (currentMonth === parsed.month && currentDay < parsed.day)
  ) {
    ageYears -= 1;
  }

  if (ageYears < 2) return "Infants";
  if (ageYears < 3) return "Toddlers";
  if (ageYears < 5) return "Preschool";
  return "School Age";
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function formatPhoneNumber(value = "") {
  const digits = normalizePhone(value);

  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  return value;
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function buildPhoneLine(phone, extension) {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return "—";
  if (extension && String(extension).trim()) {
    return `${formatted} ext. ${String(extension).trim()}`;
  }
  return formatted;
}

function buildContactActions(phone, email) {
  let digits = normalizePhone(phone);
  if (digits.length === 10) digits = `1${digits}`;

  const safeEmail = email ? String(email).trim() : "";

  const callLink = digits ? `<a class="link-btn" href="tel:+${digits}">Call</a>` : "";
  const textLink = digits ? `<a class="link-btn" href="sms:+${digits}">Text</a>` : "";
  const whatsappLink = digits ? `<a class="link-btn" href="https://wa.me/${digits}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : "";
  const emailLink = safeEmail ? `<a class="link-btn" href="mailto:${safeEmail}">Email</a>` : "";

  return [callLink, textLink, whatsappLink, emailLink].filter(Boolean).join("");
}

function fillForm(child) {
  document.getElementById("first_name").value = child.first_name ?? "";
  document.getElementById("middle_name").value = child.middle_name ?? "";
  document.getElementById("last_name").value = child.last_name ?? "";
  document.getElementById("date_of_birth").value = child.date_of_birth ?? "";
  document.getElementById("gender").value = child.gender ?? "";
  document.getElementById("enrollment_date").value = child.enrollment_date ?? "";
  document.getElementById("classroom").value = child.classroom ?? "";
  document.getElementById("status").value = child.status ?? "active";
  document.getElementById("notes").value = child.notes ?? "";
  setPhotoPreview(child.photo_url || getDefaultPhoto());
}

function getPayload(photoUrlOverride = null) {
  const dob = document.getElementById("date_of_birth").value;

  return {
    first_name: document.getElementById("first_name").value.trim(),
    middle_name: document.getElementById("middle_name").value.trim() || null,
    last_name: document.getElementById("last_name").value.trim(),
    date_of_birth: dob || null,
    gender: document.getElementById("gender").value || null,
    enrollment_date: document.getElementById("enrollment_date").value || null,
    classroom: calculateClassroom(dob),
    status: document.getElementById("status").value || "active",
    notes: document.getElementById("notes").value.trim() || null,
    photo_url: photoUrlOverride !== null ? photoUrlOverride : (currentChild?.photo_url || null),
  };
}

function buildPhotoPath(fileName) {
  const safeName = fileName.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return `child-photos/${childId}/${Date.now()}-${safeName}`;
}

function buildGuardianPhotoPath(guardianId, fileName) {
  const safeName = fileName.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return `guardian-photos/${guardianId}/${Date.now()}-${safeName}`;
}

async function getCurrentUserAndOrg() {
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

  return {
    user,
    organizationId: membership.organization_id,
  };
}

function guardianCard(item) {
  const guardian = item.guardians || {};
  const fullName =
    `${guardian.first_name || ""} ${guardian.last_name || ""}`.trim() ||
    "Unnamed Guardian";
  const relationship = guardian.relationship_to_child || "Guardian";
  const primaryPhone = buildPhoneLine(guardian.phone, guardian.phone_extension);
  const secondaryPhone = buildPhoneLine(guardian.secondary_phone, guardian.secondary_phone_extension);
  const email = guardian.email || "—";
  const actions = buildContactActions(guardian.phone, guardian.email);

  return `
    <article class="guardian-linked-card">
      <div class="guardian-linked-top">
        <div class="guardian-linked-avatar-wrap">
          <img
            class="guardian-linked-avatar"
            src="${guardian.photo_url || "https://placehold.co/120x120?text=Guardian"}"
            alt="${fullName}"
          />
        </div>

        <div class="guardian-linked-copy">
          <div class="guardian-card-header-row">
            <h4>${fullName}</h4>
            <button
              type="button"
              class="link-btn guardian-inline-edit-btn"
              data-guardian-id="${guardian.id}"
            >
              Edit
            </button>
          </div>

          <p><strong>Relationship:</strong> ${relationship}</p>
          <p><strong>Phone:</strong> ${primaryPhone}</p>
          ${secondaryPhone !== "—" ? `<p><strong>Secondary:</strong> ${secondaryPhone}</p>` : ""}
          <p><strong>Email:</strong> ${email}</p>
        </div>
      </div>

      <div class="guardian-linked-badges">
        ${item.is_primary ? '<span class="badge active">Primary</span>' : ""}
        ${item.pickup_authorized ? '<span class="badge approved">Pickup OK</span>' : '<span class="badge rejected">No Pickup</span>'}
        ${item.emergency_contact ? '<span class="badge waitlist">Emergency</span>' : ""}
      </div>

      <div class="row-actions guardian-actions-row">
        ${actions}
      </div>
    </article>
  `;
}

function openGuardianModal() {
  if (!guardianEditModal) return;
  guardianEditModal.classList.remove("hidden");
  guardianEditModal.setAttribute("aria-hidden", "false");
}

function closeGuardianModal() {
  if (!guardianEditModal) return;
  guardianEditModal.classList.add("hidden");
  guardianEditModal.setAttribute("aria-hidden", "true");
  hideGuardianEditMessage();
  guardianEditForm?.reset();
}

function fillGuardianEditForm(guardian) {
  document.getElementById("edit_guardian_id").value = guardian.id || "";
  document.getElementById("edit_guardian_first_name").value = guardian.first_name || "";
  document.getElementById("edit_guardian_last_name").value = guardian.last_name || "";
  document.getElementById("edit_guardian_relationship").value = guardian.relationship_to_child || "";
  document.getElementById("edit_guardian_phone").value = formatPhoneNumber(guardian.phone || "");
  document.getElementById("edit_guardian_phone_extension").value = guardian.phone_extension || "";
  document.getElementById("edit_guardian_secondary_phone").value = formatPhoneNumber(guardian.secondary_phone || "");
  document.getElementById("edit_guardian_secondary_phone_extension").value = guardian.secondary_phone_extension || "";
  document.getElementById("edit_guardian_email").value = guardian.email || "";
  document.getElementById("edit_guardian_preferred_contact_method").value = guardian.preferred_contact_method || "";
}

function getGuardianById(guardianId) {
  const found = currentGuardiansRows.find(
    (row) => row.guardians && row.guardians.id === guardianId
  );
  return found?.guardians || null;
}

async function loadAssignedGuardians() {
  if (!assignedGuardiansEmpty || !assignedGuardiansList) return;

  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
      id,
      guardian_id,
      is_primary,
      pickup_authorized,
      emergency_contact,
      guardians (
        id,
        first_name,
        last_name,
        relationship_to_child,
        phone,
        phone_extension,
        secondary_phone,
        secondary_phone_extension,
        preferred_contact_method,
        email,
        photo_url
      )
    `)
    .eq("child_id", childId);

  if (error) throw error;

  const rows = data ?? [];
  currentGuardiansRows = rows;

  if (!rows.length) {
    assignedGuardiansEmpty.classList.remove("hidden");
    assignedGuardiansList.classList.add("hidden");
    assignedGuardiansList.innerHTML = "";
    return;
  }

  assignedGuardiansEmpty.classList.add("hidden");
  assignedGuardiansList.classList.remove("hidden");
  assignedGuardiansList.innerHTML = rows.map(guardianCard).join("");
}

async function loadExistingGuardiansOptions() {
  if (!existingGuardianSelect) return;

  const { data, error } = await supabase
    .from("guardians")
    .select("id, first_name, last_name, relationship_to_child")
    .order("first_name", { ascending: true });

  if (error) throw error;

  existingGuardianSelect.innerHTML = `<option value="">Select existing guardian</option>`;

  for (const guardian of data ?? []) {
    const option = document.createElement("option");
    const name = `${guardian.first_name || ""} ${guardian.last_name || ""}`.trim();
    const relationship = guardian.relationship_to_child ? ` — ${guardian.relationship_to_child}` : "";
    option.value = guardian.id;
    option.textContent = `${name}${relationship}`;
    existingGuardianSelect.appendChild(option);
  }
}

async function linkGuardianToChild({
  guardianId,
  isPrimary,
  pickupAuthorized,
  emergencyContact,
}) {
  const { error } = await supabase
    .from("child_guardians")
    .insert([
      {
        child_id: childId,
        guardian_id: guardianId,
        is_primary: isPrimary,
        pickup_authorized: pickupAuthorized,
        emergency_contact: emergencyContact,
      },
    ]);

  if (error) throw error;
}

async function uploadPhotoIfNeeded() {
  if (!selectedPhotoFile) {
    return currentChild?.photo_url || null;
  }

  const storagePath = buildPhotoPath(selectedPhotoFile.name);

  const { error } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, selectedPhotoFile, {
      upsert: false,
      contentType: selectedPhotoFile.type || "application/octet-stream",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("dtc-documents")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function uploadGuardianPhotoIfNeeded(guardianId) {
  if (!selectedGuardianPhotoFile) return null;

  const storagePath = buildGuardianPhotoPath(guardianId, selectedGuardianPhotoFile.name);

  const { error } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, selectedGuardianPhotoFile, {
      upsert: false,
      contentType: selectedGuardianPhotoFile.type || "application/octet-stream",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("dtc-documents")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function createGuardianAndAssign() {
  const firstName = document.getElementById("guardian_first_name").value.trim();
  const lastName = document.getElementById("guardian_last_name").value.trim();
  const relationship = document.getElementById("guardian_relationship").value || null;
  const phone = normalizePhone(document.getElementById("guardian_phone").value);
  const phoneExtension = document.getElementById("guardian_phone_extension").value.trim() || null;
  const secondaryPhone = normalizePhone(document.getElementById("guardian_secondary_phone").value);
  const secondaryPhoneExtension = document.getElementById("guardian_secondary_phone_extension").value.trim() || null;
  const email = normalizeEmail(document.getElementById("guardian_email").value);
  const preferredContactMethod = document.getElementById("guardian_preferred_contact_method").value || null;

  if (!firstName || !lastName) {
    throw new Error("Guardian first name and last name are required.");
  }

  const { data: guardian, error: createError } = await supabase
    .from("guardians")
    .insert([
      {
        organization_id: currentOrganizationId,
        first_name: firstName,
        last_name: lastName,
        relationship_to_child: relationship,
        phone: phone || null,
        phone_extension: phoneExtension,
        secondary_phone: secondaryPhone || null,
        secondary_phone_extension: secondaryPhoneExtension,
        email: email || null,
        preferred_contact_method: preferredContactMethod,
      },
    ])
    .select()
    .single();

  if (createError) throw createError;

  if (selectedGuardianPhotoFile) {
    const photoUrl = await uploadGuardianPhotoIfNeeded(guardian.id);

    const { error: updateGuardianError } = await supabase
      .from("guardians")
      .update({ photo_url: photoUrl })
      .eq("id", guardian.id);

    if (updateGuardianError) throw updateGuardianError;
  }

  await linkGuardianToChild({
    guardianId: guardian.id,
    isPrimary: document.getElementById("new_is_primary").value === "true",
    pickupAuthorized: document.getElementById("new_pickup_authorized").value === "true",
    emergencyContact: document.getElementById("new_emergency_contact").value === "true",
  });

  return guardian.id;
}

async function updateGuardianInline() {
  const guardianId = document.getElementById("edit_guardian_id").value;

  const payload = {
    first_name: document.getElementById("edit_guardian_first_name").value.trim() || null,
    last_name: document.getElementById("edit_guardian_last_name").value.trim() || null,
    relationship_to_child: document.getElementById("edit_guardian_relationship").value || null,
    phone: normalizePhone(document.getElementById("edit_guardian_phone").value) || null,
    phone_extension: document.getElementById("edit_guardian_phone_extension").value.trim() || null,
    secondary_phone: normalizePhone(document.getElementById("edit_guardian_secondary_phone").value) || null,
    secondary_phone_extension: document.getElementById("edit_guardian_secondary_phone_extension").value.trim() || null,
    email: normalizeEmail(document.getElementById("edit_guardian_email").value) || null,
    preferred_contact_method: document.getElementById("edit_guardian_preferred_contact_method").value || null,
  };

  const { error } = await supabase
    .from("guardians")
    .update(payload)
    .eq("id", guardianId);

  if (error) throw error;

  return payload;
}

photoInput?.addEventListener("change", () => {
  const file = photoInput.files?.[0] || null;
  selectedPhotoFile = file;

  if (file) {
    selectedPhotoName.textContent = file.name;
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  } else {
    selectedPhotoName.textContent = "No new photo selected.";
    setPhotoPreview(currentChild?.photo_url || getDefaultPhoto());
  }
});

guardianPhotoInput?.addEventListener("change", () => {
  const file = guardianPhotoInput.files?.[0] || null;
  selectedGuardianPhotoFile = file;
  guardianSelectedPhotoName.textContent = file
    ? file.name
    : "No new guardian photo selected.";
});

const guardianPhoneInput = document.getElementById("guardian_phone");
const guardianSecondaryPhoneInput = document.getElementById("guardian_secondary_phone");
const editGuardianPhoneInput = document.getElementById("edit_guardian_phone");
const editGuardianSecondaryPhoneInput = document.getElementById("edit_guardian_secondary_phone");

guardianPhoneInput?.addEventListener("blur", () => {
  guardianPhoneInput.value = formatPhoneNumber(guardianPhoneInput.value);
});

guardianSecondaryPhoneInput?.addEventListener("blur", () => {
  guardianSecondaryPhoneInput.value = formatPhoneNumber(guardianSecondaryPhoneInput.value);
});

editGuardianPhoneInput?.addEventListener("blur", () => {
  editGuardianPhoneInput.value = formatPhoneNumber(editGuardianPhoneInput.value);
});

editGuardianSecondaryPhoneInput?.addEventListener("blur", () => {
  editGuardianSecondaryPhoneInput.value = formatPhoneNumber(editGuardianSecondaryPhoneInput.value);
});

dobInput?.addEventListener("change", () => {
  const autoClass = calculateClassroom(dobInput.value);
  if (autoClass) {
    classroomSelect.value = autoClass;
  }
});

linkGuardianForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardiansMessage();

  try {
    const guardianId = existingGuardianSelect.value;
    if (!guardianId) {
      throw new Error("Please select an existing guardian.");
    }

    await linkGuardianToChild({
      guardianId,
      isPrimary: document.getElementById("existing_is_primary").value === "true",
      pickupAuthorized: document.getElementById("existing_pickup_authorized").value === "true",
      emergencyContact: document.getElementById("existing_emergency_contact").value === "true",
    });

    showGuardiansMessage("Guardian assigned successfully.", "info");
    linkGuardianForm.reset();
    await loadAssignedGuardians();
  } catch (error) {
    console.error("Link guardian error:", error);
    showGuardiansMessage(`Could not assign guardian: ${error.message}`, "error");
  }
});

createGuardianForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardiansMessage();

  try {
    await createGuardianAndAssign();

    showGuardiansMessage("Guardian created and assigned successfully.", "info");
    createGuardianForm.reset();
    selectedGuardianPhotoFile = null;

    if (guardianPhotoInput) guardianPhotoInput.value = "";
    if (guardianSelectedPhotoName) {
      guardianSelectedPhotoName.textContent = "No new guardian photo selected.";
    }

    await loadExistingGuardiansOptions();
    await loadAssignedGuardians();
  } catch (error) {
    console.error("Create guardian error:", error);
    showGuardiansMessage(`Could not create guardian: ${error.message}`, "error");
  }
});

assignedGuardiansList?.addEventListener("click", (event) => {
  const editBtn = event.target.closest(".guardian-inline-edit-btn");
  if (!editBtn) return;

  const guardianId = editBtn.dataset.guardianId;
  const guardian = getGuardianById(guardianId);
  if (!guardian) return;

  fillGuardianEditForm(guardian);
  openGuardianModal();
});

closeGuardianModalBtn?.addEventListener("click", () => {
  closeGuardianModal();
});

cancelGuardianModalBtn?.addEventListener("click", () => {
  closeGuardianModal();
});

guardianEditModal?.addEventListener("click", (event) => {
  if (event.target === guardianEditModal) {
    closeGuardianModal();
  }
});

guardianEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardianEditMessage();
  setGuardianEditLoading(true);

  try {
    const beforeGuardian = getGuardianById(document.getElementById("edit_guardian_id").value);
    const beforePhone = beforeGuardian?.phone || "";
    const beforeEmail = beforeGuardian?.email || "";

    await updateGuardianInline();
    await loadExistingGuardiansOptions();
    await loadAssignedGuardians();

    const afterGuardian = getGuardianById(document.getElementById("edit_guardian_id").value);
    const afterPhone = afterGuardian?.phone || "";
    const afterEmail = afterGuardian?.email || "";

    if (beforePhone !== afterPhone || beforeEmail !== afterEmail) {
      showGuardiansMessage("Guardian contact updated. Contact actions refreshed instantly.", "info");
    } else {
      showGuardiansMessage("Guardian updated successfully.", "info");
    }

    closeGuardianModal();
  } catch (error) {
    console.error("Edit guardian error:", error);
    showGuardianEditMessage(`Could not save guardian changes: ${error.message}`, "error");
  } finally {
    setGuardianEditLoading(false);
  }
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  setNavigationLinks();

  if (!childId) {
    showMessage("Missing child id in URL.", "error");
    loadingState.classList.add("hidden");
    return;
  }

  try {
    const child = await getChildById(childId);
    currentChild = child;
    fillForm(child);

    loadingState.classList.add("hidden");
    form.classList.remove("hidden");
  } catch (error) {
    console.error("Load child error:", error);
    showMessage(`Could not load child: ${error.message}`, "error");
    loadingState.classList.add("hidden");
    return;
  }

  try {
    const authData = await getCurrentUserAndOrg();
    currentOrganizationId = authData.organizationId;

    if (guardiansSection) guardiansSection.classList.remove("hidden");

    await loadExistingGuardiansOptions();
    await loadAssignedGuardians();
  } catch (error) {
    console.error("Load guardians section error:", error);
    showGuardiansMessage(
      `Child loaded, but guardians could not load yet: ${error.message}`,
      "error"
    );

    if (guardiansSection) guardiansSection.classList.remove("hidden");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setLoading(true);

  try {
    const photoUrl = await uploadPhotoIfNeeded();
    const payload = getPayload(photoUrl);

    const updated = await updateChild(childId, payload);
    currentChild = updated;

    showMessage("Child updated successfully.", "info");

    setTimeout(() => {
      window.location.href = `./child-profile.html?id=${encodeURIComponent(childId)}`;
    }, 900);
  } catch (error) {
    console.error("Update child error:", error);
    showMessage(`Could not save changes: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

boot();