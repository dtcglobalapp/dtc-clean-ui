import { supabase } from "../core/supabase.js";

const ORG_ID = "1b707d53-1b8a-4678-950f-1f6400c9e584";

const listEl = document.getElementById("menusList");
const createBtn = document.getElementById("createMenuBtn");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

createBtn?.addEventListener("click", () => {
  window.location.href = "./menu-builder.html";
});

async function setActive(menuId) {
  const { error: resetError } = await supabase
    .from("menus")
    .update({ is_active: false })
    .eq("organization_id", ORG_ID);

  if (resetError) {
    console.error(resetError);
    alert(resetError.message || "Could not reset active menu.");
    return;
  }

  const { error } = await supabase
    .from("menus")
    .update({ is_active: true })
    .eq("id", menuId);

  if (error) {
    console.error(error);
    alert(error.message || "Could not activate menu.");
    return;
  }

  await loadMenus();
}

async function loadMenus() {
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    listEl.innerHTML = `
      <article class="dtc-card">
        <p>${escapeHtml(error.message || "Could not load menus.")}</p>
      </article>
    `;
    return;
  }

  if (!data?.length) {
    listEl.innerHTML = `
      <article class="dtc-card">
        <div class="dtc-stack-md">
          <h3>No menus yet</h3>
          <p>Create your first smart menu to begin.</p>
        </div>
      </article>
    `;
    return;
  }

  listEl.innerHTML = data
    .map(
      (menu) => `
        <article class="dtc-record-card">
          <div class="dtc-stack-md">
            <div class="dtc-inline-meta">
              ${
                menu.is_active
                  ? `<span class="dtc-badge dtc-badge-success">Active</span>`
                  : `<span class="dtc-badge dtc-badge-neutral">Inactive</span>`
              }
            </div>

            <h3 class="dtc-card-name" style="text-align:left;">${escapeHtml(menu.name)}</h3>
            <p class="dtc-card-subtitle" style="text-align:left;">
              ${escapeHtml(menu.notes || "No notes yet.")}
            </p>

            <div class="dtc-card-footer" style="justify-content:flex-start;">
              <button class="dtc-btn dtc-btn-secondary dtc-btn-sm" data-edit="${menu.id}" type="button">
                Edit
              </button>

              <button class="dtc-btn dtc-btn-ghost dtc-btn-sm" data-activate="${menu.id}" type="button">
                ${menu.is_active ? "Active" : "Set Active"}
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  listEl.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      window.location.href = `./menu-builder.html?id=${encodeURIComponent(id)}`;
    });
  });

  listEl.querySelectorAll("[data-activate]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-activate");
      await setActive(id);
    });
  });
}

loadMenus();