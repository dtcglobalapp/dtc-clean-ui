import { supabase } from "../core/supabase.js";

const ORG_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const params = new URLSearchParams(window.location.search);
const menuId = params.get("id");

const grid = document.getElementById("menuGrid");
const saveBtn = document.getElementById("saveMenuBtn");
const nameInput = document.getElementById("menuName");

const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

let mealSlots = [];
let existingDayMap = new Map();
let existingMealMap = new Map();

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slotKey(day, slotId) {
  return `${day}__${slotId}`;
}

async function loadMealSlots() {
  const { data, error } = await supabase
    .from("meal_slots")
    .select("*")
    .eq("organization_id", ORG_ID)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  mealSlots = data ?? [];
}

function buildGrid() {
  grid.innerHTML = "";

  days.forEach((day) => {
    const dayBlock = document.createElement("section");
    dayBlock.className = "dtc-card";

    dayBlock.innerHTML = `
      <div class="dtc-stack-md">
        <h3>${escapeHtml(titleCase(day))}</h3>
        <div class="dtc-stack-md" id="day-${day}"></div>
      </div>
    `;

    const container = dayBlock.querySelector(`#day-${day}`);

    mealSlots.forEach((slot) => {
      const wrapper = document.createElement("div");
      wrapper.className = "dtc-field";

      const existing = existingMealMap.get(slotKey(day, slot.id));

      wrapper.innerHTML = `
        <label class="dtc-label">${escapeHtml(slot.name)}</label>
        <input
          class="dtc-input meal-label-input"
          type="text"
          data-day="${day}"
          data-slot-id="${slot.id}"
          data-slot-name="${escapeHtml(slot.name)}"
          value="${escapeHtml(existing?.label || slot.code || slot.name)}"
          placeholder="Label for ${escapeHtml(slot.name)}"
        />
      `;

      container.appendChild(wrapper);
    });

    grid.appendChild(dayBlock);
  });
}

async function ensureMenu() {
  const name = nameInput.value.trim();

  if (!name) {
    throw new Error("Menu name is required.");
  }

  if (menuId) return menuId;

  const { data, error } = await supabase
    .from("menus")
    .insert({
      organization_id: ORG_ID,
      name,
      is_active: false,
      notes: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function loadExistingStructure(id) {
  const { data: menu, error: menuError } = await supabase
    .from("menus")
    .select("*")
    .eq("id", id)
    .single();

  if (menuError) throw menuError;
  if (menu) {
    nameInput.value = menu.name || "";
  }

  const { data: menuDays, error: dayError } = await supabase
    .from("menu_days")
    .select("*")
    .eq("menu_id", id);

  if (dayError) throw dayError;

  existingDayMap = new Map((menuDays ?? []).map((row) => [row.day_of_week, row]));

  const dayIds = (menuDays ?? []).map((row) => row.id);
  if (!dayIds.length) {
    existingMealMap = new Map();
    return;
  }

  const { data: menuMeals, error: mealError } = await supabase
    .from("menu_meals")
    .select("*")
    .in("menu_day_id", dayIds);

  if (mealError) throw mealError;

  existingMealMap = new Map();

  (menuMeals ?? []).forEach((meal) => {
    const day = (menuDays ?? []).find((d) => d.id === meal.menu_day_id);
    if (!day) return;
    existingMealMap.set(slotKey(day.day_of_week, meal.meal_slot_id), meal);
  });
}

async function upsertDay(menuIdValue, day) {
  const existing = existingDayMap.get(day);
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("menu_days")
    .insert({
      menu_id: menuIdValue,
      day_of_week: day,
    })
    .select()
    .single();

  if (error) throw error;

  existingDayMap.set(day, data);
  return data.id;
}

async function upsertMeal(menuDayId, slotId, label, sortOrder, day) {
  const key = slotKey(day, slotId);
  const existing = existingMealMap.get(key);

  if (existing) {
    const { data, error } = await supabase
      .from("menu_meals")
      .update({
        label,
        sort_order: sortOrder,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    existingMealMap.set(key, data);
    return data.id;
  }

  const { data, error } = await supabase
    .from("menu_meals")
    .insert({
      menu_day_id: menuDayId,
      meal_slot_id: slotId,
      label,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw error;

  existingMealMap.set(key, data);
  return data.id;
}

async function saveStructure() {
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const id = await ensureMenu();

    for (const day of days) {
      const dayId = await upsertDay(id, day);

      for (let i = 0; i < mealSlots.length; i += 1) {
        const slot = mealSlots[i];
        const input = document.querySelector(
          `.meal-label-input[data-day="${day}"][data-slot-id="${slot.id}"]`
        );

        const label = input?.value?.trim() || slot.code || slot.name;
        await upsertMeal(dayId, slot.id, label, i + 1, day);
      }
    }

    alert("Menu structure saved.");
    window.location.href = `./menu-builder.html?id=${encodeURIComponent(id)}`;
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not save menu structure.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Menu";
  }
}

saveBtn?.addEventListener("click", saveStructure);

async function init() {
  try {
    await loadMealSlots();

    if (!mealSlots.length) {
      grid.innerHTML = `
        <div class="dtc-card">
          <p>No active meal slots found for this organization.</p>
        </div>
      `;
      return;
    }

    if (menuId) {
      await loadExistingStructure(menuId);
    }

    buildGrid();
  } catch (error) {
    console.error(error);
    grid.innerHTML = `
      <div class="dtc-card">
        <p>${escapeHtml(error.message || "Could not load menu builder.")}</p>
      </div>
    `;
  }
}

init();