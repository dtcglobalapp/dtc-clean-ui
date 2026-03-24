import { supabase } from "../auth.js";

/*
🔥 DTC KIOSK PIN SYSTEM — REAL EMPLOYEES

Lee desde:
- public.employees

Soporta:
- base de datos (producción)
- cache local (offline)
*/

const CACHE_KEY = "dtc_employee_pins";
const ORGANIZATION_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

/*
📥 Obtener PINs desde employees
*/
async function fetchPinsFromDB() {
  const { data, error } = await supabase
    .from("employees")
    .select(`
      id,
      organization_id,
      first_name,
      middle_name,
      last_name,
      display_name,
      role,
      status,
      pin,
      pin_enabled,
      face_scan_enabled
    `)
    .eq("organization_id", ORGANIZATION_ID)
    .eq("status", "active")
    .eq("pin_enabled", true)
    .not("pin", "is", null);

  if (error) {
    console.error("Employee PIN fetch error:", error);
    return null;
  }

  return data ?? [];
}

/*
💾 Guardar en cache local
*/
function savePinsToCache(pins) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(pins));
  } catch (e) {
    console.warn("Cache save failed:", e);
  }
}

/*
📦 Leer cache local
*/
function getPinsFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/*
🔄 Obtener PINs (DB → fallback cache)
*/
async function getPins() {
  const fromDB = await fetchPinsFromDB();

  if (fromDB && fromDB.length) {
    savePinsToCache(fromDB);
    return fromDB;
  }

  const cached = getPinsFromCache();
  if (cached && cached.length) {
    console.warn("Using cached employee PINs (offline mode)");
    return cached;
  }

  return [];
}

function buildDisplayName(employee) {
  if (employee.display_name && String(employee.display_name).trim()) {
    return String(employee.display_name).trim();
  }

  return [
    employee.first_name ?? "",
    employee.middle_name ?? "",
    employee.last_name ?? "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim() || "Employee";
}

/*
🔐 VALIDAR PIN
*/
export async function validatePin(pin) {
  if (!pin) {
    return { ok: false, error: "PIN vacío" };
  }

  if (!/^\d{4,8}$/.test(pin)) {
    return { ok: false, error: "PIN inválido (4-8 números)" };
  }

  const pins = await getPins();
  const hit = pins.find((p) => String(p.pin) === String(pin));

  if (!hit) {
    return { ok: false, error: "PIN no reconocido" };
  }

  return {
    ok: true,
    user: {
      employee_id: hit.id,
      organization_id: hit.organization_id,
      role: hit.role,
      display: buildDisplayName(hit),
      pin_enabled: Boolean(hit.pin_enabled),
      face_scan_enabled: Boolean(hit.face_scan_enabled),
    },
  };
}