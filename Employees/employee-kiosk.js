import { supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);

const kioskMode = params.get("kiosk");
const display = params.get("display") || "Employee";
const role = (params.get("role") || "employee").toLowerCase();
const logId = params.get("log_id") || "";
const employeeId = params.get("employee_id") || "";

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

let currentState = "out";

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

function setPhoto(photoUrl, altText) {
  if (!employeePhoto || !employeePhotoPlaceholder) return;

  if (photoUrl) {
    employeePhoto.src = photoUrl;
    employeePhoto.alt = altText || "Employee Photo";
    employeePhoto.classList.remove("hidden");
    employeePhotoPlaceholder.classList.add("hidden");
    return;
  }

  employeePhoto.classList.add("hidden");
  employeePhotoPlaceholder.classList.remove("hidden");
}

function setButtonState(button, enabled) {
  if (!button) return;
  button.disabled = !enabled;
  button.style.opacity = enabled ? "1" : "0.55";
  button.style.cursor = enabled ? "pointer" : "not-allowed";
}

function setActionState(state) {
  currentState = state || "out";

  if (currentState === "in") {
    setButtonState(checkInBtn, false);
    setButtonState(checkOutBtn, true);
    return;
  }

  setButtonState(checkInBtn, true);
  setButtonState(checkOutBtn, false);
}

async function loadSessionStatus() {
  if (!employeeId) {
    setStatus("Missing employee session context.", "error");
    setActionState("out");
    return;
  }

  const { data, error } = await supabase.rpc("dtc_employee_session_status", {
    p_org_id: ORGANIZATION_ID,
    p_employee_id: employeeId,
  });

  if (error) {
    console.error("Employee session status error:", error);
    setStatus(`Could not load session: ${error.message}`, "error");
    return;
  }

  if (!data || data.status !== "success") {
    setStatus(data?.message || "Could not load employee session.", "error");
    return;
  }

  setText(welcomeTitle, `Welcome, ${data.display || display}`);
  setText(
    welcomeSubtitle,
    data.current_state === "in"
      ? "You are currently checked in. Choose your next action."
      : "You are currently checked out. Choose your next action."
  );

  if (employeeRoleBadge) {
    employeeRoleBadge.textContent = formatRole(data.role || role);
    employeeRoleBadge.className = `badge ${formatRole(data.role || role)}`;
  }

  setPhoto(data.photo_url || "", data.display || display);
  setActionState(data.current_state || "out");

  if (data.current_state === "in") {
    setStatus("Employee is currently checked in.", "success");
  } else {
    setStatus("Employee is currently checked out.");
  }
}

async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => reject(new Error(mapGeoError(err))),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

function mapGeoError(err) {
  switch (err.code) {
    case 1:
      return "Location permission denied";
    case 2:
      return "Location unavailable";
    case 3:
      return "Timed out getting location";
    default:
      return "Unknown geolocation error";
  }
}

async function getEmployeePin() {
  const { data, error } = await supabase
    .from("employees")
    .select("pin")
    .eq("organization_id", ORGANIZATION_ID)
    .eq("id", employeeId)
    .single();

  if (error) throw error;
  return data?.pin || null;
}

async function handleCheckIn() {
  if (!employeeId) {
    setStatus("Missing employee id.", "error");
    return;
  }

  if (currentState === "in") {
    setStatus("Employee is already checked in.", "error");
    return;
  }

  try {
    setStatus("Recording check-in…");

    const pin = await getEmployeePin();

    if (!pin) {
      setStatus("This employee does not have a PIN assigned.", "error");
      return;
    }

    const pos = await getCurrentPosition();

    const { data, error } = await supabase.rpc("dtc_check_in", {
      p_org_id: ORGANIZATION_ID,
      p_pin: pin,
      p_lat: Number(pos.coords.latitude.toFixed(6)),
      p_lon: Number(pos.coords.longitude.toFixed(6)),
      p_method: "kiosk",
    });

    if (error) throw error;

    if (!data || data.status !== "success") {
      setStatus(data?.message || "Could not record check-in.", "error");
      return;
    }

    setStatus("Check-in recorded successfully.", "success");
    await loadSessionStatus();
  } catch (error) {
    console.error("Employee kiosk check-in error:", error);
    setStatus(error.message || "Could not record check-in.", "error");
  }
}

async function handleCheckOut() {
  if (!employeeId) {
    setStatus("Missing employee id.", "error");
    return;
  }

  if (currentState !== "in") {
    setStatus("Employee is not currently checked in.", "error");
    return;
  }

  try {
    setStatus("Recording check-out…");

    const pos = await getCurrentPosition();

    const { data, error } = await supabase.rpc("dtc_check_out", {
      p_org_id: ORGANIZATION_ID,
      p_employee_id: employeeId,
      p_lat: Number(pos.coords.latitude.toFixed(6)),
      p_lon: Number(pos.coords.longitude.toFixed(6)),
      p_method: "kiosk",
    });

    if (error) throw error;

    if (!data || data.status !== "success") {
      setStatus(data?.message || "Could not record check-out.", "error");
      return;
    }

    setStatus("Check-out recorded successfully.", "success");
    await loadSessionStatus();
  } catch (error) {
    console.error("Employee kiosk check-out error:", error);
    setStatus(error.message || "Could not record check-out.", "error");
  }
}

function handleViewToday() {
  window.location.href = "../dashboard.html";
}

function handleBackToKiosk() {
  window.location.href = "../kiosk.html";
}

async function boot() {
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

  setStatus("Loading session…");

  tickClock();
  setInterval(tickClock, 1000);

  checkInBtn?.addEventListener("click", handleCheckIn);
  checkOutBtn?.addEventListener("click", handleCheckOut);
  viewTodayBtn?.addEventListener("click", handleViewToday);
  backToKioskBtn?.addEventListener("click", handleBackToKiosk);

  await loadSessionStatus();
}

boot();