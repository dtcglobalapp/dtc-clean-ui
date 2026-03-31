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

function showLoading(isLoading) {
  if (!loadingState) return;
  loadingState.classList.toggle("hidden", !isLoading);
}

function showEmpty(isVisible) {
  if (!emptyState) return;
  emptyState.classList.toggle("hidden", !isVisible);
}

function showGrid(isVisible) {
  if (!employeesGrid) return;
  employeesGrid.classList.toggle("hidden", !isVisible);
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
  if (employee.display_name) return employee.display_name;

  return [employee.first_name, employee.middle_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed Employee";
}

function getPhoto(employee) {
  return employee.photo_url || "https://placehold.co/320x320?text=Employee";
}

function getBadge(status) {
  const s = String(status).toLowerCase();

  if (s === "active") return "dtc-badge dtc-badge-success";
  if (s === "pending") return "dtc-badge dtc-badge-warning";
  return "dtc-badge dtc-badge-neutral";
}

function employeeCard(employee) {
  const name = escapeHtml(fullName(employee));
  const role = employee.role || "Employee";
  const email = employee.email || "No email";
  const status = employee.status || "inactive";
  const pin = employee.pin ? `PIN ${employee.pin}` : "No PIN";

  return `
    <article class="dtc-record-card">

      <img
        class="dtc-card-photo"
        src="${escapeHtml(getPhoto(employee))}"
        alt="${name}"
      />

      <h3 class="dtc-card-name">${name}</h3>
      <p class="dtc-card-subtitle">${escapeHtml(role)}</p>

      <div class="dtc-inline-meta">
        <span class="${getBadge(status)}">${escapeHtml(status)}</span>
      </div>

      <div class="dtc-stack-sm">
        <div class="dtc-person-meta">
          <strong>Email:</strong> ${escapeHtml(email)}
        </div>

        <div class="dtc-person-meta">
          <strong>Access:</strong> ${escapeHtml(pin)}
        </div>
      </div>

      <div class="dtc-card-footer">
        <a class="dtc-btn dtc-btn-secondary dtc-btn-sm"
           href="./employee-profile.html?id=${encodeURIComponent(employee.id)}">
           Profile
        </a>

        <a class="dtc-btn dtc-btn-ghost dtc-btn-sm"
           href="./employee-form.html?id=${encodeURIComponent(employee.id)}">
           Edit
        </a>
      </div>

    </article>
  `;
}

function renderEmployees(rows) {
  if (!employeesGrid) return;

  if (!rows.length) {
    employeesGrid.innerHTML = "";
    showEmpty(true);
    showGrid(false);
    return;
  }

  showEmpty(false);
  showGrid(true);
  employeesGrid.innerHTML = rows.map(employeeCard).join("");
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
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

function rerender() {
  renderEmployees(filterEmployees(searchInput?.value || ""));
}

async function loadEmployees() {
  showLoading(true);
  hideMessage();

  try {
    allEmployees = await getEmployees();
    rerender();
  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
    showEmpty(true);
  } finally {
    showLoading(false);
  }
}

searchInput?.addEventListener("input", rerender);
refreshBtn?.addEventListener("click", loadEmployees);

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  await loadEmployees();
}

boot();