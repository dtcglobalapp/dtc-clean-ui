import { mountKioskUI } from "./kiosk-ui.js";
import { validatePin } from "./kiosk-pin.js";
import { supabase } from "../auth.js";

const root = document.getElementById("kiosk-root");
const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

if (!root) {
  document.body.innerHTML = "❌ No encuentro #kiosk-root en kiosk.html";
  throw new Error("Missing #kiosk-root");
}

const ui = mountKioskUI(root, {
  onFace: async () => {
    try {
      if (!navigator.onLine) {
        ui.setFaceStatus("Offline. Use PIN access.", false);
        return;
      }

      ui.setFaceStatus("Starting camera validation…", true);

      await sleep(700);

      // DEMO TEMPORAL:
      // hasta que construyamos reconocimiento facial real,
      // el face scan demo tomará el empleado con PIN 1111
      const demoPin = "1111";

      const pos = await getCurrentPosition();

      const { data, error } = await supabase.rpc("dtc_check_in", {
        p_org_id: ORGANIZATION_ID,
        p_pin: demoPin,
        p_lat: Number(pos.coords.latitude.toFixed(6)),
        p_lon: Number(pos.coords.longitude.toFixed(6)),
        p_method: "face",
      });

      if (error) {
        ui.setFaceStatus(`SQL Error: ${error.message}`, false);
        return;
      }

      if (!data || data.status !== "success") {
        ui.setFaceStatus(data?.message || "Face check-in rejected", false);
        return;
      }

      ui.setFaceStatus(`✅ Welcome ${data.display || "Employee"}`, true);

      await sleep(1200);
      routeByRole(data.role, data);
    } catch (err) {
      ui.setFaceStatus(`Error: ${err.message || err}`, false);
    }
  },

  onPin: async (pin) => {
    try {
      const res = await validatePin(pin);

      if (!res.ok) {
        ui.setPinStatus(res.error, false);
        return;
      }

      ui.setPinStatus(`Validating ${res.user.display}…`, true);

      const pos = await getCurrentPosition();

      const { data, error } = await supabase.rpc("dtc_check_in", {
        p_org_id: res.user.organization_id || ORGANIZATION_ID,
        p_pin: pin,
        p_lat: Number(pos.coords.latitude.toFixed(6)),
        p_lon: Number(pos.coords.longitude.toFixed(6)),
        p_method: "pin",
      });

      if (error) {
        ui.setPinStatus(`SQL Error: ${error.message}`, false);
        return;
      }

      if (!data || data.status !== "success") {
        ui.setPinStatus(data?.message || "Access denied", false);
        return;
      }

      ui.setPinStatus(`✅ Welcome ${data.display || res.user.display || "User"}`, true);
      ui.clearPin();

      await sleep(1200);
      routeByRole(data.role, data);
    } catch (err) {
      ui.setPinStatus(`Error: ${err.message || err}`, false);
    }
  },

  onReset: () => {
    ui.setFaceStatus("waiting…", true);
    ui.setPinStatus("waiting…", true);
    ui.clearPin();
  },
});

console.log("✅ DTC Kiosk ready");

function routeByRole(role, data = {}) {
  const display = encodeURIComponent(data.display || "User");
  const logId = encodeURIComponent(data.log_id || "");
  const roleSafe = encodeURIComponent(role || "employee");
  const employeeId = encodeURIComponent(data.employee_id || "");

  if (role === "owner" || role === "admin") {
    window.location.href = `../dashboard.html?kiosk=1&role=${roleSafe}&display=${display}&log_id=${logId}`;
    return;
  }

  if (role === "employee" || role === "assistant" || role === "director") {
    window.location.href =
      `../Employees/employee-kiosk.html?kiosk=1&display=${display}&role=${roleSafe}&log_id=${logId}&employee_id=${employeeId}`;
    return;
  }

  if (role === "guardian") {
    window.location.href = `../children/children-list.html?kiosk=1&role=${roleSafe}&display=${display}&log_id=${logId}`;
    return;
  }

  window.location.href = `../dashboard.html?kiosk=1&role=${roleSafe}&display=${display}&log_id=${logId}`;
}

function getCurrentPosition() {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}