import { requireAuth, supabase } from "../auth.js";
import { getChildById, updateChild } from "./children-api.js";
import { prepareSquareImage } from "../core/image-tools.js";

const params = new URLSearchParams(window.location.search);
const childId = params.get("id");

const messageBox = document.getElementById("messageBox");
const loadingState = document.getElementById("loadingState");
const profileContent = document.getElementById("profileContent");

const childPhoto = document.getElementById("childPhoto");
const profileName = document.getElementById("profileName");
const profileClassroom = document.getElementById("profileClassroom");
const profileStatus = document.getElementById("profileStatus");
const profileAge = document.getElementById("profileAge");
const profileGender = document.getElementById("profileGender");
const profileDob = document.getElementById("profileDob");
const profileEnrollment = document.getElementById("profileEnrollment");

const overviewFirstName = document.getElementById("overviewFirstName");
const overviewMiddleName = document.getElementById("overviewMiddleName");
const overviewLastName = document.getElementById("overviewLastName");
const overviewClassroom = document.getElementById("overviewClassroom");
const overviewStatus = document.getElementById("overviewStatus");
const overviewAgreement = document.getElementById("overviewAgreement");
const overviewNotes = document.getElementById("overviewNotes");

const guardiansEmpty = document.getElementById("guardiansEmpty");
const guardiansList = document.getElementById("guardiansList");

const documentsTableBody = document.getElementById("documentsTableBody");
const documentsEmpty = document.getElementById("documentsEmpty");
const documentsTableWrap = document.getElementById("documentsTableWrap");

const editChildBtn = document.getElementById("editChildBtn");
const documentsBtn = document.getElementById("documentsBtn");
const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");
const manageGuardiansBtn = document.getElementById("manageGuardiansBtn");

const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");
const profilePhotoFileName = document.getElementById("profilePhotoFileName");

const sendToAgencyBtn = document.getElementById("sendToAgencyBtn");
const deliveryEmpty = document.getElementById("deliveryEmpty");
const deliveryTableWrap = document.getElementById("deliveryTableWrap");
const deliveryTableBody = document.getElementById("deliveryTableBody");

let currentChild = null;
let selectedProfilePhotoBlob = null;
let selectedProfilePhotoName = null;
let currentDocuments = [];

function showMessage(text, type = "error") {
  if (!messageBox) return;

  messageBox.textContent = text || "";

  if (!text) {
    messageBox.className = "dtc-feedback hidden";
    return;
  }

  if (type === "error") {
    messageBox.className = "dtc-feedback";
    return;
  }

  messageBox.className = "dtc-feedback hidden";
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "dtc-feedback hidden";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

function formatDate(value) {
  if (!value) return "—";

  const parsed = parseDateOnly(value);
  if (parsed) {
    return `${parsed.month}/${parsed.day}/${parsed.year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function calculateAgeLabel(dob) {
  const parsed = parseDateOnly(dob);
  if (!parsed) return "—";

  const today = new Date();

  let years = today.getFullYear() - parsed.year;
  let months = today.getMonth() + 1 - parsed.month;

  if (months < 0 || (months === 0 && today.getDate() < parsed.day)) {
    years -= 1;
    months += 12;
  }

  if (today.getDate() < parsed.day) {
    months -= 1;
    if (months < 0) months += 12;
  }

  if (years <= 0) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  return `${years} year${years === 1 ? "" : "s"}`;
}

function formatPhoneNumber(value = "") {
  const digits = String(value).replace(/\D/g, "");

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

function normalizePhoneForLink(value = "") {
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) digits = `1${digits}`;
  return digits;
}

function getStatusBadgeClass(status = "") {
  const safe = String(status).toLowerCase();

  if (safe === "active" || safe === "approved") return "dtc-badge dtc-badge-success";
  if (safe === "pending" || safe === "pending_review") return "dtc-badge dtc-badge-warning";
  return "dtc-badge dtc-badge-neutral";
}

function statusBadge(status = "active") {
  if (!profileStatus) return;
  profileStatus.className = getStatusBadgeClass(status);
  profileStatus.textContent = status || "unknown";
}

function getDefaultPhoto() {
  return "https://placehold.co/320x320?text=Child+Photo";
}

function setPhoto(url) {
  if (!childPhoto) return;
  childPhoto.src = url || getDefaultPhoto();
}

function prettyDocumentType(value = "") {
  const map = {
    medical_form: "Medical Form",
    vaccination_record: "Vaccination Record",
    health_care_plan: "Health Care Plan",
    allergy_plan: "Allergy Plan",
    medication_authorization: "Medication Authorization",
    physical_exam: "Physical Exam",
    emergency_form: "Emergency Form",
    parent_agreement: "Parent Agreement",
    pickup_authorization: "Pickup Authorization",
    incident_report: "Incident Report",
    annual_enrollment: "Annual Enrollment",
    recertification: "Recertification",
    other: "Other",
  };

  return map[value] || value || "—";
}

function prettyReviewStatus(value = "") {
  const map = {
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  };

  return map[value] || value || "Unknown";
}

function documentStatusBadge(status = "") {
  return `<span class="${getStatusBadgeClass(status)}">${escapeHtml(prettyReviewStatus(status))}</span>`;
}

function documentRow(doc) {
  const safeFileUrl = doc.file_url ? encodeURI(doc.file_url) : "#";

  return `
    <tr>
      <td>${escapeHtml(doc.title || "—")}</td>
      <td>${escapeHtml(prettyDocumentType(doc.document_type))}</td>
      <td>${documentStatusBadge(doc.review_status)}</td>
      <td>${escapeHtml(formatDate(doc.issue_date))}</td>
      <td>${escapeHtml(formatDate(doc.expires_at))}</td>
      <td class="dtc-col-actions">
        <div class="dtc-inline-actions">
          ${
            doc.file_url
              ? `<a class="dtc-btn dtc-btn-ghost dtc-btn-sm" href="${safeFileUrl}" target="_blank" rel="noopener noreferrer">Open</a>`
              : `<span class="dtc-btn dtc-btn-ghost dtc-btn-sm">No File</span>`
          }
        </div>
      </td>
    </tr>
  `;
}

function guardianCard(guardian) {
  const relationship =
    guardian.relationship_to_child ||
    guardian.relationship_default ||
    "Guardian";

  const name = `${guardian.first_name || ""} ${guardian.last_name || ""}`.trim() || "Unnamed Guardian";
  const phone = formatPhoneNumber(guardian.phone);
  const email = guardian.email || "—";
  const photo = guardian.photo_url || "https://placehold.co/320x320?text=Guardian";

  return `
    <article class="dtc-record-card">
      <img
        class="dtc-card-photo"
        src="${escapeHtml(photo)}"
        alt="${escapeHtml(name)}"
      />

      <h3 class="dtc-card-name">${escapeHtml(name)}</h3>
      <p class="dtc-card-subtitle">${escapeHtml(relationship)}</p>

      <div class="dtc-inline-meta">
        ${guardian.is_primary ? `<span class="dtc-badge dtc-badge-success">Primary</span>` : ""}
        ${guardian.pickup_allowed ? `<span class="dtc-badge dtc-badge-success">Pickup OK</span>` : ""}
        ${guardian.emergency_contact ? `<span class="dtc-badge dtc-badge-warning">Emergency</span>` : ""}
        ${guardian.remote_signature_allowed ? `<span class="dtc-badge dtc-badge-neutral">Remote Sign</span>` : ""}
      </div>

      <div class="dtc-stack-sm">
        <div class="dtc-person-meta">
          <strong>Phone:</strong> ${escapeHtml(phone)}
        </div>

        <div class="dtc-person-meta">
          <strong>Email:</strong> ${escapeHtml(email)}
        </div>
      </div>

      <div class="dtc-card-footer">
        <a
          class="dtc-btn dtc-btn-secondary dtc-btn-sm"
          href="../guardians/guardian-profile.html?id=${encodeURIComponent(guardian.id)}"
        >
          Profile
        </a>
      </div>
    </article>
  `;
}

function fillChildProfile(child) {
  const fullName = [child.first_name, child.middle_name, child.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  setPhoto(child.photo_url || getDefaultPhoto());

  if (profileName) profileName.textContent = fullName || "Unnamed Child";
  if (profileClassroom) profileClassroom.textContent = child.classroom || "No classroom assigned";
  statusBadge(child.status || "active");

  if (profileAge) profileAge.textContent = calculateAgeLabel(child.date_of_birth);
  if (profileGender) profileGender.textContent = child.gender || "—";
  if (profileDob) profileDob.textContent = formatDate(child.date_of_birth);
  if (profileEnrollment) profileEnrollment.textContent = formatDate(child.enrollment_date);

  if (overviewFirstName) overviewFirstName.textContent = child.first_name || "—";
  if (overviewMiddleName) overviewMiddleName.textContent = child.middle_name || "—";
  if (overviewLastName) overviewLastName.textContent = child.last_name || "—";
  if (overviewClassroom) overviewClassroom.textContent = child.classroom || "—";
  if (overviewStatus) overviewStatus.textContent = child.status || "—";
  if (overviewAgreement) overviewAgreement.textContent = child.agreement_signed ? "Yes" : "No";
  if (overviewNotes) overviewNotes.textContent = child.notes || "No notes saved.";

  if (editChildBtn) {
    editChildBtn.href = `./child-edit.html?id=${encodeURIComponent(child.id)}`;
  }

  if (documentsBtn) {
    documentsBtn.href = `../agreements/documents-list.html?child_id=${encodeURIComponent(child.id)}`;
  }

  if (manageGuardiansBtn) {
    manageGuardiansBtn.href = `../guardians/child-guardian-link/child-guardian-link.html?child_id=${encodeURIComponent(child.id)}`;
  }
}

async function loadGuardians(childIdValue) {
  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
      guardian_id,
      relationship_to_child,
      is_primary,
      pickup_allowed,
      emergency_contact,
      remote_signature_allowed,
      guardians (
        id,
        first_name,
        middle_name,
        last_name,
        relationship_default,
        phone,
        email,
        whatsapp,
        photo_url
      )
    `)
    .eq("child_id", childIdValue)
    .eq("status", "active");

  if (error) throw error;

  const guardians = (data ?? [])
    .map((item) => {
      if (!item.guardians) return null;
      return {
        ...item.guardians,
        relationship_to_child: item.relationship_to_child,
        is_primary: item.is_primary,
        pickup_allowed: item.pickup_allowed,
        emergency_contact: item.emergency_contact,
        remote_signature_allowed: item.remote_signature_allowed,
      };
    })
    .filter(Boolean);

  if (!guardians.length) {
    if (guardiansEmpty) guardiansEmpty.classList.remove("hidden");
    if (guardiansList) {
      guardiansList.classList.add("hidden");
      guardiansList.innerHTML = "";
    }
    return;
  }

  if (guardiansEmpty) guardiansEmpty.classList.add("hidden");
  if (guardiansList) {
    guardiansList.classList.remove("hidden");
    guardiansList.innerHTML = guardians.map(guardianCard).join("");
  }
}

async function loadDocuments(childIdValue) {
  const { data, error } = await supabase
    .from("child_documents")
    .select(`
      id,
      title,
      document_type,
      review_status,
      issue_date,
      expires_at,
      requires_renewal,
      file_url,
      notes,
      created_at
    `)
    .eq("child_id", childIdValue)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const docs = data ?? [];
  currentDocuments = docs;

  if (!docs.length) {
    if (documentsEmpty) documentsEmpty.classList.remove("hidden");
    if (documentsTableWrap) documentsTableWrap.classList.add("hidden");
    if (documentsTableBody) documentsTableBody.innerHTML = "";
    return;
  }

  if (documentsEmpty) documentsEmpty.classList.add("hidden");
  if (documentsTableWrap) documentsTableWrap.classList.remove("hidden");
  if (documentsTableBody) {
    documentsTableBody.innerHTML = docs.slice(0, 5).map(documentRow).join("");
  }
}

function deliveryRow(row) {
  const recipients = Array.isArray(row.recipients)
    ? row.recipients
        .map((item) => {
          if (typeof item === "string") return item;
          if (item?.email && item?.name) return `${item.name} (${item.email})`;
          if (item?.email) return item.email;
          if (item?.name) return item.name;
          return "";
        })
        .filter(Boolean)
        .join(", ")
    : "";

  return `
    <tr>
      <td>${escapeHtml(row.document_name || "—")}</td>
      <td>${escapeHtml(row.sent_to || recipients || "—")}</td>
      <td>${escapeHtml(formatDate(row.created_at))}</td>
      <td>${escapeHtml(row.sent_by_name || "—")}</td>
      <td>${escapeHtml(row.status || "sent")}</td>
    </tr>
  `;
}

async function loadDeliveryHistory(childIdValue) {
  if (!deliveryEmpty || !deliveryTableWrap || !deliveryTableBody) return;

  const { data, error } = await supabase
    .from("dtc_document_deliveries")
    .select(`
      id,
      document_name,
      sent_to,
      recipients,
      sent_by_name,
      status,
      created_at
    `)
    .eq("child_id", childIdValue)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load delivery history error:", error);
    deliveryEmpty.classList.remove("hidden");
    deliveryTableWrap.classList.add("hidden");
    deliveryTableBody.innerHTML = "";
    return;
  }

  const rows = data ?? [];

  if (!rows.length) {
    deliveryEmpty.classList.remove("hidden");
    deliveryTableWrap.classList.add("hidden");
    deliveryTableBody.innerHTML = "";
    return;
  }

  deliveryEmpty.classList.add("hidden");
  deliveryTableWrap.classList.remove("hidden");
  deliveryTableBody.innerHTML = rows.map(deliveryRow).join("");
}

function buildPhotoPath(fileName) {
  const safeName = fileName.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");
  return `child-photos/${childId}/${Date.now()}-${safeName}`;
}

async function uploadProfilePhoto() {
  if (!selectedProfilePhotoBlob || !currentChild) return;

  hideMessage();

  if (savePhotoBtn) {
    savePhotoBtn.disabled = true;
    savePhotoBtn.textContent = "Saving...";
  }

  try {
    const storagePath = buildPhotoPath(selectedProfilePhotoName || "child-photo.jpg");

    const { error } = await supabase.storage
      .from("dtc-documents")
      .upload(storagePath, selectedProfilePhotoBlob, {
        upsert: false,
        contentType: selectedProfilePhotoBlob.type || "image/jpeg",
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("dtc-documents")
      .getPublicUrl(storagePath);

    const updatedChild = await updateChild(childId, {
      photo_url: data.publicUrl,
    });

    currentChild = {
      ...currentChild,
      ...updatedChild,
    };

    setPhoto(currentChild.photo_url || getDefaultPhoto());
    showMessage("Photo updated successfully.", "info");

    if (profilePhotoFileName) {
      profilePhotoFileName.textContent = "No new photo selected.";
    }

    selectedProfilePhotoBlob = null;
    selectedProfilePhotoName = null;

    if (profilePhotoInput) {
      profilePhotoInput.value = "";
    }
  } catch (error) {
    console.error("Upload profile photo error:", error);
    showMessage(`Could not update child photo: ${error.message}`, "error");
  } finally {
    if (savePhotoBtn) {
      savePhotoBtn.disabled = false;
      savePhotoBtn.textContent = "Save Photo";
    }
  }
}

function getLatestDocumentForDelivery() {
  if (!currentDocuments.length) return null;

  const approved = currentDocuments.find((doc) => doc.review_status === "approved" && doc.file_url);
  if (approved) return approved;

  const withFile = currentDocuments.find((doc) => doc.file_url);
  if (withFile) return withFile;

  return currentDocuments[0];
}

function buildMailtoUrl({ to, cc = "", subject = "", body = "" }) {
  const query = new URLSearchParams();
  if (cc) query.set("cc", cc);
  if (subject) query.set("subject", subject);
  if (body) query.set("body", body);

  return `mailto:${encodeURIComponent(to)}?${query.toString()}`;
}

async function sendToAgency() {
  if (!currentChild) return;

  const latestDoc = getLatestDocumentForDelivery();

  if (!latestDoc) {
    showMessage("This child has no document available to send.", "error");
    return;
  }

  const testPrimaryEmail = "miriamgroupdaycare@gmail.com";
  const testCcEmail = "";
  const childName =
    [currentChild.first_name, currentChild.last_name].filter(Boolean).join(" ").trim() || "Child";
  const documentName = latestDoc.title || "Child Document";

  const subject = `DTC Test Delivery — ${childName} — ${documentName}`;
  const body = [
    "Hello,",
    "",
    "This is a delivery test sent from DTC.",
    "",
    `Child: ${childName}`,
    `Document: ${documentName}`,
    latestDoc.file_url ? `File Link: ${latestDoc.file_url}` : "File Link: No file URL available",
    "",
    "Please confirm receipt.",
    "",
    "Thank you."
  ].join("\n");

  try {
    if (sendToAgencyBtn) {
      sendToAgencyBtn.disabled = true;
      sendToAgencyBtn.textContent = "Preparing...";
    }

    const { error } = await supabase
      .from("dtc_document_deliveries")
      .insert([
        {
          organization_id: currentChild.organization_id || null,
          child_id: childId,
          document_id: latestDoc.id || null,
          document_name: documentName,
          sent_to: "Delivery Test",
          recipients: [
            { name: "Test Primary", email: testPrimaryEmail },
            ...(testCcEmail ? [{ name: "Test CC", email: testCcEmail }] : []),
          ],
          delivery_type: "email",
          sent_by_user_id: null,
          sent_by_name: "DTC User",
          status: "prepared",
          notes: "Test delivery opened with mailto from Child Profile.",
          metadata: {
            file_url: latestDoc.file_url || null,
            subject,
          },
        },
      ]);

    if (error) throw error;

    const mailtoUrl = buildMailtoUrl({
      to: testPrimaryEmail,
      cc: testCcEmail,
      subject,
      body,
    });

    window.location.href = mailtoUrl;

    showMessage("Email prepared successfully. Review and send it from your mail app.", "info");
    await loadDeliveryHistory(childId);
  } catch (error) {
    console.error("Send to agency error:", error);
    showMessage(`Could not prepare delivery: ${error.message}`, "error");
  } finally {
    if (sendToAgencyBtn) {
      sendToAgencyBtn.disabled = false;
      sendToAgencyBtn.textContent = "Send to Agency";
    }
  }
}

profilePhotoInput?.addEventListener("change", async () => {
  const file = profilePhotoInput.files?.[0] || null;

  if (!file) {
    if (profilePhotoFileName) profilePhotoFileName.textContent = "No new photo selected.";
    setPhoto(currentChild?.photo_url || getDefaultPhoto());
    selectedProfilePhotoBlob = null;
    selectedProfilePhotoName = null;
    return;
  }

  try {
    const prepared = await prepareSquareImage(file, {
      size: 600,
      type: "image/jpeg",
      quality: 0.88,
    });

    selectedProfilePhotoBlob = prepared.blob;
    selectedProfilePhotoName = prepared.fileName;

    if (profilePhotoFileName) profilePhotoFileName.textContent = prepared.fileName;
    setPhoto(prepared.previewUrl);
  } catch (error) {
    console.error("Prepare child photo error:", error);
    showMessage("Could not prepare child photo.", "error");
  }
});

savePhotoBtn?.addEventListener("click", async () => {
  await uploadProfilePhoto();
});

sendToAgencyBtn?.addEventListener("click", async () => {
  await sendToAgency();
});

uploadDocumentBtn?.addEventListener("click", () => {
  if (!currentChild?.id) return;
  window.location.href = `../agreements/documents-upload.html?child_id=${encodeURIComponent(currentChild.id)}`;
});

async function boot() {
  hideMessage();

  const user = await requireAuth();
  if (!user) return;

  if (!childId) {
    showMessage("Missing child id in URL.");
    if (loadingState) loadingState.classList.add("hidden");
    return;
  }

  try {
    const child = await getChildById(childId);
    currentChild = child;

    fillChildProfile(child);
    await loadGuardians(childId);
    await loadDocuments(childId);
    await loadDeliveryHistory(childId);

    if (loadingState) loadingState.classList.add("hidden");
    if (profileContent) profileContent.classList.remove("hidden");
  } catch (error) {
    console.error("Load profile error:", error);
    showMessage(`Could not load child profile: ${error.message}`, "error");
    if (loadingState) loadingState.classList.add("hidden");
  }
}

boot();