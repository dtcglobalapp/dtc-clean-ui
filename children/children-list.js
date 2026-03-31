import { requireAuth } from "../auth.js";
import { getChildren } from "./children-api.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const childrenGrid = document.getElementById("childrenGrid");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const messageBox = document.getElementById("messageBox");

let allChildren = [];

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
  if (!childrenGrid) return;
  childrenGrid.classList.toggle("hidden", !isVisible);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fullName(child) {
  return [child?.first_name, child?.middle_name, child?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed Child";
}

function getPhotoUrl(child) {
  if (child?.photo_url && String(child.photo_url).trim()) {
    return String(child.photo_url).trim();
  }
  return "https://placehold.co/320x320?text=Child";
}

function getStatusBadgeClass(status = "") {
  const s = String(status).toLowerCase();

  if (s === "active") return "dtc-badge dtc-badge-success";
  if (s === "pending") return "dtc-badge dtc-badge-warning";
  return "dtc-badge dtc-badge-neutral";
}

function childCard(child) {
  const name = escapeHtml(fullName(child));
  const classroom = child.classroom || "No classroom";
  const status = child.status || "inactive";

  return `
    <article class="dtc-record-card">

      <img
        class="dtc-card-photo"
        src="${escapeHtml(getPhotoUrl(child))}"
        alt="${name}"
      />

      <h3 class="dtc-card-name">${name}</h3>
      <p class="dtc-card-subtitle">${escapeHtml(classroom)}</p>

      <div class="dtc-inline-meta">
        <span class="${getStatusBadgeClass(status)}">
          ${escapeHtml(status)}
        </span>
      </div>

      <div class="dtc-card-footer">
        <a
          class="dtc-btn dtc-btn-primary dtc-btn-sm"
          href="./child-profile.html?id=${encodeURIComponent(child.id)}"
        >
          Profile
        </a>
      </div>

    </article>
  `;
}

function renderChildren(rows) {
  if (!childrenGrid) return;

  if (!rows.length) {
    childrenGrid.innerHTML = "";
    showEmpty(true);
    showGrid(false);
    return;
  }

  showEmpty(false);
  showGrid(true);
  childrenGrid.innerHTML = rows.map(childCard).join("");
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

function rerenderCurrentView() {
  renderChildren(filterChildren(searchInput?.value || ""));
}

async function loadChildren() {
  showLoading(true);
  hideMessage();

  try {
    allChildren = await getChildren();
    rerenderCurrentView();

    if (!allChildren.length) {
      hideMessage();
    }
  } catch (error) {
    console.error("Load children error:", error);

    showMessage(`Could not load children: ${error.message}`, "error");

    if (childrenGrid) childrenGrid.innerHTML = "";

    showEmpty(true);
    showGrid(false);
  } finally {
    showLoading(false);
  }
}

searchInput?.addEventListener("input", () => {
  rerenderCurrentView();
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