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

function getPhotoUrl(child) {
  if (child.photo_url && String(child.photo_url).trim()) {
    return String(child.photo_url).trim();
  }
  return "";
}

function childTile(child) {
  const name = fullName(child) || "Unnamed Child";
  const classroom = child.classroom || "No classroom";
  const photoUrl = getPhotoUrl(child);
  const profileHref = `./child-profile.html?id=${encodeURIComponent(child.id)}`;

  return `
    <a class="child-tile" href="${profileHref}">
      <div class="child-photo-wrap">
        ${
          photoUrl
            ? `<img class="child-photo" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name)}" />`
            : `<div class="child-photo-placeholder" aria-hidden="true">👶</div>`
        }
      </div>

      <p class="child-name">${escapeHtml(name)}</p>
      <p class="child-classroom">${escapeHtml(classroom)}</p>

      <div class="child-status">
        ${statusBadge(child.status)}
      </div>
    </a>
  `;
}

function renderChildren(rows) {
  if (!childrenGrid || !emptyState) return;

  if (!rows.length) {
    childrenGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  childrenGrid.innerHTML = rows.map(childTile).join("");
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
  const filtered = filterChildren(searchInput?.value || "");
  renderChildren(filtered);
}

async function loadChildren() {
  showLoading(true);
  hideMessage();

  try {
    allChildren = await getChildren();
    rerenderCurrentView();

    if (!allChildren.length) {
      showMessage("No children found yet for this organization.", "info");
    }
  } catch (error) {
    console.error("Load children error:", error);
    showMessage(`Could not load children: ${error.message}`, "error");
    if (childrenGrid) childrenGrid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
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