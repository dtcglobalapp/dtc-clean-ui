import { requireAuth, supabase } from "../auth.js";
import { getChildById, updateChild } from "./children-api.js";

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

const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");
const profilePhotoFileName = document.getElementById("profilePhotoFileName");

const sendToAgencyBtn = document.getElementById("sendToAgencyBtn");
const deliveryEmpty = document.getElementById("deliveryEmpty");
const deliveryTableWrap = document.getElementById("deliveryTableWrap");
const deliveryTableBody = document.getElementById("deliveryTableBody");

let currentChild = null;
let selectedProfilePhoto = null;
let currentDocuments = [];

function showMessage(text, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  if (!messageBox) return;
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

function buildPhoneLine(phone, extension) {
  const formatted = formatPhoneNumber(phone);
  if (formatted === "—") return "—";
  if (extension && String(extension).trim()) {
    return `${formatted} ext. ${String(extension).trim()}`;
  }
  return formatted;
}

function buildActionLinks(phone, email) {
  const normalizedPhone = normalizePhoneForLink(phone);
  const safeEmail = email ? String(email).trim() : "";

  const callLink = normalizedPhone
    ? `<a class="link-btn" href="tel:+${normalizedPhone}">Call</a>`
    : "";
  const textLink = normalizedPhone
    ? `<a class="link-btn" href="sms:+${normalizedPhone}">Text</a>`
    : "";
  const whatsappLink = normalizedPhone
    ? `<a class="link-btn" href="https://wa.me/${normalizedPhone}" target="_blank" rel="noopener noreferrer">WhatsApp</a>`
    : "";
  const emailLink = safeEmail
    ? `<a class="link-btn" href="mailto:${escapeHtml(safeEmail)}">Email</a>`
    : "";

  return [callLink, textLink, whatsappLink, emailLink].filter(Boolean).join("");
}

function statusBadge(status = "active") {
  if (!profileStatus) return;
  profileStatus.className = `badge ${String(status).toLowerCase()}`;
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
  const safe = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(prettyReviewStatus(status))}</span>`;
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
      <td>
        <div class="row-actions">
          ${
            doc.file_url
              ? `<a class="link-btn" href="${safeFileUrl}" target="_blank" rel="noopener noreferrer">Open</a>`
              : `<span class="link-btn disabled">No File</span>`
          }
        </div>
      </td>
    </tr>
  `;
}

function guardianCard(guardian) {
  const relationship = guardian.relationship_to_child || "Guardian";
  const primaryPhone = buildPhoneLine(guardian.phone, guardian.phone_extension);
  const secondaryPhone = buildPhoneLine(guardian.secondary_phone, guardian.secondary_phone_extension);
  const email = guardian.email || "—";
  const preferred = guardian.preferred_contact_method || "—";
  const actions = buildActionLinks(guardian.phone, guardian.email);

  return `
    <article class="guardian-card">
      <div class="guardian-card-body">
        <h3>${escapeHtml(`${guardian.first_name || ""} ${guardian.last_name || ""}`.trim() || "Unnamed Guardian")}</h3>
        <p><strong>Relationship:</strong> ${escapeHtml(relationship)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(primaryPhone)}</p>
        ${secondaryPhone !== "—" ? `<p><strong>Secondary:</strong> ${escapeHtml(secondaryPhone)}</p>` : ""}
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${preferred !== "—" ? `<p><strong>Preferred Contact:</strong> ${escapeHtml(preferred)}</p>` : ""}
        <div class="row-actions guardian-actions-row">
          ${actions}
        </div>
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

  if (uploadDocumentBtn && uploadDocumentBtn.tagName === "A") {
    uploadDocumentBtn.href = `../agreements/documents-upload.html?child_id=${encodeURIComponent(child.id)}`;
  }
}

async function loadGuardians(childIdValue) {
  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
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
    .eq("child_id", childIdValue);

  if (error) throw error;

  const guardians = (data ?? [])
    .map((item) => item.guardians)
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
    ? row.recipients.map((item) => {
        if (typeof item === "string") return item;
        if (item?.email) return item.email;
        if (item?.name && item?.email) return `${item.name} (${item.email})`;
        if (item?.name) return item.name;
        return "";
      }).filter(Boolean).join(", ")
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
  if (!selectedProfilePhoto || !currentChild) return;

  hideMessage();

  if (savePhotoBtn) {
    savePhotoBtn.disabled = true;
    savePhotoBtn.textContent = "Saving...";
  }

  try {
    const storagePath = buildPhotoPath(selectedProfilePhoto.name);

    const { error } = await supabase.storage
      .from("dtc-documents")
      .upload(storagePath, selectedProfilePhoto, {
        upsert: false,
        contentType: selectedProfilePhoto.type || "application/octet-stream",
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

    selectedProfilePhoto = null;

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
  const params = new URLSearchParams();
  if (cc) params.set("cc", cc);
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);

  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
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
  const childName = [currentChild.first_name, currentChild.last_name].filter(Boolean).join(" ").trim() || "Child";
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
            ...(testCcEmail ? [{ name: "Test CC", email: testCcEmail }] : [])
          ],
          delivery_type: "email",
          sent_by_user_id: null,
          sent_by_name: "DTC User",
          status: "prepared",
          notes: "Test delivery opened with mailto from Child Profile.",
          metadata: {
            file_url: latestDoc.file_url || null,
            subject
          }
        }
      ]);

    if (error) throw error;

    const mailtoUrl = buildMailtoUrl({
      to: testPrimaryEmail,
      cc: testCcEmail,
      subject,
      body
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

profilePhotoInput?.addEventListener("change", () => {
  const file = profilePhotoInput.files?.[0] || null;
  selectedProfilePhoto = file;

  if (file) {
    if (profilePhotoFileName) profilePhotoFileName.textContent = file.name;
    setPhoto(URL.createObjectURL(file));
  } else {
    if (profilePhotoFileName) profilePhotoFileName.textContent = "No new photo selected.";
    setPhoto(currentChild?.photo_url || getDefaultPhoto());
  }
});

savePhotoBtn?.addEventListener("click", async () => {
  await uploadProfilePhoto();
});

sendToAgencyBtn?.addEventListener("click", async () => {
  await sendToAgency();
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