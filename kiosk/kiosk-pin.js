import { supabase } from "../auth.js";

/*
🔥 DTC KIOSK PIN SYSTEM

Soporta:
- Base de datos (producción)
- Cache local (offline)
- Validación rápida
*/

const CACHE_KEY = "dtc_kiosk_pins";

/*
📥 Obtener PINs desde base de datos
*/
async function fetchPinsFromDB() {
  const { data, error } = await supabase
    .from("dtc_kiosk_pins")
    .select("pin, role, display_name");

  if (error) {
    console.error("PIN fetch error:", error);
    return null;
  }

  return data;
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
    console.warn("Using cached PINs (offline mode)");
    return cached;
  }

  return [];
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

  const hit = pins.find((p) => p.pin === pin);

  if (!hit) {
    return { ok: false, error: "PIN no reconocido" };
  }

  return {
    ok: true,
    user: {
      role: hit.role,
      display: hit.display_name || `PIN:${pin}`,
    },
  };
}