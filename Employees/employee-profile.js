import { requireAuth, supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);
const employeeId = params.get("id");

const employeeName = document.getElementById("employeeName");
const employeeRole = document.getElementById("employeeRole");
const employeeStatus = document.getElementById("employeeStatus");
const employeePhoto = document.getElementById("employeePhoto");

const totalHours = document.getElementById("totalHours");
const totalSessions = document.getElementById("totalSessions");
const earned = document.getElementById("earned");
const pending = document.getElementById("pending");

const sessionsList = document.getElementById("sessionsList");
const sessionsEmpty = document.getElementById("sessionsEmpty");

const loadingState = document.getElementById("loadingState");
const profileContent = document.getElementById("profileContent");

// HELPERS
function formatMoney(v) {
  return `$${(v || 0).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleString();
}

function getBadge(status) {
  const s = String(status).toLowerCase();

  if (s === "active") return "dtc-badge dtc-badge-success";
  if (s === "pending") return "dtc-badge dtc-badge-warning";
  return "dtc-badge dtc-badge-neutral";
}

// LOAD EMPLOYEE
async function loadEmployee() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (error) throw error;
  return data;
}

// LOAD SESSIONS
async function loadSessions() {
  const { data, error } = await supabase
    .from("dtc_work_sessions")
    .select("*")
    .eq("employee_id", employeeId)
    .order("check_in_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// PROCESS DATA
function processSessions(sessions) {
  let minutes = 0;

  sessions.forEach((s) => {
    if (s.check_in_at && s.check_out_at) {
      const diff =
        (new Date(s.check_out_at) - new Date(s.check_in_at)) / 60000;
      minutes += diff;
    }
  });

  const hours = minutes / 60;

  totalHours.textContent = `${hours.toFixed(2)}h`;
  totalSessions.textContent = sessions.length;

  const hourlyRate = 15;
  const totalEarned = hours * hourlyRate;

  earned.textContent = formatMoney(totalEarned);
  pending.textContent = formatMoney(totalEarned * 0.2);
}

// RENDER SESSIONS
function sessionCard(s) {
  return `
    <article class="dtc-record-card">
      <h3 class="dtc-card-name">${formatDate(s.check_in_at)}</h3>
      <p class="dtc-card-subtitle">
        ${s.check_out_at ? formatDate(s.check_out_at) : "Open session"}
      </p>
    </article>
  `;
}

function renderSessions(sessions) {
  if (!sessions.length) {
    sessionsEmpty.classList.remove("hidden");
    sessionsList.classList.add("hidden");
    return;
  }

  sessionsEmpty.classList.add("hidden");
  sessionsList.classList.remove("hidden");

  sessionsList.innerHTML = sessions.slice(0, 5).map(sessionCard).join("");
}

// BOOT
async function boot() {
  await requireAuth();

  const employee = await loadEmployee();
  const sessions = await loadSessions();

  employeeName.textContent = employee.display_name;
  employeeRole.textContent = employee.role;

  employeeStatus.className = getBadge(employee.status);
  employeeStatus.textContent = employee.status;

  employeePhoto.src =
    employee.photo_url || "https://placehold.co/320x320?text=Employee";

  processSessions(sessions);
  renderSessions(sessions);

  loadingState.classList.add("hidden");
  profileContent.classList.remove("hidden");
}

boot();