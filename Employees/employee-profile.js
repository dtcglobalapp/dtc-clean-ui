import { requireAuth, supabase } from "../auth.js";
import { getAppConfig } from "../core/app-config.js";

const params = new URLSearchParams(window.location.search);
const employeeId = params.get("id");

if (!employeeId || employeeId.length < 10) {
  document.body.innerHTML = "<h2>Invalid employee ID</h2>";
  throw new Error("Invalid ID");
}

const el = (id) => document.getElementById(id);

// ELEMENTS
const employeeName = el("employeeName");
const employeeNameTop = el("employeeNameTop");
const employeeRole = el("employeeRole");
const employeeStatus = el("employeeStatus");
const employeePhoto = el("employeePhoto");

const totalHours = el("totalHours");
const totalSessions = el("totalSessions");
const earned = el("earned");
const pending = el("pending");

const sessionsList = el("sessionsList");

// BRAND
const brandMain = document.querySelector(".brand-main");
const brandSub = document.querySelector(".brand-sub");

// HELPERS
function formatMoney(v) {
  return `$${(v || 0).toFixed(2)}`;
}

function formatDate(d) {
  return new Date(d).toLocaleString();
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

  // ⚠️ temporal (luego va a DB)
  const hourlyRate = 15;
  const totalEarned = hours * hourlyRate;

  earned.textContent = formatMoney(totalEarned);
  pending.textContent = formatMoney(totalEarned * 0.2);
}

// RENDER SESSIONS
function renderSessions(sessions) {
  sessionsList.innerHTML = "";

  sessions.slice(0, 5).forEach((s) => {
    const div = document.createElement("div");
    div.className = "list-item";

    div.innerHTML = `
      <div>
        <strong>${formatDate(s.check_in_at)}</strong><br/>
        ${s.check_out_at ? formatDate(s.check_out_at) : "Open session"}
      </div>
    `;

    sessionsList.appendChild(div);
  });
}

// BOOT
async function boot() {
  await requireAuth();

  // 🔥 NUEVO: cargar config global
  const config = await getAppConfig();

  brandMain.textContent = config.platform_name;
  brandSub.textContent = config.vertical_name;

  const employee = await loadEmployee();
  const sessions = await loadSessions();

  employeeName.textContent = employee.display_name;
  employeeNameTop.textContent = employee.display_name;
  employeeRole.textContent = employee.role;
  employeeStatus.textContent = employee.status;

  employeePhoto.src =
    employee.photo_url || "https://placehold.co/200x200";

  processSessions(sessions);
  renderSessions(sessions);
}

boot();