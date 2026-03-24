import { requireAuth, supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);

const kioskMode = params.get("kiosk");
const display = params.get("display") || "Employee";
const role = (params.get("role") || "employee").toLowerCase();
const logId = params.get("log_id") || "";

const employeePhoto = document.getElementById("employeePhoto");
const employeePhotoPlaceholder = document.getElementById("employeePhotoPlaceholder");
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeSubtitle = document.getElementById("welcomeSubtitle");
const employeeRoleBadge = document.getElementById("employeeRoleBadge");
const employeeModeBadge = document.getElementById("employeeModeBadge");
const sessionStatus = document.getElementById("sessionStatus");

const clockTime = document.getElementById("clockTime");
const clockDate = document.getElementById("clockDate");

const checkInBtn = document.getElementById("checkInBtn");
const checkOutBtn = document.getElementById("checkOutBtn");
const viewTodayBtn = document.getElementById("viewTodayBtn");
const backToKioskBtn = document.getElementById("backToKioskBtn");

const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

function formatRole(value = "") {
  const map = {
    owner: "owner",
    admin: "admin",
    director: "director",
    employee: "employee",
    assistant: "assistant",
  };
  return map[value] || "employee";
}

function tickClock() {
  const now = new Date();

  if (clockTime) {
    clockTime.textContent = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (clockDate) {
    clockDate.textContent = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

function setStatus(message, type = "") {
  if (!sessionStatus) return;
  sessionStatus.textContent = message;
  sessionStatus.className = `kiosk-status-message${type ? ` ${type}` : ""}`;
}

async function tryLoadEmployeePhoto() {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("photo_url, display_name, role")
      .eq("organization_id", ORGANIZATION_ID)
      .ilike("display_name", display)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Employee kiosk photo load error:", error);
      return;
    }

    if (!data) return;

    if (data.photo_url && employeePhoto) {
      employeePhoto.src = data.photo_url;
      employeePhoto.alt = data.display_name || display;
      employeePhoto.classList.remove("hidden");
      employeePhotoPlaceholder?.classList.add("hidden");
    }

    if (data.display_name) {
      setText(welcomeTitle, `Welcome, ${data.display_name}`);
    }

    if (data.role && employeeRoleBadge) {
      employeeRoleBadge.textContent = formatRole(data.role);
      employeeRoleBadge.className = `badge ${formatRole(data.role)}`;
    }
  } catch (err) {
    console.warn("Employee kiosk load warning:", err);
  }
}

async function logKioskAction(eventType) {
  try {
    const { error } = await supabase
      .from("dtc_kiosk_logs")
      .insert([
        {
          organization_id: ORGANIZATION_ID,
          event_type: eventType,
          method: "kiosk",
          display_name: display,
          role,
          notes: `Employee kiosk action: ${eventType}`,
          metadata: {
            source: "employee-kiosk",
            kiosk_mode: kioskMode,
            previous_log_id: logId || null,
          },
        },
      ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Employee kiosk action log error:", error);
    return false;
  }
}

async function handleCheckIn() {
  setStatus("Recording check-in…");

  const ok = await logKioskAction("check_in");

  if (ok) {
    setStatus("Check-in recorded successfully.", "success");
  } else {
    setStatus("Could not record check-in.", "error");
  }
}

async function handleCheckOut() {
  setStatus("Recording check-out…");

  const ok = await logKioskAction("check_out");

  if (ok) {
    setStatus("Check-out recorded successfully.", "success");
  } else {
    setStatus("Could not record check-out.", "error");
  }
}

function handleViewToday() {
  window.location.href = "../dashboard.html";
}

function handleBackToKiosk() {
  window.location.href = "../kiosk.html";
}

async function boot() {
  await requireAuth().catch(() => null);

  setText(welcomeTitle, `Welcome, ${display}`);
  setText(
    welcomeSubtitle,
    "Your kiosk session is active. Choose what you want to do next."
  );

  if (employeeRoleBadge) {
    employeeRoleBadge.textContent = formatRole(role);
    employeeRoleBadge.className = `badge ${formatRole(role)}`;
  }

  if (employeeModeBadge) {
    employeeModeBadge.textContent = kioskMode ? "kiosk mode" : "manual mode";
    employeeModeBadge.className = "badge active";
  }

  setStatus("Session loaded. Waiting for the next action…");

  tickClock();
  setInterval(tickClock, 1000);

  await tryLoadEmployeePhoto();

  checkInBtn?.addEventListener("click", handleCheckIn);
  checkOutBtn?.addEventListener("click", handleCheckOut);
  viewTodayBtn?.addEventListener("click", handleViewToday);
  backToKioskBtn?.addEventListener("click", handleBackToKiosk);
}

boot();