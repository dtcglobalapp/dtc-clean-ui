import { requireAuth } from "../auth.js";
import { getChildren } from "./children-api.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.getElementById("childrenTableBody");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const messageBox = document.getElementById("messageBox");

let allChildren = [];

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
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

function fullName(child) {
  return [child.first_name ?? "", child.middle_name ?? "", child.last_name ?? ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function statusBadge(status = "") {
  const safe = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(status || "unknown")}</span>`;
}

function childRow(child) {
  const name = fullName(child);
  const gender = child.gender || "—";
  const classroom = child.classroom || "—";
  const dob = formatDate(child.date_of_birth);
  const enrollmentDate = formatDate(child.enrollment_date);

  return `
    <tr>
      <td>
        <div class="name-cell">
          <span class="name-main">${escapeHtml(name || "Unnamed Child")}</span>
          <span class="name-sub">ID: ${escapeHtml(child.id)}</span>
        </div>
      </td>
      <td>${escapeHtml(dob)}</td>
      <td>${escapeHtml(gender)}</td>
      <td>${escapeHtml(classroom)}</td>
      <td>${statusBadge(child.status)}</td>
      <td>${escapeHtml(enrollmentDate)}</td>
      <td>
        <div class="row-actions">
          <a class="link-btn" href="./child-edit.html?id=${encodeURIComponent(child.id)}">Edit</a>
          <a class="link-btn" href="./child-profile.html?id=${encodeURIComponent(child.id)}">Profile</a>
        </div>
      </td>
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
  tableBody.innerHTML = rows.map(childRow).join("");
}

function filterChildren(query) {
  const q = query.trim().toLowerCase();

  if (!q) return [...allChildren];

  return allChildren.filter((child) => {
    const haystack = [
      child.first_name,
      child.middle_name,
      child.last_name,
      child.classroom,
      child.status,
      child.gender,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

async function loadChildren() {
  showLoading(true);
  hideMessage();

  try {
    allChildren = await getChildren();
    const filtered = filterChildren(searchInput.value);
    renderTable(filtered);

    if (!allChildren.length) {
      showMessage("No children found yet for this organization.", "info");
    }
  } catch (error) {
    console.error("Load children error:", error);
    showMessage(`Could not load children: ${error.message}`, "error");
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
  } finally {
    showLoading(false);
  }
}

searchInput?.addEventListener("input", () => {
  const filtered = filterChildren(searchInput.value);
  renderTable(filtered);
});

refreshBtn?.addEventListener("click", () => {
  loadChildren();
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;
  await loadChildren();
}

boot();