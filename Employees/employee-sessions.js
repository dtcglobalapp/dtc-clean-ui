import { requireAuth, supabase } from "../auth.js";

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.getElementById("sessionsTableBody");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const tableWrap = document.getElementById("tableWrap");
const messageBox = document.getElementById("messageBox");

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

let allSessions = [];

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

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function badge(status = "") {
  const safe = String(status).toLowerCase();
  return `<span class="badge ${escapeHtml(safe)}">${escapeHtml(status || "unknown")}</span>`;
}

function formatMinutes(value) {
  if (value === null || value === undefined) return "—";
  const minutes = Number(value);
  if (Number.isNaN(minutes)) return "—";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

function buildEmployeeName(session) {
  return session.employee?.display_name || "Unknown Employee";
}

function sessionRow(session) {
  return `
    <tr>
      <td>${escapeHtml(buildEmployeeName(session))}</td>
      <td>${badge(session.session_status)}</td>
      <td>${escapeHtml(formatDateTime(session.check_in_at))}</td>
      <td>${escapeHtml(formatDateTime(session.check_out_at))}</td>
      <td>${escapeHtml(formatMinutes(session.total_minutes))}</td>
      <td>${escapeHtml(session.check_in_method || "—")}</td>
      <td>${escapeHtml(session.check_out_method || "—")}</td>
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
  tableBody.innerHTML = rows.map(sessionRow).join("");
}

function filterSessions(query) {
  const q = query.trim().toLowerCase();

  if (!q) return [...allSessions];

  return allSessions.filter((session) => {
    const haystack = [
      session.employee?.display_name,
      session.session_status,
      session.check_in_method,
      session.check_out_method,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

async function loadSessions() {
  showLoading(true);
  hideMessage();

  try {
    const { data, error } = await supabase
      .from("dtc_work_sessions")
      .select(`
        id,
        organization_id,
        employee_id,
        session_status,
        check_in_at,
        check_out_at,
        total_minutes,
        check_in_method,
        check_out_method,
        created_at,
        employee:employees (
          id,
          display_name
        )
      `)
      .eq("organization_id", ORGANIZATION_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allSessions = data ?? [];
    renderTable(filterSessions(searchInput.value));

    if (!allSessions.length) {
      showMessage("No work sessions found yet.", "info");
    }
  } catch (error) {
    console.error("Load sessions error:", error);
    showMessage(`Could not load sessions: ${error.message}`, "error");
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    tableWrap.classList.add("hidden");
  } finally {
    showLoading(false);
  }
}

searchInput?.addEventListener("input", () => {
  renderTable(filterSessions(searchInput.value));
});

refreshBtn?.addEventListener("click", () => {
  loadSessions();
});

async function boot() {
  const user = await requireAuth();
  if (!user) return;
  await loadSessions();
}

boot();