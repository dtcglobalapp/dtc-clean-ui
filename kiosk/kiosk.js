import { mountKioskUI } from "./kiosk-ui.js";
import { validatePin } from "./kiosk-pin.js";
import { routeIdentity } from "./kiosk-router.js";
import { supabase } from "../auth.js";

const root = document.getElementById("kiosk-root");
const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

if (!root) {
  document.body.innerHTML = "❌ No encuentro #kiosk-root en kiosk.html";
  throw new Error("Missing #kiosk-root");
}

let ui = null;

function bootKiosk() {
  root.innerHTML = "";

  ui = mountKioskUI(root, {
    onFace: async () => {
      try {
        if (!navigator.onLine) {
          ui.setFaceStatus("Offline. Use PIN access.", false);
          return;
        }

        ui.setFaceStatus("Starting magical mirror…", true);
        await sleep(700);

        showMagicMirrorMenu();
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

        if (data?.status === "error" && data?.current_state === "in" && data?.employee_id) {
          ui.setPinStatus(`✅ ${data.display || res.user.display || "Employee"} is already checked in`, true);
          ui.clearPin();
          await sleep(1000);
          routeByRole(data.role, data);
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
}

function showMagicMirrorMenu() {
  routeIdentity({
    root,
    identity: {
      type: "mirror_menu",
      name: "Magic Mirror",
    },
    onBack: () => {
      bootKiosk();
    },
    onRoute: async (selection) => {
      switch (selection.type) {
        case "felencho":
          routeIdentity({
            root,
            identity: {
              type: "felencho",
              name: "Felencho",
            },
            onBack: () => {
              showMagicMirrorMenu();
            },
            onRoute: (nextSelection) => {
              handleMirrorSelection(nextSelection);
            },
          });
          break;

        case "bob":
          routeIdentity({
            root,
            identity: {
              type: "bob",
              name: "Bob",
            },
            onBack: () => {
              showMagicMirrorMenu();
            },
            onRoute: (nextSelection) => {
              handleMirrorSelection(nextSelection);
            },
          });
          break;

        case "parent":
          routeIdentity({
            root,
            identity: {
              type: "parent",
              name: "Parent / Guardian Demo",
            },
            onBack: () => {
              showMagicMirrorMenu();
            },
          });
          break;

        case "employee":
          await runDemoEmployeeFaceCheckIn();
          break;

        case "visitor":
          routeIdentity({
            root,
            identity: {
              type: "visitor",
              name: "Visitor",
            },
            onBack: () => {
              showMagicMirrorMenu();
            },
          });
          break;

        default:
          bootKiosk();
      }
    },
  });
}

function handleMirrorSelection(selection) {
  switch (selection.type) {
    case "owner":
    case "admin":
      routeIdentity({
        root,
        identity: {
          type: selection.type,
          name: "Felencho",
        },
        onBack: () => {
          showMagicMirrorMenu();
        },
      });
      break;

    case "employee":
      runDemoEmployeeFaceCheckIn();
      break;

    case "parent":
      routeIdentity({
        root,
        identity: {
          type: "parent",
          name: "Felencho",
        },
        onBack: () => {
          showMagicMirrorMenu();
        },
      });
      break;

    case "visitor":
      routeIdentity({
        root,
        identity: {
          type: "visitor",
          name: "Felencho",
        },
        onBack: () => {
          showMagicMirrorMenu();
        },
      });
      break;

    default:
      showMagicMirrorMenu();
  }
}

async function runDemoEmployeeFaceCheckIn() {
  try {
    root.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;background:#0f172a;color:white;font-family:system-ui;padding:24px;">
        <div style="text-align:center;max-width:520px;">
          <h1 style="margin:0 0 10px;">Magic Mirror</h1>
          <p style="opacity:.8;margin:0 0 18px;">Recognized employee demo. Validating check-in…</p>
          <div style="padding:14px 18px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);">
            Using demo employee PIN 1111
          </div>
        </div>
      </div>
    `;

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
      routeIdentity({
        root,
        identity: {
          type: "error",
          name: "Mirror Error",
          message: `SQL Error: ${error.message}`,
        },
        onBack: () => {
          bootKiosk();
        },
      });
      return;
    }

    if (data?.status === "error" && data?.current_state === "in" && data?.employee_id) {
      routeIdentity({
        root,
        identity: {
          type: "employee",
          name: data.display || "Employee",
          role: data.role,
          message: `${data.display || "Employee"} is already checked in`,
          data,
        },
        onBack: () => {
          bootKiosk();
        },
        onRoute: () => {
          routeByRole(data.role, data);
        },
      });
      return;
    }

    if (!data || data.status !== "success") {
      routeIdentity({
        root,
        identity: {
          type: "error",
          name: "Mirror Rejected",
          message: data?.message || "Face check-in rejected",
        },
        onBack: () => {
          bootKiosk();
        },
      });
      return;
    }

    routeIdentity({
      root,
      identity: {
        type: "employee",
        name: data.display || "Employee",
        role: data.role,
        message: `✅ Welcome ${data.display || "Employee"}`,
        data,
      },
      onBack: () => {
        bootKiosk();
      },
      onRoute: () => {
        routeByRole(data.role, data);
      },
    });
  } catch (err) {
    routeIdentity({
      root,
      identity: {
        type: "error",
        name: "Mirror Error",
        message: err.message || String(err),
      },
      onBack: () => {
        bootKiosk();
      },
    });
  }
}

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

  if (role === "guardian" || role === "parent") {
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

bootKiosk();