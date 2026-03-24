import { requireAuth, supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);
const employeeId = params.get("id");

const editBtn = document.getElementById("editBtn");

const employeePhoto = document.getElementById("employeePhoto");
const employeeName = document.getElementById("employeeName");
const employeeRole = document.getElementById("employeeRole");
const employeeStatus = document.getElementById("employeeStatus");

const employeePin = document.getElementById("employeePin");
const pinEnabled = document.getElementById("pinEnabled");
const faceEnabled = document.getElementById("faceEnabled");
const radius = document.getElementById("radius");

const employeeEmail = document.getElementById("employeeEmail");
const employeePhone = document.getElementById("employeePhone");

const employeeNotes = document.getElementById("employeeNotes");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value ?? "—";
}

function formatRole(role = "") {
  if (!role) return "—";

  const map = {
    owner: "Owner",
    admin: "Admin",
    director: "Director",
    employee: "Employee",
    assistant: "Assistant",
  };

  return map[role] || role;
}

function formatStatus(status = "") {
  if (!status) return "—";

  const map = {
    active: "active",
    inactive: "inactive",
    suspended: "suspended",
  };

  return map[status] || status;
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

function formatPin(pin) {
  if (!pin) return "—";
  return pin;
}

function formatRadius(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `${value} meters`;
}

function formatPhone(value) {
  if (!value) return "—";

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

function getDisplayName(employee) {
  if (employee.display_name && String(employee.display_name).trim()) {
    return String(employee.display_name).trim();
  }

  return [employee.first_name, employee.middle_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed Employee";
}

function getPhotoUrl(employee) {
  if (employee.photo_url && String(employee.photo_url).trim()) {
    return String(employee.photo_url).trim();
  }

  return "https://placehold.co/400x400?text=Employee";
}

function applyStatusBadge(status) {
  if (!employeeStatus) return;

  const safeStatus = String(status || "inactive").toLowerCase();
  employeeStatus.className = `badge ${escapeHtml(safeStatus)}`;
  employeeStatus.textContent = formatStatus(safeStatus);
}

function fillProfile(employee) {
  const name = getDisplayName(employee);

  if (employeePhoto) {
    employeePhoto.src = getPhotoUrl(employee);
    employeePhoto.alt = name;
  }

  setText(employeeName, name);
  setText(employeeRole, formatRole(employee.role));
  applyStatusBadge(employee.status);

  setText(employeePin, formatPin(employee.pin));
  setText(pinEnabled, formatBoolean(employee.pin_enabled));
  setText(faceEnabled, formatBoolean(employee.face_scan_enabled));
  setText(radius, formatRadius(employee.allowed_checkin_radius_meters));

  setText(employeeEmail, employee.email || "—");
  setText(employeePhone, formatPhone(employee.phone));
  setText(employeeNotes, employee.notes || "No notes available.");

  if (editBtn) {
    editBtn.href = `./employee-form.html?id=${encodeURIComponent(employee.id)}`;
  }
}

async function loadEmployee() {
  if (!employeeId) {
    throw new Error("Missing employee id in URL.");
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Employee not found.");

  return data;
}

async function boot() {
  const user = await requireAuth();
  if (!user) return;

  try {
    const employee = await loadEmployee();
    fillProfile(employee);
  } catch (error) {
    console.error("Employee profile load error:", error);
    document.body.innerHTML = `
      <main style="padding:24px;font-family:Inter,Arial,sans-serif;">
        <h1 style="margin:0 0 10px;">Employee Profile</h1>
        <p style="color:#991b1b;">${escapeHtml(error.message || "Could not load employee profile.")}</p>
        <p><a href="./employees-list.html">Back to Employees</a></p>
      </main>
    `;
  }
}

boot();