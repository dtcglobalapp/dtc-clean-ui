import { supabase, requireAuth } from "../auth.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.getElementById("documentsTableBody");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const messageBox = document.getElementById("messageBox");

const transmissionsTableBody = document.getElementById("transmissionsTableBody");
const transmissionEmptyState = document.getElementById("transmissionEmptyState");
const transmissionTableWrap = document.getElementById("transmissionTableWrap");
const transmissionMessageBox = document.getElementById("transmissionMessageBox");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const backBtn = document.getElementById("backBtn");
const uploadBtn = document.getElementById("uploadBtn");
const emptyUploadBtn = document.getElementById("emptyUploadBtn");

const params = new URLSearchParams(window.location.search);
const filteredChildId = params.get("child_id");

let allDocuments = [];
let currentChildName = "";

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function showTransmissionMessage(text, type = "info") {
  transmissionMessageBox.textContent = text;
  transmissionMessageBox.className = `message ${type}`;
}

function hideTransmissionMessage() {
  transmissionMessageBox.textContent = "";
  transmissionMessageBox.className = "message hidden";
}

function showLoading(isLoading) {
  loadingState.classList.toggle("hidden", !isLoading);
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

function formatDateTime(value) {
  if (!value) return "—";

  const parsed = parseDateOnly(value);
  if (parsed) {
    return `${parsed.month}/${parsed.day}/${parsed.year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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

function prettyRecipientType(value = "") {
  const map = {
    agency: "Agency",
    parent: "Parent",
    inspector: "Inspector",
  };

  return map[value] || value || "—";
}

function statusBadge(status = "") {
  const safe = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(prettyReviewStatus(status))}</span>`;
}

function deliveryBadge(status = "") {
  const safeClass = String(status).toLowerCase() === "sent" ? "approved" : "rejected";
  return `<span class="badge ${escapeHtml(safeClass)}">${escapeHtml(status || "unknown")}</span>`;
}

function renewalBadge(requiresRenewal) {
  if (requiresRenewal) {
    return `<span class="badge waitlist">Yes</span>`;
  }
  return `<span class="badge graduated">No</span>`;
}

function documentRow(doc) {
  const childName = `${doc.child_first_name ?? ""} ${doc.child_last_name ?? ""}`.trim() || "—";

  return `
    <tr>
      <td>${escapeHtml(childName)}</td>
      <td>${escapeHtml(doc.title || "—")}</td>
      <td>${escapeHtml(prettyDocumentType(doc.document_type))}</td>
      <td>${statusBadge(doc.review_status)}</td>
      <td>${escapeHtml(formatDate(doc.issue_date))}</td>
      <td>${escapeHtml(formatDate(doc.expires_at))}</td>
      <td>${renewalBadge(doc.requires_renewal)}</td>
      <td>
        <div class="row-actions">
          <a class="link-btn" href="${encodeURI(doc.file_url)}" target="_blank" rel="noopener noreferrer">Open</a>
          <button class="link-btn" data-action="download" data-url="${escapeHtml(doc.file_url)}">Download</button>
          <button class="link-btn" data-action="print" data-id="${escapeHtml(doc.id)}">Print</button>
          <button class="link-btn" data-action="send" data-id="${escapeHtml(doc.id)}">Send</button>
          <button class="link-btn" data-action="approve" data-id="${escapeHtml(doc.id)}">Approve</button>
          <button class="link-btn" data-action="history" data-id="${escapeHtml(doc.id)}">History</button>
        </div>
      </td>
    </tr>
  `;
}

function transmissionRow(item) {
  return `
    <tr>
      <td>${escapeHtml(formatDateTime(item.sent_at))}</td>
      <td>${escapeHtml(item.recipient_email || "—")}</td>
      <td>${escapeHtml(prettyRecipientType(item.recipient_type))}</td>
      <td>${deliveryBadge(item.delivery_status)}</td>
      <td>${escapeHtml(item.notes || "—")}</td>
    </tr>
  `;
}

function renderTable(rows) {
  if (!rows.length) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableWrap.classList.remove("hidden");
  tableBody.innerHTML = rows.map(documentRow).join("");
}

function renderTransmissions(rows) {
  if (!rows.length) {
    transmissionsTableBody.innerHTML = "";
    transmissionTableWrap.classList.add("hidden");
    transmissionEmptyState.classList.remove("hidden");
    return;
  }

  transmissionEmptyState.classList.add("hidden");
  transmissionTableWrap.classList.remove("hidden");
  transmissionsTableBody.innerHTML = rows.map(transmissionRow).join("");
}

function filterDocuments(query) {
  const q = query.trim().toLowerCase();

  if (!q) return [...allDocuments];

  return allDocuments.filter((doc) => {
    const haystack = [
      doc.child_first_name,
      doc.child_last_name,
      doc.title,
      prettyDocumentType(doc.document_type),
      prettyReviewStatus(doc.review_status),
      doc.file_name,
      doc.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

async function loadChildContext() {
  if (!filteredChildId) return;

  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, last_name")
    .eq("id", filteredChildId)
    .single();

  if (error) throw error;

  currentChildName = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();

  pageTitle.textContent = currentChildName
    ? `${currentChildName} Documents`
    : "Child Documents";

  pageSubtitle.textContent = currentChildName
    ? `Review, approve, print, and track documents connected to ${currentChildName}.`
    : "Review, approve, print, and track sensitive child documents uploaded by the daycare team.";

  backBtn.href = `../children/child-profile.html?id=${encodeURIComponent(filteredChildId)}`;
  uploadBtn.href = `./documents-upload.html?child_id=${encodeURIComponent(filteredChildId)}`;
  emptyUploadBtn.href = `./documents-upload.html?child_id=${encodeURIComponent(filteredChildId)}`;
}

async function loadDocuments() {
  showLoading(true);
  hideMessage();

  try {
    let query = supabase
      .from("child_documents_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (filteredChildId) {
      query = query.eq("child_id", filteredChildId);
    }

    const { data, error } = await query;

    if (error) throw error;

    allDocuments = data ?? [];
    renderTable(filterDocuments(searchInput.value));

    if (!allDocuments.length) {
      showMessage("No documents found yet for this selection.", "info");
    }
  } catch (error) {
    console.error("Load documents error:", error);
    showMessage(`Could not load documents: ${error.message}`, "error");
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
  } finally {
    showLoading(false);
  }
}

async function loadTransmissionHistory(documentId) {
  hideTransmissionMessage();

  try {
    const { data, error } = await supabase
      .from("document_transmissions")
      .select("*")
      .eq("document_id", documentId)
      .order("sent_at", { ascending: false });

    if (error) throw error;

    renderTransmissions(data ?? []);

    if (!(data ?? []).length) {
      showTransmissionMessage("No transmission history for this document yet.", "info");
    }
  } catch (error) {
    console.error("Load transmissions error:", error);
    showTransmissionMessage(`Could not load history: ${error.message}`, "error");
    renderTransmissions([]);
  }
}

async function approveDocument(documentId) {
  try {
    const { error } = await supabase
      .from("child_documents")
      .update({ review_status: "approved" })
      .eq("id", documentId);

    if (error) throw error;

    await loadDocuments();
    showMessage("Document approved successfully.", "info");
  } catch (error) {
    console.error("Approve document error:", error);
    showMessage(`Could not approve document: ${error.message}`, "error");
  }
}

async function sendDocument(documentId) {
  const recipientEmail = prompt("Enter email to send this document:");
  if (!recipientEmail) return;

  const recipientTypeInput = prompt("Recipient type: agency, parent, or inspector", "agency");
  const recipientType = (recipientTypeInput || "agency").trim().toLowerCase();

  if (!["agency", "parent", "inspector"].includes(recipientType)) {
    alert("Recipient type must be: agency, parent, or inspector.");
    return;
  }

  const notes = prompt("Optional note for this transmission:", "") || null;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No authenticated user found.");

    const { error } = await supabase
      .from("document_transmissions")
      .insert([
        {
          document_id: documentId,
          sent_by_user_id: user.id,
          recipient_email: recipientEmail,
          recipient_type: recipientType,
          delivery_status: "sent",
          notes,
        },
      ]);

    if (error) throw error;

    showMessage("Transmission recorded successfully.", "info");
    await loadTransmissionHistory(documentId);
  } catch (error) {
    console.error("Send document error:", error);
    showMessage(`Could not record transmission: ${error.message}`, "error");
  }
}

function downloadFile(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function printDocument(documentId) {
  const doc = allDocuments.find((item) => item.id === documentId);
  if (!doc) {
    alert("Document not found.");
    return;
  }

  const childName = `${doc.child_first_name ?? ""} ${doc.child_last_name ?? ""}`.trim() || "—";

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Compliance Copy</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 32px;
          color: #111827;
        }
        h1 {
          margin-bottom: 6px;
        }
        p {
          margin: 6px 0;
        }
        .section {
          margin-top: 24px;
        }
        .label {
          font-weight: 700;
        }
        .file-link {
          margin-top: 14px;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <h1>DTC Clean — Compliance Copy</h1>
      <p><span class="label">Child:</span> ${escapeHtml(childName)}</p>
      <p><span class="label">Title:</span> ${escapeHtml(doc.title || "—")}</p>
      <p><span class="label">Document Type:</span> ${escapeHtml(prettyDocumentType(doc.document_type))}</p>
      <p><span class="label">Review Status:</span> ${escapeHtml(prettyReviewStatus(doc.review_status))}</p>
      <p><span class="label">Issue Date:</span> ${escapeHtml(formatDate(doc.issue_date))}</p>
      <p><span class="label">Expiration Date:</span> ${escapeHtml(formatDate(doc.expires_at))}</p>
      <p><span class="label">Requires Renewal:</span> ${doc.requires_renewal ? "Yes" : "No"}</p>
      <div class="section">
        <p><span class="label">Notes:</span></p>
        <p>${escapeHtml(doc.notes || "—")}</p>
      </div>
      <div class="section file-link">
        <p><span class="label">File URL:</span> ${escapeHtml(doc.file_url || "—")}</p>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

tableBody?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const documentId = button.dataset.id;
  const url = button.dataset.url;

  if (action === "download" && url) {
    downloadFile(url);
    return;
  }

  if (action === "print" && documentId) {
    printDocument(documentId);
    return;
  }

  if (action === "send" && documentId) {
    await sendDocument(documentId);
    return;
  }

  if (action === "approve" && documentId) {
    await approveDocument(documentId);
    return;
  }

  if (action === "history" && documentId) {
    await loadTransmissionHistory(documentId);
  }
});

searchInput?.addEventListener("input", () => {
  renderTable(filterDocuments(searchInput.value));
});

refreshBtn?.addEventListener("click", () => {
  loadDocuments();
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  if (filteredChildId) {
    try {
      await loadChildContext();
    } catch (error) {
      console.error("Load child context error:", error);
    }
  }

  await loadDocuments();
}

boot();