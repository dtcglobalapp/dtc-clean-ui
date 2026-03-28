import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const guardiansGrid = document.getElementById("guardiansGrid");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const messageBox = document.getElementById("messageBox");
const brandMain = document.getElementById("brandMain");
const brandSub = document.getElementById("brandSub");

let allGuardians = [];

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

function formatStatus(status = "") {
  return String(status || "inactive").toLowerCase();
}

function formatPhone(value = "") {
  if (!value) return "No phone";

  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  return value;
}

function getGuardianPhoto(guardian) {
  return guardian.photo_url || "https://placehold.co/320x320?text=Guardian";
}

function getDisplayName(guardian) {
  if (guardian.display_name && guardian.display_name.trim()) {
    return guardian.display_name.trim();
  }

  return [guardian.first_name, guardian.middle_name, guardian.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed Guardian";
}

function guardianCard(guardian) {
  const status = formatStatus(guardian.status);
  const relationship = guardian.relationship_default || "Guardian";
  const email = guardian.email || "No email";
  const phone = formatPhone(guardian.phone);
  const whatsapp = guardian.whatsapp ? formatPhone(guardian.whatsapp) : "No WhatsApp";
  const pinLabel = guardian.pin ? `PIN ${escapeHtml(guardian.pin)}` : "No PIN";

  return `
    <article class="guardian-card">
      <div class="guardian-photo-wrap">
        <img class="guardian-photo" src="${escapeHtml(getGuardianPhoto(guardian))}" alt="${escapeHtml(getDisplayName(guardian))}" />
        <span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>
      </div>

      <div class="guardian-body">
        <h3 class="guardian-name">${escapeHtml(getDisplayName(guardian))}</h3>
        <p class="guardian-subtitle">${escapeHtml(relationship)}</p>

        <div class="guardian-meta">
          <div class="meta-row">
            <span class="meta-label">Email</span>
            <span class="meta-value">${escapeHtml(email)}</span>
          </div>

          <div class="meta-row">
            <span class="meta-label">Phone</span>
            <span class="meta-value">${escapeHtml(phone)}</span>
          </div>

          <div class="meta-row">
            <span class="meta-label">WhatsApp</span>
            <span class="meta-value">${escapeHtml(whatsapp)}</span>
          </div>

          <div class="meta-row">
            <span class="meta-label">Access</span>
            <span class="meta-value">${pinLabel}</span>
          </div>
        </div>

        <div class="guardian-actions">
          <a class="btn btn-secondary btn-small" href="./guardian-profile.html?id=${encodeURIComponent(guardian.id)}">Profile</a>
          <a class="btn btn-secondary btn-small" href="./guardian-form.html?id=${encodeURIComponent(guardian.id)}">Edit</a>
        </div>
      </div>
    </article>
  `;
}

function renderGuardians(rows) {
  if (!rows.length) {
    guardiansGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    guardiansGrid.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  guardiansGrid.classList.remove("hidden");
  guardiansGrid.innerHTML = rows.map(guardianCard).join("");
}

function filterGuardians(query) {
  const q = query.trim().toLowerCase();

  if (!q) return [...allGuardians];

  return allGuardians.filter((guardian) => {
    const haystack = [
      guardian.display_name,
      guardian.first_name,
      guardian.middle_name,
      guardian.last_name,
      guardian.relationship_default,
      guardian.email,
      guardian.phone,
      guardian.whatsapp,
      guardian.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

async function loadGuardians() {
  showLoading(true);
  hideMessage();

  try {
    const { data, error } = await supabase
      .from("guardians")
      .select("*")
      .eq("organization_id", ORGANIZATION_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allGuardians = data ?? [];
    renderGuardians(filterGuardians(searchInput.value));

    if (!allGuardians.length) {
      showMessage("No guardians found yet for this organization.", "info");
    }
  } catch (error) {
    console.error("Load guardians error:", error);
    showMessage(`Could not load guardians: ${error.message}`, "error");
    guardiansGrid.innerHTML = "";
    emptyState.classList.remove("hidden");
    guardiansGrid.classList.add("hidden");
  } finally {
    showLoading(false);
  }
}

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  const config = await getAppConfig();
  brandMain.textContent = config.platform_name;
  brandSub.textContent = config.vertical_name;

  await loadGuardians();
}

searchInput?.addEventListener("input", () => {
  renderGuardians(filterGuardians(searchInput.value));
});

refreshBtn?.addEventListener("click", () => {
  loadGuardians();
});

boot();