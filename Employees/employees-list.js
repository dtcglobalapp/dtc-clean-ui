import { requireAuth } from "../auth.js";
import { getEmployees } from "./employees-api.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const employeesGrid = document.getElementById("employeesGrid");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const messageBox = document.getElementById("messageBox");

let allEmployees = [];

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

function showLoading(isLoading) {
  if (!loadingState) return;
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

function fullName(employee) {
  if (employee.display_name && String(employee.display_name).trim()) {
    return String(employee.display_name).trim();
  }

  return [employee.first_name ?? "", employee.middle_name ?? "", employee.last_name ?? ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPhotoUrl(employee) {
  if (employee.photo_url && String(employee.photo_url).trim()) {
    return String(employee.photo_url).trim();
  }
  return "";
}

function badgeHtml(text, className) {
  return `<span class="badge ${escapeHtml(className)}">${escapeHtml(text)}</span>`;
}

function employeeTile(employee) {
  const name = fullName(employee) || "Unnamed Employee";
  const role = employee.role || "employee";
  const status = employee.status || "inactive";
  const photoUrl = getPhotoUrl(employee);
  const email = employee.email || "No email";
  const pinText = employee.pin ? `PIN ${employee.pin}` : "No PIN";

  return `
    <article class="employee-tile">
      <div class="employee-photo-wrap">
        <div class="employee-role-chip">
          ${badgeHtml(role, role)}
        </div>

        ${
          photoUrl
            ? `<img class="employee-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name)}" />`
            : `<div class="employee-photo-placeholder" aria-hidden="true">🧑‍💼</div>`
        }
      </div>

      <p class="employee-name">${escapeHtml(name)}</p>
      <p class="employee-sub">${escapeHtml(email)}</p>

      <div class="employee-meta">
        <div class="employee-meta-row">
          <span class="employee-meta-label">Status</span>
          <span>${badgeHtml(status, status)}</span>
        </div>

        <div class="employee-meta-row">
          <span class="employee-meta-label">Access</span>
          <strong>${escapeHtml(pinText)}</strong>
        </div>
      </div>

      <div class="employee-actions">
        <a class="link-btn" href="./employee-profile.html?id=${encodeURIComponent(employee.id)}">Profile</a>
        <a class="link-btn" href="./employee-form.html?id=${encodeURIComponent(employee.id)}">Edit</a>
      </div>
    </article>
  `;
}

function renderEmployees(rows) {
  if (!employeesGrid || !emptyState) return;

  if (!rows.length) {
    employeesGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  employeesGrid.innerHTML = rows.map(employeeTile).join("");
}

function filterEmployees(query) {
  const q = query.trim().toLowerCase();

  if (!q) return [...allEmployees];

  return allEmployees.filter((employee) => {
    const haystack = [
      employee.first_name,
      employee.middle_name,
      employee.last_name,
      employee.display_name,
      employee.role,
      employee.status,
      employee.email,
      employee.phone,
      employee.pin,
      employee.primary_location_label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function rerenderCurrentView() {
  const filtered = filterEmployees(searchInput?.value || "");
  renderEmployees(filtered);
}

async function loadEmployees() {
  showLoading(true);
  hideMessage();

  try {
    allEmployees = await getEmployees();
    rerenderCurrentView();

    if (!allEmployees.length) {
      showMessage("No employees found yet for this organization.", "info");
    }
  } catch (error) {
    console.error("Load employees error:", error);
    showMessage(`Could not load employees: ${error.message}`, "error");
    if (employeesGrid) employeesGrid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
  } finally {
    showLoading(false);
  }
}

searchInput?.addEventListener("input", () => {
  rerenderCurrentView();
});

refreshBtn?.addEventListener("click", () => {
  loadEmployees();
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;
  await loadEmployees();
}

boot();