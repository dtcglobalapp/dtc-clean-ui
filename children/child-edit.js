import { requireAuth, supabase } from "../auth.js";
import { getChildById, updateChild } from "./children-api.js";
import { prepareSquareImage } from "../core/image-tools.js";

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

const firstNameInput = document.getElementById("first_name");
const middleNameInput = document.getElementById("middle_name");
const lastNameInput = document.getElementById("last_name");
const genderInput = document.getElementById("gender");
const enrollmentInput = document.getElementById("enrollment_date");
const statusInput = document.getElementById("status");
const notesInput = document.getElementById("notes");

const assignedGuardiansEmpty = document.getElementById("assignedGuardiansEmpty");
const assignedGuardiansList = document.getElementById("assignedGuardiansList");

const existingGuardianSelect = document.getElementById("existing_guardian_id");
const linkGuardianForm = document.getElementById("linkGuardianForm");

const createGuardianForm = document.getElementById("createGuardianForm");
const guardianPhotoInput = document.getElementById("guardian_photo_file");
const guardianSelectedPhotoName = document.getElementById("guardianSelectedPhotoName");

const guardianEditModal = document.getElementById("guardianEditModal");
const guardianEditMessageBox = document.getElementById("guardianEditMessageBox");
const guardianEditForm = document.getElementById("guardianEditForm");
const closeGuardianModalBtn = document.getElementById("closeGuardianModalBtn");
const cancelGuardianModalBtn = document.getElementById("cancelGuardianModalBtn");
const editGuardianIdInput = document.getElementById("edit_guardian_id");

const params = new URLSearchParams(window.location.search);
const childId = params.get("id");

let currentChild = null;
let currentOrganizationId = null;
let selectedChildPhotoBlob = null;
let selectedChildPhotoName = null;
let selectedGuardianPhotoBlob = null;
let selectedGuardianPhotoName = null;
let linkedGuardians = [];
let availableGuardians = [];

function showMessage(text, type = "error") {
  if (!messageBox) return;

  messageBox.textContent = text || "";

  if (!text) {
    messageBox.className = "message hidden";
    return;
  }

  messageBox.className = `message ${type}`;
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function showGuardiansMessage(text, type = "info") {
  if (!guardiansMessageBox) return;

  guardiansMessageBox.textContent = text || "";

  if (!text) {
    guardiansMessageBox.className = "message hidden";
    return;
  }

  guardiansMessageBox.className = `message ${type}`;
}

function hideGuardiansMessage() {
  if (!guardiansMessageBox) return;
  guardiansMessageBox.textContent = "";
  guardiansMessageBox.className = "message hidden";
}

function showGuardianEditMessage(text, type = "info") {
  if (!guardianEditMessageBox) return;

  guardianEditMessageBox.textContent = text || "";

  if (!text) {
    guardianEditMessageBox.className = "message hidden";
    return;
  }

  guardianEditMessageBox.className = `message ${type}`;
}

function hideGuardianEditMessage() {
  if (!guardianEditMessageBox) return;
  guardianEditMessageBox.textContent = "";
  guardianEditMessageBox.className = "message hidden";
}

function setNavigationLinks() {
  const profileUrl = childId
    ? `./child-profile.html?id=${encodeURIComponent(childId)}`
    : "./children-list.html";

  if (backToProfileBtn) backToProfileBtn.href = profileUrl;
  if (cancelToProfileBtn) cancelToProfileBtn.href = profileUrl;
}

function setLoading(isLoading) {
  if (loadingState) loadingState.classList.toggle("hidden", !isLoading);
  if (form) form.classList.toggle("hidden", isLoading);
  if (guardiansSection) guardiansSection.classList.toggle("hidden", isLoading);
}

function setSaving(isSaving) {
  if (!saveBtn) return;
  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "Saving..." : "Save Changes";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function formatPhone(value = "") {
  const digits = normalizePhone(value);

  if (!digits) return "—";

  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  return value;
}

function calculateClassroom(dob) {
  if (!dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  const ageInYears = (today - birthDate) / (1000 * 60 * 60 * 24 * 365.25);

  if (ageInYears < 2) return "Infants";
  if (ageInYears < 3) return "Toddlers";
  if (ageInYears < 5) return "Preschool";
  return "School Age";
}

function parseDateForInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function childPhotoPath(fileName) {
  const safeName = String(fileName || "child-photo")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");
  return `child-photos/${childId}/${Date.now()}-${safeName}`;
}

function guardianPhotoPath(fileName) {
  const safeName = String(fileName || "guardian-photo")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "");
  return `guardian-photos/${Date.now()}-${safeName}`;
}

async function getCurrentUserAndOrg() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  if (!data?.organization_id) {
    throw new Error("No organization found for this user.");
  }

  return data.organization_id;
}

function fillChildForm(child) {
  if (!child) return;

  firstNameInput.value = child.first_name || "";
  middleNameInput.value = child.middle_name || "";
  lastNameInput.value = child.last_name || "";
  dobInput.value = parseDateForInput(child.date_of_birth);
  genderInput.value = child.gender || "";
  enrollmentInput.value = parseDateForInput(child.enrollment_date);
  classroomSelect.value = child.classroom || "";
  statusInput.value = child.status || "active";
  notesInput.value = child.notes || "";

  if (photoPreview) {
    photoPreview.src = child.photo_url || "https://placehold.co/320x320?text=Child+Photo";
  }
}

async function uploadChildPhotoIfNeeded() {
  if (!selectedChildPhotoBlob) {
    return currentChild?.photo_url || null;
  }

  const storagePath = childPhotoPath(selectedChildPhotoName || "child-photo.jpg");

  const { error: uploadError } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, selectedChildPhotoBlob, {
      upsert: false,
      contentType: selectedChildPhotoBlob.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("dtc-documents")
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
}

function linkedGuardianCard(link) {
  const guardian = link.guardians || {};
  const name =
    [guardian.first_name, guardian.middle_name, guardian.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed Guardian";

  return `
    <article class="dtc-record-card">
      <img
        class="dtc-card-photo"
        src="${escapeHtml(guardian.photo_url || "https://placehold.co/320x320?text=Guardian")}"
        alt="${escapeHtml(name)}"
      />

      <h3 class="dtc-card-name">${escapeHtml(name)}</h3>
      <p class="dtc-card-subtitle">${escapeHtml(link.relationship_to_child || guardian.relationship_default || "Guardian")}</p>

      <div class="dtc-inline-meta">
        ${link.is_primary ? `<span class="dtc-badge dtc-badge-success">Primary</span>` : ""}
        ${link.pickup_authorized ? `<span class="dtc-badge dtc-badge-success">Pickup OK</span>` : ""}
        ${link.emergency_contact ? `<span class="dtc-badge dtc-badge-warning">Emergency</span>` : ""}
      </div>

      <div class="dtc-stack-sm">
        <div class="dtc-person-meta"><strong>Phone:</strong> ${escapeHtml(formatPhone(guardian.phone))}</div>
        <div class="dtc-person-meta"><strong>Email:</strong> ${escapeHtml(guardian.email || "—")}</div>
      </div>

      <div class="dtc-card-footer">
        <button class="btn btn-secondary edit-linked-guardian-btn" type="button" data-guardian-id="${escapeHtml(guardian.id || "")}">
          Edit
        </button>
        <button class="btn btn-secondary remove-linked-guardian-btn" type="button" data-link-id="${escapeHtml(link.id)}">
          Unlink
        </button>
      </div>
    </article>
  `;
}

function renderAssignedGuardians(rows) {
  linkedGuardians = rows || [];

  if (!assignedGuardiansList || !assignedGuardiansEmpty) return;

  if (!linkedGuardians.length) {
    assignedGuardiansList.innerHTML = "";
    assignedGuardiansList.classList.add("hidden");
    assignedGuardiansEmpty.classList.remove("hidden");
    return;
  }

  assignedGuardiansEmpty.classList.add("hidden");
  assignedGuardiansList.classList.remove("hidden");
  assignedGuardiansList.innerHTML = linkedGuardians.map(linkedGuardianCard).join("");
}

async function loadAssignedGuardians() {
  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
      id,
      child_id,
      guardian_id,
      relationship_to_child,
      is_primary,
      pickup_authorized,
      emergency_contact,
      guardians (
        id,
        first_name,
        middle_name,
        last_name,
        relationship_default,
        phone,
        secondary_phone,
        email,
        preferred_contact_method,
        photo_url
      )
    `)
    .eq("child_id", childId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  renderAssignedGuardians(data ?? []);
}

async function loadAvailableGuardians() {
  const { data, error } = await supabase
    .from("guardians")
    .select("id, first_name, middle_name, last_name")
    .eq("organization_id", currentOrganizationId)
    .order("first_name", { ascending: true });

  if (error) throw error;

  const linkedIds = new Set(linkedGuardians.map((item) => item.guardian_id));
  availableGuardians = (data ?? []).filter((guardian) => !linkedIds.has(guardian.id));

  if (!existingGuardianSelect) return;

  existingGuardianSelect.innerHTML = `
    <option value="">Select existing guardian</option>
    ${availableGuardians
      .map((guardian) => {
        const name =
          [guardian.first_name, guardian.middle_name, guardian.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || "Unnamed Guardian";

        return `<option value="${escapeHtml(guardian.id)}">${escapeHtml(name)}</option>`;
      })
      .join("")}
  `;
}

async function linkExistingGuardian() {
  const guardianId = existingGuardianSelect?.value || "";
  if (!guardianId) throw new Error("Select a guardian first.");

  const payload = {
    child_id: childId,
    guardian_id: guardianId,
    is_primary: document.getElementById("existing_is_primary").value === "true",
    pickup_authorized: document.getElementById("existing_pickup_authorized").value === "true",
    emergency_contact: document.getElementById("existing_emergency_contact").value === "true",
  };

  const { error } = await supabase.from("child_guardians").insert([payload]);
  if (error) throw error;
}

async function uploadGuardianPhotoIfNeeded() {
  if (!selectedGuardianPhotoBlob) return null;

  const storagePath = guardianPhotoPath(selectedGuardianPhotoName || "guardian-photo.jpg");

  const { error: uploadError } = await supabase.storage
    .from("dtc-documents")
    .upload(storagePath, selectedGuardianPhotoBlob, {
      upsert: false,
      contentType: selectedGuardianPhotoBlob.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("dtc-documents")
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
}

async function createGuardianAndAssign() {
  const photoUrl = await uploadGuardianPhotoIfNeeded();

  const guardianPayload = {
    organization_id: currentOrganizationId,
    first_name: document.getElementById("guardian_first_name").value.trim(),
    middle_name: null,
    last_name: document.getElementById("guardian_last_name").value.trim(),
    relationship_default: document.getElementById("guardian_relationship").value || null,
    phone: normalizePhone(document.getElementById("guardian_phone").value) || null,
    phone_extension: document.getElementById("guardian_phone_extension").value.trim() || null,
    secondary_phone: normalizePhone(document.getElementById("guardian_secondary_phone").value) || null,
    secondary_phone_extension: document.getElementById("guardian_secondary_phone_extension").value.trim() || null,
    email: normalizeEmail(document.getElementById("guardian_email").value) || null,
    preferred_contact_method: document.getElementById("guardian_preferred_contact_method").value || null,
    photo_url: photoUrl,
  };

  Object.keys(guardianPayload).forEach((key) => {
    if (guardianPayload[key] === "" || guardianPayload[key] === undefined) guardianPayload[key] = null;
  });

  if (!guardianPayload.first_name || !guardianPayload.last_name) {
    throw new Error("Guardian first and last name are required.");
  }

  const { data: guardian, error } = await supabase
    .from("guardians")
    .insert([guardianPayload])
    .select()
    .single();

  if (error) throw error;

  const linkPayload = {
    child_id: childId,
    guardian_id: guardian.id,
    relationship_to_child: guardianPayload.relationship_default,
    is_primary: document.getElementById("new_is_primary").value === "true",
    pickup_authorized: document.getElementById("new_pickup_authorized").value === "true",
    emergency_contact: document.getElementById("new_emergency_contact").value === "true",
  };

  const { error: linkError } = await supabase.from("child_guardians").insert([linkPayload]);
  if (linkError) throw linkError;

  return guardian.id;
}

function openGuardianModal(guardian) {
  if (!guardianEditModal || !guardian) return;

  hideGuardianEditMessage();

  editGuardianIdInput.value = guardian.id || "";
  document.getElementById("edit_guardian_first_name").value = guardian.first_name || "";
  document.getElementById("edit_guardian_last_name").value = guardian.last_name || "";
  document.getElementById("edit_guardian_relationship").value = guardian.relationship_default || "";
  document.getElementById("edit_guardian_phone").value = guardian.phone || "";
  document.getElementById("edit_guardian_phone_extension").value = guardian.phone_extension || "";
  document.getElementById("edit_guardian_secondary_phone").value = guardian.secondary_phone || "";
  document.getElementById("edit_guardian_secondary_phone_extension").value = guardian.secondary_phone_extension || "";
  document.getElementById("edit_guardian_email").value = guardian.email || "";
  document.getElementById("edit_guardian_preferred_contact_method").value = guardian.preferred_contact_method || "";

  guardianEditModal.classList.remove("hidden");
  guardianEditModal.setAttribute("aria-hidden", "false");
}

function closeGuardianModal() {
  if (!guardianEditModal) return;
  guardianEditModal.classList.add("hidden");
  guardianEditModal.setAttribute("aria-hidden", "true");
  hideGuardianEditMessage();
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setSaving(true);

  try {
    const photoUrl = await uploadChildPhotoIfNeeded();

    const payload = {
      first_name: firstNameInput.value.trim(),
      middle_name: middleNameInput.value.trim() || null,
      last_name: lastNameInput.value.trim(),
      date_of_birth: dobInput.value || null,
      gender: genderInput.value || null,
      enrollment_date: enrollmentInput.value || null,
      classroom: classroomSelect.value || calculateClassroom(dobInput.value),
      status: statusInput.value || "active",
      notes: notesInput.value.trim() || null,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    };

    if (!payload.first_name || !payload.last_name) {
      throw new Error("First name and last name are required.");
    }

    const updated = await updateChild(childId, payload);
    currentChild = { ...currentChild, ...updated };

    showMessage("Child updated successfully.", "info");

    setTimeout(() => {
      window.location.href = `./child-profile.html?id=${encodeURIComponent(childId)}`;
    }, 800);
  } catch (error) {
    console.error("Save child edit error:", error);
    showMessage(error.message || "Could not update child.", "error");
  } finally {
    setSaving(false);
  }
});

dobInput?.addEventListener("change", () => {
  const autoClass = calculateClassroom(dobInput.value);
  if (autoClass && classroomSelect) {
    classroomSelect.value = autoClass;
  }
});

photoInput?.addEventListener("change", async () => {
  const file = photoInput.files?.[0] || null;

  if (!file) {
    selectedChildPhotoBlob = null;
    selectedChildPhotoName = null;
    if (selectedPhotoName) selectedPhotoName.textContent = "No new photo selected.";
    if (photoPreview) photoPreview.src = currentChild?.photo_url || "https://placehold.co/320x320?text=Child+Photo";
    return;
  }

  try {
    const prepared = await prepareSquareImage(file, {
      size: 600,
      type: "image/jpeg",
      quality: 0.88,
    });

    selectedChildPhotoBlob = prepared.blob;
    selectedChildPhotoName = prepared.fileName;

    if (selectedPhotoName) selectedPhotoName.textContent = prepared.fileName;
    if (photoPreview) photoPreview.src = prepared.previewUrl;
  } catch (error) {
    console.error("Prepare child photo error:", error);
    showMessage("Could not prepare child photo.", "error");
  }
});

guardianPhotoInput?.addEventListener("change", async () => {
  const file = guardianPhotoInput.files?.[0] || null;

  if (!file) {
    selectedGuardianPhotoBlob = null;
    selectedGuardianPhotoName = null;
    if (guardianSelectedPhotoName) guardianSelectedPhotoName.textContent = "No new guardian photo selected.";
    return;
  }

  try {
    const prepared = await prepareSquareImage(file, {
      size: 600,
      type: "image/jpeg",
      quality: 0.88,
    });

    selectedGuardianPhotoBlob = prepared.blob;
    selectedGuardianPhotoName = prepared.fileName;

    if (guardianSelectedPhotoName) guardianSelectedPhotoName.textContent = prepared.fileName;
  } catch (error) {
    console.error("Prepare guardian photo error:", error);
    showGuardiansMessage("Could not prepare guardian photo.", "error");
  }
});

linkGuardianForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardiansMessage();

  try {
    await linkExistingGuardian();
    showGuardiansMessage("Guardian assigned successfully.", "info");

    linkGuardianForm.reset();
    await loadAssignedGuardians();
    await loadAvailableGuardians();
  } catch (error) {
    console.error("Link guardian error:", error);
    showGuardiansMessage(error.message || "Could not assign guardian.", "error");
  }
});

createGuardianForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardiansMessage();

  try {
    await createGuardianAndAssign();

    showGuardiansMessage("Guardian created and assigned successfully.", "info");

    createGuardianForm.reset();
    selectedGuardianPhotoBlob = null;
    selectedGuardianPhotoName = null;
    if (guardianSelectedPhotoName) {
      guardianSelectedPhotoName.textContent = "No new guardian photo selected.";
    }

    await loadAssignedGuardians();
    await loadAvailableGuardians();
  } catch (error) {
    console.error("Create guardian error:", error);
    showGuardiansMessage(error.message || "Could not create guardian.", "error");
  }
});

assignedGuardiansList?.addEventListener("click", async (event) => {
  const editBtn = event.target.closest(".edit-linked-guardian-btn");
  if (editBtn) {
    const guardianId = editBtn.dataset.guardianId;
    const found = linkedGuardians.find((item) => item.guardians?.id === guardianId);
    if (found?.guardians) {
      openGuardianModal(found.guardians);
    }
    return;
  }

  const removeBtn = event.target.closest(".remove-linked-guardian-btn");
  if (removeBtn) {
    const linkId = removeBtn.dataset.linkId;
    if (!linkId) return;

    const confirmed = window.confirm("Unlink this guardian from the child?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("child_guardians").delete().eq("id", linkId);
      if (error) throw error;

      showGuardiansMessage("Guardian unlinked successfully.", "info");
      await loadAssignedGuardians();
      await loadAvailableGuardians();
    } catch (error) {
      console.error("Unlink guardian error:", error);
      showGuardiansMessage(error.message || "Could not unlink guardian.", "error");
    }
  }
});

guardianEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideGuardianEditMessage();

  const guardianId = editGuardianIdInput.value;
  if (!guardianId) return;

  try {
    const payload = {
      first_name: document.getElementById("edit_guardian_first_name").value.trim(),
      last_name: document.getElementById("edit_guardian_last_name").value.trim(),
      relationship_default: document.getElementById("edit_guardian_relationship").value || null,
      phone: normalizePhone(document.getElementById("edit_guardian_phone").value) || null,
      phone_extension: document.getElementById("edit_guardian_phone_extension").value.trim() || null,
      secondary_phone: normalizePhone(document.getElementById("edit_guardian_secondary_phone").value) || null,
      secondary_phone_extension: document.getElementById("edit_guardian_secondary_phone_extension").value.trim() || null,
      email: normalizeEmail(document.getElementById("edit_guardian_email").value) || null,
      preferred_contact_method: document.getElementById("edit_guardian_preferred_contact_method").value || null,
    };

    if (!payload.first_name || !payload.last_name) {
      throw new Error("Guardian first and last name are required.");
    }

    const { error } = await supabase.from("guardians").update(payload).eq("id", guardianId);
    if (error) throw error;

    showGuardiansMessage("Guardian updated successfully.", "info");
    closeGuardianModal();
    await loadAssignedGuardians();
    await loadAvailableGuardians();
  } catch (error) {
    console.error("Update guardian error:", error);
    showGuardianEditMessage(error.message || "Could not update guardian.", "error");
  }
});

closeGuardianModalBtn?.addEventListener("click", closeGuardianModal);
cancelGuardianModalBtn?.addEventListener("click", closeGuardianModal);

async function boot() {
  await requireAuth();

  if (!childId) {
    showMessage("Missing child id in URL.", "error");
    setLoading(false);
    return;
  }

  try {
    setNavigationLinks();
    currentOrganizationId = await getCurrentUserAndOrg();

    const child = await getChildById(childId);
    currentChild = child;

    fillChildForm(child);
    await loadAssignedGuardians();
    await loadAvailableGuardians();

    setLoading(false);
  } catch (error) {
    console.error("Load child edit error:", error);
    showMessage(error.message || "Could not load child record.", "error");
    setLoading(false);
  }
}

boot();