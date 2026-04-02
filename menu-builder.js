import { supabase } from "../core/supabase.js";

const ORG_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const params = new URLSearchParams(window.location.search);
const menuId = params.get("id");

const grid = document.getElementById("menuGrid");
const saveBtn = document.getElementById("saveMenuBtn");
const nameInput = document.getElementById("menuName");

const days = ["monday","tuesday","wednesday","thursday","friday"];

let mealSlots = [];

/* ============================= */
/* HELPERS */
/* ============================= */

function prettyMealName(v){
  const map = { B:"Breakfast", L:"Lunch", S:"Snack" };
  return map[v] || v;
}

function handleError(err, context){
  console.error("🔥 ERROR:", context, err);
  alert(`❌ ${context}\n\n${err?.message || JSON.stringify(err)}`);
  throw err;
}

/* ============================= */
/* LOAD */
/* ============================= */

async function loadMealSlots(){
  const { data, error } = await supabase
    .from("meal_slots")
    .select("*")
    .eq("organization_id", ORG_ID)
    .eq("is_active", true)
    .order("sort_order",{ascending:true});

  if(error) handleError(error, "Loading meal slots");

  mealSlots = data || [];
}

/* ============================= */
/* TAG SYSTEM */
/* ============================= */

function createTagInput(day, slot){
  const wrapper = document.createElement("div");
  wrapper.className = "dtc-field";

  wrapper.innerHTML = `
    <label>${prettyMealName(slot.name)}</label>
    <div class="tag-box" data-day="${day}" data-slot="${slot.id}">
      <input type="text" placeholder="Type ingredient and press Enter"/>
    </div>
  `;

  const input = wrapper.querySelector("input");
  const box = wrapper.querySelector(".tag-box");

  input.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      e.preventDefault();
      const val = input.value.trim();
      if(!val) return;

      addTag(box, val);
      input.value="";
    }
  });

  return wrapper;
}

function addTag(box, text){
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text;

  tag.onclick = () => tag.remove();

  box.insertBefore(tag, box.querySelector("input"));
}

function getTags(box){
  return [...box.querySelectorAll(".tag")].map(t=>t.textContent.trim());
}

/* ============================= */
/* INGREDIENTS */
/* ============================= */

async function getOrCreateIngredient(name){
  const normalized = name.toLowerCase();

  const { data: existing, error: findError } = await supabase
    .from("ingredients")
    .select("*")
    .eq("organization_id", ORG_ID)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if(findError) handleError(findError, "Finding ingredient");

  if(existing) return existing.id;

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      organization_id: ORG_ID,
      name,
      normalized_name: normalized
    })
    .select()
    .single();

  if(error) handleError(error, "Creating ingredient");

  return data.id;
}

/* ============================= */
/* SAVE */
/* ============================= */

async function saveMenu(){
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try{

    let menu;

    if(menuId){
      // UPDATE
      const { data, error } = await supabase
        .from("menus")
        .update({ name: nameInput.value })
        .eq("id", menuId)
        .select()
        .single();

      if(error) handleError(error, "Updating menu");

      menu = data;

      // limpiar días anteriores
      await supabase.from("menu_days").delete().eq("menu_id", menuId);

    } else {
      // CREATE
      const { data, error } = await supabase
        .from("menus")
        .insert({
          organization_id: ORG_ID,
          name: nameInput.value
        })
        .select()
        .single();

      if(error) handleError(error, "Creating menu");

      menu = data;
    }

    for(const day of days){

      const { data: dayRow, error: dayError } = await supabase
        .from("menu_days")
        .insert({
          menu_id: menu.id,
          day_of_week: day
        })
        .select()
        .single();

      if(dayError) handleError(dayError, "Creating menu day");

      for(const slot of mealSlots){

        const box = document.querySelector(
          `.tag-box[data-day="${day}"][data-slot="${slot.id}"]`
        );

        const ingredients = getTags(box);

        const { data: meal, error: mealError } = await supabase
          .from("menu_meals")
          .insert({
            menu_day_id: dayRow.id,
            meal_slot_id: slot.id,
            label: prettyMealName(slot.name)
          })
          .select()
          .single();

        if(mealError) handleError(mealError, "Creating meal");

        for(const ing of ingredients){

          const ingId = await getOrCreateIngredient(ing);

          const { error: relError } = await supabase
            .from("menu_meal_ingredients")
            .insert({
              menu_meal_id: meal.id,
              ingredient_id: ingId
            });

          if(relError) handleError(relError, "Linking ingredient");
        }
      }
    }

    alert("🔥 Smart menu saved successfully");

  }catch(err){
    console.error(err);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = "Save Menu";
}

/* ============================= */
/* UI */
/* ============================= */

function buildUI(){
  grid.innerHTML="";

  days.forEach(day=>{
    const card = document.createElement("div");
    card.className="dtc-card";

    card.innerHTML=`<h3>${day}</h3>`;

    mealSlots.forEach(slot=>{
      card.appendChild(createTagInput(day, slot));
    });

    grid.appendChild(card);
  });
}

/* ============================= */
/* INIT */
/* ============================= */

saveBtn.addEventListener("click", saveMenu);

async function init(){
  await loadMealSlots();
  buildUI();
}

init();