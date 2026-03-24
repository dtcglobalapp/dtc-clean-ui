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

      // DEMO: luego esto vendrá del reconocimiento facial real
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

      ui.setFaceStatus(`✅ ${data.display || "Face user recognized"}`, true);

      await sleep(1200);
      routeByRole(data.role);
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

      ui.setPinStatus("Validating PIN…", true);

      const pos = await getCurrentPosition();

      const { data, error } = await supabase.rpc("dtc_check_in", {
        p_org_id: ORGANIZATION_ID,
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

      ui.setPinStatus(`✅ ${data.display || "Access granted"}`, true);
      ui.clearPin();

      await sleep(1200);
      routeByRole(data.role);
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

function routeByRole(role) {
  if (role === "owner" || role === "admin") {
    window.location.href = "../dashboard.html";
    return;
  }

  if (role === "employee") {
    window.location.href = "../dashboard.html";
    return;
  }

  if (role === "guardian") {
    window.location.href = "../children/children-list.html";
    return;
  }

  window.location.href = "../dashboard.html";
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