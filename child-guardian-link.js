import { supabase } from "../core/supabase.js";

const url = new URL(window.location.href);
const childId = url.searchParams.get("child_id");

const dom = {
  childTitle: document.getElementById("childTitle"),
  childSubtitle: document.getElementById("childSubtitle"),
  childAvatar: document.getElementById("childAvatar"),
  backToProfileBtn: document.getElementById("backToProfileBtn"),

  linkedGuardianGrid: document.getElementById("linkedGuardianGrid"),
  linkedCountBadge: document.getElementById("linkedCountBadge"),
  guardianSearchInput: document.getElementById("guardianSearchInput"),
  showBlockedOnly: document.getElementById("showBlockedOnly"),
  showPickupOnly: document.getElementById("showPickupOnly"),

  availableGuardiansList: document.getElementById("availableGuardiansList"),
  availableGuardianSearchInput: document.getElementById("availableGuardianSearchInput"),
  linkGuardianBtn: document.getElementById("linkGuardianBtn"),

  editLinkDialog: document.getElementById("editLinkDialog"),
  editLinkForm: document.getElementById("editLinkForm"),
  editLinkId: document.getElementById("editLinkId"),
  editRelationship: document.getElementById("editRelationship"),
  editNotes: document.getElementById("editNotes"),
  editCanPickup: document.getElementById("editCanPickup"),
  editPickupBlocked: document.getElementById("editPickupBlocked"),
  editPrimary: document.getElementById("editPrimary"),
  editIsActive: document.getElementById("editIsActive"),
  closeEditDialogBtn: document.getElementById("closeEditDialogBtn"),
  cancelEditDialogBtn: document.getElementById("cancelEditDialogBtn"),
  deleteFromDialogBtn: document.getElementById("deleteFromDialogBtn"),

  createLinkDialog: document.getElementById("createLinkDialog"),
  createLinkForm: document.getElementById("createLinkForm"),
  createGuardianId: document.getElementById("createGuardianId"),
  createRelationship: document.getElementById("createRelationship"),
  createNotes: document.getElementById("createNotes"),
  createCanPickup: document.getElementById("createCanPickup"),
  createPickupBlocked: document.getElementById("createPickupBlocked"),
  createPrimary: document.getElementById("createPrimary"),
  createIsActive: document.getElementById("createIsActive"),
  selectedGuardianPreview: document.getElementById("selectedGuardianPreview"),
  closeCreateDialogBtn: document.getElementById("closeCreateDialogBtn"),
  cancelCreateDialogBtn: document.getElementById("cancelCreateDialogBtn"),
};

const state = {
  child: null,
  linked: [],
  available: [],
  selectedGuardian: null,
  editingLink: null,
};

function toast(message) {
  window.alert(message);
}

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "G";
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getRowValue(row, keys = [], fallback = null) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined) {
      return row[key];
    }
  }
  return fallback;
}

function getGuardianName(row) {
  return (
    getRowValue(row, ["guardian_name", "display_name", "full_name", "name"]) ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    "Guardian"
  );
}

function getGuardianPhone(row) {
  return getRowValue(row, ["guardian_phone", "phone", "mobile_phone", "cell_phone"], "");
}

function getGuardianEmail(row) {
  return getRowValue(row, ["guardian_email", "email"], "");
}

function getRelationship(row) {
  return getRowValue(
    row,
    ["relationship_to_child", "relationship", "relation_to_child", "relation"],
    ""
  );
}

function getNotes(row) {
  return getRowValue(row, ["notes", "link_notes", "pickup_notes"], "");
}

function getAvatarUrl(row) {
  return getRowValue(row, ["photo_url", "avatar_url", "image_url"], "");
}

function getCanPickup(row) {
  return !!getRowValue(row, ["can_pickup", "pickup_allowed", "pickup_authorized"], false);
}

function getPickupBlocked(row) {
  return !!getRowValue(row, ["pickup_blocked", "is_pickup_blocked", "blocked_pickup"], false);
}

function getIsPrimary(row) {
  return !!getRowValue(row, ["is_primary", "primary_guardian"], false);
}

function getIsActive(row) {
  const val = getRowValue(row, ["is_active", "active"], true);
  return val !== false;
}

function getGuardianId(row) {
  return getRowValue(row, ["guardian_id", "id"]);
}

function getLinkId(row) {
  return getRowValue(row, ["child_guardian_id", "id", "link_id"]);
}

function childDisplayName(child) {
  return (
    getRowValue(child, ["full_name", "display_name", "name"]) ||
    [child?.first_name, child?.last_name].filter(Boolean).join(" ").trim() ||
    "Child"
  );
}

function childAvatarChar(child) {
  const name = childDisplayName(child);
  return getInitials(name);
}

function filterLinkedRows(rows) {
  const search = dom.guardianSearchInput.value.trim().toLowerCase();
  const blockedOnly = dom.showBlockedOnly.checked;
  const pickupOnly = dom.showPickupOnly.checked;

  return rows.filter((row) => {
    const name = getGuardianName(row).toLowerCase();
    const relationship = getRelationship(row).toLowerCase();
    const phone = getGuardianPhone(row).toLowerCase();
    const email = getGuardianEmail(row).toLowerCase();
    const blocked = getPickupBlocked(row);
    const canPickup = getCanPickup(row);

    const matchesSearch =
      !search ||
      name.includes(search) ||
      relationship.includes(search) ||
      phone.includes(search) ||
      email.includes(search);

    if (!matchesSearch) return false;
    if (blockedOnly && !blocked) return false;
    if (pickupOnly && !canPickup) return false;

    return true;
  });
}

function filterAvailableRows(rows) {
  const search = dom.availableGuardianSearchInput.value.trim().toLowerCase();
  const linkedGuardianIds = new Set(state.linked.map((row) => String(getGuardianId(row))));

  return rows.filter((row) => {
    const guardianId = String(getGuardianId(row));
    if (linkedGuardianIds.has(guardianId)) return false;

    const name = getGuardianName(row).toLowerCase();
    const phone = getGuardianPhone(row).toLowerCase();
    const email = getGuardianEmail(row).toLowerCase();

    return !search || name.includes(search) || phone.includes(search) || email.includes(search);
  });
}

function setHero() {
  if (!state.child) return;
  const name = childDisplayName(state.child);

  dom.childTitle.textContent = name;
  dom.childSubtitle.textContent = `Manage links, pickup permissions and primary guardian for ${name}.`;
  dom.childAvatar.textContent = childAvatarChar(state.child);
  dom.backToProfileBtn.href = `../child-profile.html?id=${encodeURIComponent(childId)}`;
}

function renderLinked() {
  const rows = filterLinkedRows(state.linked);
  dom.linkedCountBadge.textContent = `${state.linked.length} linked`;

  if (!rows.length) {
    dom.linkedGuardianGrid.innerHTML = `
      <div class="cg-empty-state">
        <div class="cg-empty-icon">🧩</div>
        <h3>No matching guardian links</h3>
        <p>Try another search or create a new link.</p>
      </div>
    `;
    return;
  }

  dom.linkedGuardianGrid.innerHTML = rows
    .map((row) => {
      const linkId = getLinkId(row);
      const guardianId = getGuardianId(row);
      const name = getGuardianName(row);
      const phone = getGuardianPhone(row);
      const email = getGuardianEmail(row);
      const relationship = getRelationship(row) || "Relationship not set";
      const notes = getNotes(row);
      const canPickup = getCanPickup(row);
      const pickupBlocked = getPickupBlocked(row);
      const isPrimary = getIsPrimary(row);
      const isActive = getIsActive(row);
      const avatarUrl = getAvatarUrl(row);

      return `
        <article class="cg-card" data-link-id="${linkId}" data-guardian-id="${guardianId}">
          <div class="cg-card-top">
            ${
              avatarUrl
                ? `<img class="cg-avatar" src="${avatarUrl}" alt="${name}" />`
                : `<div class="cg-avatar">${getInitials(name)}</div>`
            }

            <div class="cg-card-head">
              <h3 class="cg-card-name">${name}</h3>
              <div class="cg-card-meta">
                <div>${relationship}</div>
                <div>${phone ? `📞 ${phone}` : "📞 No phone"}</div>
                <div>${email ? `✉️ ${email}` : "✉️ No email"}</div>
              </div>
            </div>
          </div>

          <div class="cg-badges">
            ${isPrimary ? `<span class="cg-badge cg-badge-primary">Primary</span>` : ``}
            ${canPickup ? `<span class="cg-badge cg-badge-success">Pickup Allowed</span>` : `<span class="cg-badge cg-badge-warning">No Pickup</span>`}
            ${pickupBlocked ? `<span class="cg-badge cg-badge-danger">Pickup Blocked</span>` : ``}
            ${isActive ? `` : `<span class="cg-badge cg-badge-warning">Inactive Link</span>`}
          </div>

          <div class="cg-notes">${notes ? escapeHtml(notes) : "No notes for this link."}</div>

          <div class="cg-actions">
            <button class="cg-action-btn primary" type="button" data-action="edit" data-link-id="${linkId}">
              Edit
            </button>
            <button class="cg-action-btn" type="button" data-action="toggle-primary" data-link-id="${linkId}">
              ${isPrimary ? "Primary ✓" : "Make Primary"}
            </button>
            <button class="cg-action-btn" type="button" data-action="toggle-block" data-link-id="${linkId}">
              ${pickupBlocked ? "Unblock Pickup" : "Block Pickup"}
            </button>
            <button class="cg-action-btn danger" type="button" data-action="remove" data-link-id="${linkId}">
              Remove
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAvailable() {
  const rows = filterAvailableRows(state.available);

  if (!rows.length) {
    dom.availableGuardiansList.innerHTML = `<div class="cg-empty-mini">No available guardians found.</div>`;
    return;
  }

  dom.availableGuardiansList.innerHTML = rows
    .map((row) => {
      const id = getGuardianId(row);
      const name = getGuardianName(row);
      const phone = getGuardianPhone(row);
      const email = getGuardianEmail(row);
      const avatarUrl = getAvatarUrl(row);

      return `
        <div class="cg-available-item">
          ${
            avatarUrl
              ? `<img class="cg-avatar" src="${avatarUrl}" alt="${name}" />`
              : `<div class="cg-avatar">${getInitials(name)}</div>`
          }

          <div class="cg-available-copy">
            <strong>${name}</strong>
            <span>${phone ? `📞 ${phone}` : "📞 No phone"}</span>
            <span>${email ? `✉️ ${email}` : "✉️ No email"}</span>
          </div>

          <button class="cg-link-btn" type="button" data-action="prepare-link" data-guardian-id="${id}">
            Link
          </button>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadChild() {
  if (!childId) {
    toast("Missing child_id in URL.");
    return;
  }

  let child = null;

  try {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("id", childId)
      .maybeSingle();

    if (!error && data) child = data;
  } catch (err) {
    console.error("loadChild error", err);
  }

  if (!child && state.linked.length) {
    const row = state.linked[0];
    child = {
      id: childId,
      full_name:
        getRowValue(row, ["child_name", "child_full_name", "child_display_name"], "Child"),
    };
  }

  state.child = child || { id: childId, full_name: "Child" };
  setHero();
}

async function loadLinked() {
  const { data, error } = await supabase
    .from("v_child_guardians_detailed")
    .select("*")
    .eq("child_id", childId);

  if (error) {
    console.error(error);
    toast(`Could not load linked guardians: ${error.message}`);
    state.linked = [];
    renderLinked();
    return;
  }

  state.linked = Array.isArray(data) ? sortLinkedRows(data) : [];
  renderLinked();
}

function sortLinkedRows(rows) {
  return [...rows].sort((a, b) => {
    const primaryDiff = Number(getIsPrimary(b)) - Number(getIsPrimary(a));
    if (primaryDiff !== 0) return primaryDiff;

    const blockedDiff = Number(getPickupBlocked(a)) - Number(getPickupBlocked(b));
    if (blockedDiff !== 0) return blockedDiff;

    return getGuardianName(a).localeCompare(getGuardianName(b));
  });
}

async function loadAvailable() {
  const { data, error } = await supabase
    .from("guardians")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    dom.availableGuardiansList.innerHTML = `<div class="cg-empty-mini">Could not load guardians.</div>`;
    return;
  }

  state.available = Array.isArray(data) ? data : [];
  renderAvailable();
}

function findLinkedByLinkId(linkId) {
  return state.linked.find((row) => String(getLinkId(row)) === String(linkId)) || null;
}

function findAvailableGuardianById(guardianId) {
  return state.available.find((row) => String(getGuardianId(row)) === String(guardianId)) || null;
}

function openEditDialog(linkRow) {
  if (!linkRow) return;

  state.editingLink = linkRow;
  dom.editLinkId.value = getLinkId(linkRow);
  dom.editRelationship.value = getRelationship(linkRow) || "";
  dom.editNotes.value = getNotes(linkRow) || "";
  dom.editCanPickup.checked = getCanPickup(linkRow);
  dom.editPickupBlocked.checked = getPickupBlocked(linkRow);
  dom.editPrimary.checked = getIsPrimary(linkRow);
  dom.editIsActive.checked = getIsActive(linkRow);

  dom.editLinkDialog.showModal();
}

function closeEditDialog() {
  state.editingLink = null;
  dom.editLinkDialog.close();
}

function openCreateDialog(guardianRow) {
  if (!guardianRow) return;

  state.selectedGuardian = guardianRow;
  dom.createGuardianId.value = getGuardianId(guardianRow);
  dom.selectedGuardianPreview.innerHTML = `
    <strong>${escapeHtml(getGuardianName(guardianRow))}</strong><br>
    <span>${escapeHtml(getGuardianPhone(guardianRow) || "No phone")} · ${escapeHtml(getGuardianEmail(guardianRow) || "No email")}</span>
  `;
  dom.createRelationship.value = "";
  dom.createNotes.value = "";
  dom.createCanPickup.checked = true;
  dom.createPickupBlocked.checked = false;
  dom.createPrimary.checked = false;
  dom.createIsActive.checked = true;

  dom.createLinkDialog.showModal();
}

function closeCreateDialog() {
  state.selectedGuardian = null;
  dom.createLinkDialog.close();
}

async function clearOtherPrimaryLinks(childIdToUpdate, keepLinkId) {
  const { error } = await supabase
    .from("child_guardians")
    .update({ is_primary: false })
    .eq("child_id", childIdToUpdate)
    .neq("id", keepLinkId);

  if (error) {
    throw error;
  }
}

async function saveEditLink(event) {
  event.preventDefault();

  const linkId = dom.editLinkId.value;
  if (!linkId) return;

  const canPickup = dom.editCanPickup.checked;
  const pickupBlocked = dom.editPickupBlocked.checked;
  const isPrimary = dom.editPrimary.checked;
  const isActive = dom.editIsActive.checked;

  const payload = {
    relationship_to_child: dom.editRelationship.value.trim() || null,
    notes: dom.editNotes.value.trim() || null,
    can_pickup: canPickup,
    pickup_blocked: pickupBlocked,
    is_active: isActive,
  };

  try {
    if (isPrimary) {
      await clearOtherPrimaryLinks(childId, linkId);
      payload.is_primary = true;
    } else {
      payload.is_primary = false;
    }

    const { error } = await supabase
      .from("child_guardians")
      .update(payload)
      .eq("id", linkId);

    if (error) throw error;

    closeEditDialog();
    await refreshAll();
    toast("Guardian link updated.");
  } catch (error) {
    console.error(error);
    toast(`Could not update link: ${error.message}`);
  }
}

async function createLink(event) {
  event.preventDefault();

  const guardianId = dom.createGuardianId.value;
  if (!guardianId) {
    toast("Please select a guardian first.");
    return;
  }

  const payload = {
    child_id: childId,
    guardian_id: guardianId,
    relationship_to_child: dom.createRelationship.value.trim() || null,
    notes: dom.createNotes.value.trim() || null,
    can_pickup: dom.createCanPickup.checked,
    pickup_blocked: dom.createPickupBlocked.checked,
    is_primary: dom.createPrimary.checked,
    is_active: dom.createIsActive.checked,
  };

  try {
    if (payload.is_primary) {
      await clearOtherPrimaryLinks(childId, "00000000-0000-0000-0000-000000000000");
    }

    const { error } = await supabase
      .from("child_guardians")
      .insert(payload);

    if (error) throw error;

    closeCreateDialog();
    await refreshAll();
    toast("Guardian linked successfully.");
  } catch (error) {
    console.error(error);
    toast(`Could not create link: ${error.message}`);
  }
}

async function removeLink(linkId) {
  const row = findLinkedByLinkId(linkId);
  if (!row) return;

  const name = getGuardianName(row);
  const ok = window.confirm(`Remove ${name} from this child?`);
  if (!ok) return;

  try {
    const { error } = await supabase
      .from("child_guardians")
      .delete()
      .eq("id", linkId);

    if (error) throw error;

    await refreshAll();
    toast("Guardian link removed.");
  } catch (error) {
    console.error(error);
    toast(`Could not remove link: ${error.message}`);
  }
}

async function toggleBlock(linkId) {
  const row = findLinkedByLinkId(linkId);
  if (!row) return;

  const nextBlocked = !getPickupBlocked(row);

  try {
    const { error } = await supabase
      .from("child_guardians")
      .update({
        pickup_blocked: nextBlocked,
        can_pickup: nextBlocked ? false : getCanPickup(row),
      })
      .eq("id", linkId);

    if (error) throw error;

    await refreshAll();
    toast(nextBlocked ? "Pickup blocked." : "Pickup unblocked.");
  } catch (error) {
    console.error(error);
    toast(`Could not update pickup block: ${error.message}`);
  }
}

async function makePrimary(linkId) {
  const row = findLinkedByLinkId(linkId);
  if (!row) return;

  try {
    await clearOtherPrimaryLinks(childId, linkId);

    const { error } = await supabase
      .from("child_guardians")
      .update({ is_primary: true })
      .eq("id", linkId);

    if (error) throw error;

    await refreshAll();
    toast(`${getGuardianName(row)} is now the primary guardian.`);
  } catch (error) {
    console.error(error);
    toast(`Could not set primary guardian: ${error.message}`);
  }
}

async function refreshAll() {
  await loadLinked();
  await loadAvailable();
  await loadChild();
}

function wireCardActions() {
  dom.linkedGuardianGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const linkId = button.dataset.linkId;

    if (!linkId) return;

    if (action === "edit") {
      const row = findLinkedByLinkId(linkId);
      openEditDialog(row);
      return;
    }

    if (action === "toggle-primary") {
      await makePrimary(linkId);
      return;
    }

    if (action === "toggle-block") {
      await toggleBlock(linkId);
      return;
    }

    if (action === "remove") {
      await removeLink(linkId);
    }
  });

  dom.availableGuardiansList.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="prepare-link"]');
    if (!button) return;

    const guardianId = button.dataset.guardianId;
    const row = findAvailableGuardianById(guardianId);
    openCreateDialog(row);
  });
}

function wireInputs() {
  dom.guardianSearchInput.addEventListener("input", renderLinked);
  dom.showBlockedOnly.addEventListener("change", renderLinked);
  dom.showPickupOnly.addEventListener("change", renderLinked);
  dom.availableGuardianSearchInput.addEventListener("input", renderAvailable);

  dom.linkGuardianBtn.addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });

  dom.editLinkForm.addEventListener("submit", saveEditLink);
  dom.createLinkForm.addEventListener("submit", createLink);

  dom.closeEditDialogBtn.addEventListener("click", closeEditDialog);
  dom.cancelEditDialogBtn.addEventListener("click", closeEditDialog);

  dom.closeCreateDialogBtn.addEventListener("click", closeCreateDialog);
  dom.cancelCreateDialogBtn.addEventListener("click", closeCreateDialog);

  dom.deleteFromDialogBtn.addEventListener("click", async () => {
    const linkId = dom.editLinkId.value;
    closeEditDialog();
    await removeLink(linkId);
  });

  dom.editCanPickup.addEventListener("change", () => {
    if (dom.editCanPickup.checked) {
      dom.editPickupBlocked.checked = false;
    }
  });

  dom.editPickupBlocked.addEventListener("change", () => {
    if (dom.editPickupBlocked.checked) {
      dom.editCanPickup.checked = false;
    }
  });

  dom.createCanPickup.addEventListener("change", () => {
    if (dom.createCanPickup.checked) {
      dom.createPickupBlocked.checked = false;
    }
  });

  dom.createPickupBlocked.addEventListener("change", () => {
    if (dom.createPickupBlocked.checked) {
      dom.createCanPickup.checked = false;
    }
  });
}

async function init() {
  if (!childId) {
    document.body.innerHTML = `
      <main style="padding:24px;color:white;font-family:system-ui;background:#0f172a;min-height:100vh;">
        Missing <strong>child_id</strong> in the URL.
      </main>
    `;
    return;
  }

  wireCardActions();
  wireInputs();

  await refreshAll();
}

init();