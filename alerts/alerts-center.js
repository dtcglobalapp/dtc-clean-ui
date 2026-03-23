import { requireAuth, supabase } from "../auth.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const alertsList = document.getElementById("alertsList");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const messageBox = document.getElementById("messageBox");

const decisionEmpty = document.getElementById("decisionEmpty");
const decisionContent = document.getElementById("decisionContent");

const detailChildName = document.getElementById("detailChildName");
const detailGuardianName = document.getElementById("detailGuardianName");
const detailPreferredMethod = document.getElementById("detailPreferredMethod");
const detailSuggestedMethod = document.getElementById("detailSuggestedMethod");
const detailTitle = document.getElementById("detailTitle");
const detailMessage = document.getElementById("detailMessage");

const actionCall = document.getElementById("actionCall");
const actionText = document.getElementById("actionText");
const actionWhatsApp = document.getElementById("actionWhatsApp");
const actionEmail = document.getElementById("actionEmail");
const dismissBtn = document.getElementById("dismissBtn");
const completeBtn = document.getElementById("completeBtn");

let allAlerts = [];
let selectedAlert = null;
let currentUserId = null;

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

function showLoading(loading) {
  if (!loadingState) return;
  loadingState.classList.toggle("hidden", !loading);
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

function normalizePhoneForAction(value = "") {
  let digits = normalizePhone(value);
  if (digits.length === 10) digits = `1${digits}`;
  return digits;
}

function prettyStatus(value = "") {
  const map = {
    pending: "Pending",
    approved: "Approved",
    dismissed: "Dismissed",
    completed: "Completed",
  };
  return map[value] || value || "Pending";
}

function badgeHtml(status = "") {
  const safe = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(prettyStatus(status))}</span>`;
}

function suggestContactMethod(alert) {
  return (
    alert.preferred_contact_method ||
    alert.suggested_contact_method ||
    "Text"
  );
}

function buildReminderMessage(alert) {
  const guardianFirstName =
    alert.guardians?.first_name ||
    alert.guardian_first_name ||
    "";
  const childName = alert.child_name || "This child";
  const documentTitle = alert.title || "document";
  const days = alert.days_remaining ?? "a few";

  return `Hello ${guardianFirstName}, this is a reminder from Miriam Group Daycare.

${childName}'s ${documentTitle} will expire in ${days} day(s).

Please send the updated record as soon as possible.

Thank you.`;
}

function renderAlerts(rows) {
  if (!alertsList || !emptyState) return;

  if (!rows.length) {
    alertsList.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  alertsList.innerHTML = rows
    .map((alert) => {
      const selectedClass = selectedAlert?.id === alert.id ? "selected" : "";
      const suggested = suggestContactMethod(alert);

      return `
        <button class="alert-item ${selectedClass}" data-alert-id="${escapeHtml(alert.id)}" type="button">
          <div class="alert-item-top">
            <div>
              <h3>${escapeHtml(alert.child_name || "Unknown Child")}</h3>
              <p>${escapeHtml(alert.title || "Alert")}</p>
            </div>
            ${badgeHtml(alert.status)}
          </div>

          <div class="alert-item-meta">
            <span><strong>Due:</strong> ${escapeHtml(alert.due_date || "—")}</span>
            <span><strong>Days left:</strong> ${escapeHtml(alert.days_remaining ?? "—")}</span>
          </div>

          <div class="alert-item-footer">
            <span class="mini-note">${escapeHtml(String(suggested).toUpperCase())} RECOMMENDED</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function filterAlerts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [...allAlerts];

  return allAlerts.filter((alert) => {
    const haystack = [
      alert.child_name,
      alert.guardian_name,
      alert.title,
      alert.message,
      alert.alert_type,
      alert.status,
      alert.preferred_contact_method,
      alert.suggested_contact_method,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function fillDecisionCenter(alert) {
  if (!decisionEmpty || !decisionContent) return;

  const childName = alert.child_name || "Unknown Child";
  const guardianName = alert.guardian_name || "No guardian";
  const preferredMethod = alert.preferred_contact_method || "—";
  const suggestedMethod = suggestContactMethod(alert);
  const message = buildReminderMessage(alert);

  decisionEmpty.classList.add("hidden");
  decisionContent.classList.remove("hidden");

  detailChildName.textContent = childName;
  detailGuardianName.textContent = guardianName;
  detailPreferredMethod.textContent = preferredMethod;
  detailSuggestedMethod.textContent = suggestedMethod;
  detailTitle.textContent = alert.title || "Alert";
  detailMessage.textContent = message;

  [actionCall, actionText, actionWhatsApp, actionEmail].forEach((btn) => {
    btn.classList.remove("highlighted");
  });

  const normalized = String(suggestedMethod).toLowerCase();
  if (normalized === "call") actionCall.classList.add("highlighted");
  if (normalized === "text") actionText.classList.add("highlighted");
  if (normalized === "whatsapp") actionWhatsApp.classList.add("highlighted");
  if (normalized === "email") actionEmail.classList.add("highlighted");
}

async function loadAlerts() {
  showLoading(true);
  hideMessage();

  try {
    const { data, error } = await supabase
      .from("dtc_alerts")
      .select(`
        *,
        children:child_id (
          id,
          first_name,
          last_name
        ),
        guardians:guardian_id (
          id,
          first_name,
          last_name,
          phone,
          email,
          preferred_contact_method
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allAlerts = (data ?? []).map((row) => {
      const childName = row.children
        ? `${row.children.first_name || ""} ${row.children.last_name || ""}`.trim()
        : "Unknown Child";

      const guardianName = row.guardians
        ? `${row.guardians.first_name || ""} ${row.guardians.last_name || ""}`.trim()
        : "No guardian";

      return {
        ...row,
        child_name: childName,
        guardian_name: guardianName,
        guardian_phone: row.guardians?.phone || "",
        guardian_email: row.guardians?.email || "",
        preferred_contact_method:
          row.guardians?.preferred_contact_method ||
          row.suggested_contact_method ||
          "",
      };
    });

    const filtered = filterAlerts(searchInput?.value || "");
    renderAlerts(filtered);

    if (!allAlerts.length) {
      showMessage("No alerts available right now.", "info");
    }
  } catch (error) {
    console.error("Load alerts error:", error);
    showMessage(`Could not load alerts: ${error.message}`, "error");
    if (alertsList) alertsList.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
  } finally {
    showLoading(false);
  }
}

async function insertAlertAction(actionType) {
  if (!selectedAlert) return;

  const message = buildReminderMessage(selectedAlert);
  const phone = selectedAlert.guardian_phone || null;
  const email = selectedAlert.guardian_email || null;

  let targetValue = null;

  if (actionType === "call" || actionType === "text" || actionType === "whatsapp") {
    targetValue = phone;
  }

  if (actionType === "email") {
    targetValue = email;
  }

  const { error } = await supabase.rpc("save_alert_action", {
    p_organization_id: selectedAlert.organization_id,
    p_alert_id: selectedAlert.id,
    p_action_type: actionType,
    p_target_value: targetValue,
    p_note: null,
    p_performed_by_name: "Staff",
    p_metadata: {
      child_name: selectedAlert.child_name || null,
      guardian_name: selectedAlert.guardian_name || null,
      guardian_phone: phone,
      guardian_email: email,
      message
    }
  });

  if (error) throw error;
}

async function updateAlertStatus(status) {
  if (!selectedAlert) return;

  const { error } = await supabase
    .from("dtc_alerts")
    .update({ status })
    .eq("id", selectedAlert.id);

  if (error) throw error;
}

function openContactAction(method, phone, email, message) {
  const cleanPhone = normalizePhoneForAction(phone);

  if (method === "call" && cleanPhone) {
    window.location.href = `tel:+${cleanPhone}`;
    return;
  }

  if (method === "text" && cleanPhone) {
    window.location.href = `sms:+${cleanPhone}?body=${encodeURIComponent(message)}`;
    return;
  }

  if (method === "whatsapp" && cleanPhone) {
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    return;
  }

  if (method === "email" && email) {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("Daycare Reminder")}&body=${encodeURIComponent(message)}`;
  }
}

async function executeAction(actionType) {
  if (!selectedAlert) return;

  try {
    const message = buildReminderMessage(selectedAlert);
    const phoneToUse = selectedAlert.guardian_phone || "";
    const emailToUse = selectedAlert.guardian_email || "";

    await insertAlertAction(actionType);

    openContactAction(actionType, phoneToUse, emailToUse, message);

    showMessage(`${actionType} opened. Alert remains pending until you dismiss or complete it.`, "info");
  } catch (error) {
    console.error("Execute action error:", error);
    showMessage(`Could not execute action: ${error.message}`, "error");
  }
}

alertsList?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-alert-id]");
  if (!card) return;

  const alertId = card.dataset.alertId;
  const found = allAlerts.find((item) => item.id === alertId);
  if (!found) return;

  selectedAlert = found;
  fillDecisionCenter(found);
  renderAlerts(filterAlerts(searchInput?.value || ""));
});

searchInput?.addEventListener("input", () => {
  renderAlerts(filterAlerts(searchInput.value));
});

refreshBtn?.addEventListener("click", async () => {
  await loadAlerts();
});

actionCall?.addEventListener("click", async () => {
  await executeAction("call");
});

actionText?.addEventListener("click", async () => {
  await executeAction("text");
});

actionWhatsApp?.addEventListener("click", async () => {
  await executeAction("whatsapp");
});

actionEmail?.addEventListener("click", async () => {
  await executeAction("email");
});

dismissBtn?.addEventListener("click", async () => {
  if (!selectedAlert) return;

  try {
    await updateAlertStatus("dismissed");
    showMessage("Alert dismissed.", "info");

    selectedAlert = null;
    decisionContent.classList.add("hidden");
    decisionEmpty.classList.remove("hidden");

    await loadAlerts();
  } catch (error) {
    console.error("Dismiss alert error:", error);
    showMessage(`Could not dismiss alert: ${error.message}`, "error");
  }
});

completeBtn?.addEventListener("click", async () => {
  if (!selectedAlert) return;

  try {
    await updateAlertStatus("completed");
    showMessage("Alert marked as completed.", "info");

    selectedAlert = null;
    decisionContent.classList.add("hidden");
    decisionEmpty.classList.remove("hidden");

    await loadAlerts();
  } catch (error) {
    console.error("Complete alert error:", error);
    showMessage(`Could not complete alert: ${error.message}`, "error");
  }
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  currentUserId = user.id;
  await loadAlerts();
}

boot();