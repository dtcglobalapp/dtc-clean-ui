import { supabase } from "../auth.js";

const params = new URLSearchParams(window.location.search);
const childId = params.get("child_id");

const childTitle = document.getElementById("childTitle");
const childSubtitle = document.getElementById("childSubtitle");
const childAvatar = document.getElementById("childAvatar");
const backToProfileBtn = document.getElementById("backToProfileBtn");

const guardianSearchInput = document.getElementById("guardianSearchInput");
const availableGuardianSearchInput = document.getElementById("availableGuardianSearchInput");
const showBlockedOnly = document.getElementById("showBlockedOnly");
const showPickupOnly = document.getElementById("showPickupOnly");
const refreshBtn = document.getElementById("refreshBtn");
const linkedCountBadge = document.getElementById("linkedCountBadge");
const linkedGuardianGrid = document.getElementById("linkedGuardianGrid");
const availableGuardiansList = document.getElementById("availableGuardiansList");
const messageBox = document.getElementById("messageBox");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editLinkId = document.getElementById("editLinkId");
const editRelationship = document.getElementById("editRelationship");
const editNotes = document.getElementById("editNotes");
const editCanPickup = document.getElementById("editCanPickup");
const editPickupBlocked = document.getElementById("editPickupBlocked");
const editPrimary = document.getElementById("editPrimary");
const editIsActive = document.getElementById("editIsActive");
const closeEditDialogBtn = document.getElementById("closeEditDialogBtn");
const cancelEditDialogBtn = document.getElementById("cancelEditDialogBtn");
const deleteLinkBtn = document.getElementById("deleteLinkBtn");

const createDialog = document.getElementById("createDialog");
const createForm = document.getElementById("createForm");
const createGuardianId = document.getElementById("createGuardianId");
const createRelationship = document.getElementById("createRelationship");
const createNotes = document.getElementById("createNotes");
const createCanPickup = document.getElementById("createCanPickup");
const createPickupBlocked = document.getElementById("createPickupBlocked");
const createPrimary = document.getElementById("createPrimary");
const createIsActive = document.getElementById("createIsActive");
const selectedGuardianPreview = document.getElementById("selectedGuardianPreview");
const closeCreateDialogBtn = document.getElementById("closeCreateDialogBtn");
const cancelCreateDialogBtn = document.getElementById("cancelCreateDialogBtn");

const state = {
  organizationId: null,
  child: null,
  linked: [],
  available: [],
  editing: null,
  selectedGuardian: null,
};

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message show ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "G";
}

function fullName(row) {
  return (
    row.display_name ||
    row.guardian_name ||
    row.full_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    "Guardian"
  );
}

function phoneValue(row) {
  return row.phone || row.guardian_phone || "";
}

function emailValue(row) {
  return row.email || row.guardian_email || "";
}

function avatarValue(row) {
  return row.photo_url || row.avatar_url || "";
}

function relationshipValue(row) {
  return row.relationship_to_child || row.relationship_default || "";
}

function getLinkId(row) {
  return row.child_guardian_id || row.id;
}

function getGuardianId(row) {
  return row.guardian_id || row.id;
}

function childName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() || "Child";
}

async function getOrganizationId() {
  if (state.organizationId) return state.organizationId;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const { data, error } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  if (!data?.organization_id) throw new Error("No organization found for this user.");

  state.organizationId = data.organization_id;
  return state.organizationId;
}

async function loadChild() {
  const orgId = await getOrganizationId();

  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, last_name, organization_id")
    .eq("id", childId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Child not found.");

  state.child = data;
  const name = childName(data);
  childTitle.textContent = name;
  childAvatar.textContent = getInitials(name);
  childSubtitle.textContent = "Manage who is linked, who can pick up, and who is primary.";
  backToProfileBtn.href = `/children/child-profile.html?id=${encodeURIComponent(childId)}`;
}

async function loadLinked() {
  const orgId = await getOrganizationId();

  const { data, error } = await supabase
    .from("child_guardians")
    .select(`
      id,
      child_id,
      guardian_id,
      relationship_to_child,
      notes,
      can_pickup,
      pickup_blocked,
      is_primary,
      is_active,
      organization_id,
      guardians (
        id,
        first_name,
        last_name,
        email,
        phone,
        photo_url,
        relationship_default
      )
    `)
    .eq("child_id", childId)
    .eq("organization_id", orgId);

  if (error) throw error;

  state.linked = (data || []).map((row) => {
    const guardian = Array.isArray(row.guardians) ? row.guardians[0] : row.guardians;
    return {
      ...row,
      ...guardian,
      child_guardian_id: row.id,
    };
  });
}

async function loadAvailable() {
  const orgId = await getOrganizationId();

  const { data, error } = await supabase
    .from("guardians")
    .select("id, first_name, last_name, email, phone, photo_url, relationship_default, organization_id")
    .eq("organization_id", orgId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  state.available = data || [];
}

function filterLinked() {
  const search = guardianSearchInput.value.trim().toLowerCase();
  const blockedOnly = showBlockedOnly.checked;
  const pickupOnly = showPickupOnly.checked;

  return state.linked.filter((row) => {
    const name = fullName(row).toLowerCase();
    const relationship = relationshipValue(row).toLowerCase();
    const phone = phoneValue(row).toLowerCase();
    const email = emailValue(row).toLowerCase();

    const matches =
      !search ||
      name.includes(search) ||
      relationship.includes(search) ||
      phone.includes(search) ||
      email.includes(search);

    if (!matches) return false;
    if (blockedOnly && !row.pickup_blocked) return false;
    if (pickupOnly && !row.can_pickup) return false;
    return true;
  });
}

function filterAvailable() {
  const search = availableGuardianSearchInput.value.trim().toLowerCase();
  const linkedIds = new Set(state.linked.map((row) => String(getGuardianId(row))));

  return state.available.filter((row) => {
    const id = String(getGuardianId(row));
    if (linkedIds.has(id)) return false;

    const name = fullName(row).toLowerCase();
    const phone = phoneValue(row).toLowerCase();
    const email = emailValue(row).toLowerCase();

    return !search || name.includes(search) || phone.includes(search) || email.includes(search);
  });
}

function renderLinked() {
  const rows = filterLinked();
  linkedCountBadge.textContent = `${state.linked.length} linked`;

  if (!rows.length) {
    linkedGuardianGrid.innerHTML = `<div class="empty">No guardians linked yet.</div>`;
    return;
  }

  linkedGuardianGrid.innerHTML = rows.map((row) => {
    const name = fullName(row);
    const avatar = avatarValue(row);

    return `
      <article class="guardian-card" data-link-id="${escapeHtml(String(getLinkId(row)))}">
        <div class="card-top">
          <div class="card-avatar">
            ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" />` : escapeHtml(getInitials(name))}
          </div>
          <div>
            <h3 class="card-name">${escapeHtml(name)}</h3>
            <div class="meta">
              <div>${escapeHtml(relationshipValue(row) || "Relationship not set")}</div>
              <div>${phoneValue(row) ? `📞 ${escapeHtml(phoneValue(row))}` : "📞 No phone"}</div>
              <div>${emailValue(row) ? `✉️ ${escapeHtml(emailValue(row))}` : "✉️ No email"}</div>
            </div>
          </div>
        </div>

        <div class="badges">
          ${row.is_primary ? `<span class="badge primary">⭐ Primary</span>` : ``}
          ${row.can_pickup ? `<span class="badge success">✅ Pickup Allowed</span>` : `<span class="badge warning">⚠ No Pickup</span>`}
          ${row.pickup_blocked ? `<span class="badge danger">🚫 Pickup Blocked</span>` : ``}
          ${row.is_active === false ? `<span class="badge warning">Inactive Link</span>` : ""}
        </div>

        <p class="notes">${escapeHtml(row.notes || "No notes for this link.")}</p>

        <div class="actions">
          <button class="action-btn primary" type="button" data-action="edit" data-link-id="${escapeHtml(String(getLinkId(row)))}">✏️ Edit</button>
          <button class="action-btn" type="button" data-action="primary" data-link-id="${escapeHtml(String(getLinkId(row)))}">
            ${row.is_primary ? "⭐ Primary" : "⭐ Make Primary"}
          </button>
          <button class="action-btn" type="button" data-action="block" data-link-id="${escapeHtml(String(getLinkId(row)))}">
            ${row.pickup_blocked ? "✅ Unblock Pickup" : "🚫 Block Pickup"}
          </button>
          <button class="action-btn danger" type="button" data-action="remove" data-link-id="${escapeHtml(String(getLinkId(row)))}">🗑 Remove</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderAvailable() {
  const rows = filterAvailable();

  if (!rows.length) {
    availableGuardiansList.innerHTML = `<div class="empty">No available guardians found.</div>`;
    return;
  }

  availableGuardiansList.innerHTML = rows.map((row) => {
    const name = fullName(row);
    const avatar = avatarValue(row);
    const isSelected = state.selectedGuardian && String(getGuardianId(state.selectedGuardian)) === String(getGuardianId(row));

    return `
      <div class="available-card ${isSelected ? "selected" : ""}">
        <div class="available-left">
          <div class="available-avatar">
            ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" />` : escapeHtml(getInitials(name))}
          </div>
          <div class="available-copy">
            <strong>${escapeHtml(name)}</strong>
            <div class="available-meta">
              <span>${phoneValue(row) ? `📞 ${escapeHtml(phoneValue(row))}` : "📞 No phone"}</span>
              <span>${emailValue(row) ? `✉️ ${escapeHtml(emailValue(row))}` : "✉️ No email"}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary link-now-btn" type="button" data-action="link" data-guardian-id="${escapeHtml(String(getGuardianId(row)))}">Link Now</button>
      </div>
    `;
  }).join("");
}

async function refreshAll() {
  hideMessage();
  linkedGuardianGrid.innerHTML = `<div class="empty">Loading linked guardians…</div>`;
  availableGuardiansList.innerHTML = `<div class="empty">Loading guardians…</div>`;

  await loadChild();
  await loadLinked();
  await loadAvailable();

  renderLinked();
  renderAvailable();
}

function openCreate(row) {
  state.selectedGuardian = row;
  createGuardianId.value = String(getGuardianId(row));
  selectedGuardianPreview.innerHTML = `
    ${escapeHtml(fullName(row))}<br />
    <span style="font-weight:600;color:#5c6a82;">${escapeHtml(phoneValue(row) || "No phone")} · ${escapeHtml(emailValue(row) || "No email")}</span>
  `;
  createRelationship.value = relationshipValue(row) || "";
  createNotes.value = "";
  createCanPickup.checked = true;
  createPickupBlocked.checked = false;
  createPrimary.checked = false;
  createIsActive.checked = true;
  renderAvailable();
  createDialog.showModal();
}

function closeCreate() {
  state.selectedGuardian = null;
  renderAvailable();
  createDialog.close();
}

function openEdit(row) {
  state.editing = row;
  editLinkId.value = String(getLinkId(row));
  editRelationship.value = relationshipValue(row) || "";
  editNotes.value = row.notes || "";
  editCanPickup.checked = !!row.can_pickup;
  editPickupBlocked.checked = !!row.pickup_blocked;
  editPrimary.checked = !!row.is_primary;
  editIsActive.checked = row.is_active !== false;
  editDialog.showModal();
}

function closeEdit() {
  state.editing = null;
  editDialog.close();
}

async function clearOtherPrimary(keepId) {
  const orgId = await getOrganizationId();
  const { error } = await supabase
    .from("child_guardians")
    .update({ is_primary: false })
    .eq("child_id", childId)
    .eq("organization_id", orgId)
    .neq("id", keepId);

  if (error) throw error;
}

async function createLink(event) {
  event.preventDefault();

  const guardianId = createGuardianId.value;
  if (!guardianId) {
    showMessage("Please select a guardian first.", "error");
    return;
  }

  const orgId = await getOrganizationId();

  try {
    if (createPrimary.checked) {
      await clearOtherPrimary("00000000-0000-0000-0000-000000000000");
    }

    const payload = {
      organization_id: orgId,
      child_id: childId,
      guardian_id: guardianId,
      relationship_to_child: createRelationship.value.trim() || null,
      notes: createNotes.value.trim() || null,
      can_pickup: createCanPickup.checked,
      pickup_blocked: createPickupBlocked.checked,
      is_primary: createPrimary.checked,
      is_active: createIsActive.checked,
    };

    const { error } = await supabase.from("child_guardians").insert([payload]);
    if (error) throw error;

    closeCreate();
    await refreshAll();
    showMessage("Guardian linked successfully.", "info");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not create link.", "error");
  }
}

async function saveEdit(event) {
  event.preventDefault();

  const linkId = editLinkId.value;
  if (!linkId) return;

  try {
    if (editPrimary.checked) {
      await clearOtherPrimary(linkId);
    }

    const payload = {
      relationship_to_child: editRelationship.value.trim() || null,
      notes: editNotes.value.trim() || null,
      can_pickup: editCanPickup.checked,
      pickup_blocked: editPickupBlocked.checked,
      is_primary: editPrimary.checked,
      is_active: editIsActive.checked,
    };

    const orgId = await getOrganizationId();

    const { error } = await supabase
      .from("child_guardians")
      .update(payload)
      .eq("id", linkId)
      .eq("organization_id", orgId);

    if (error) throw error;

    closeEdit();
    await refreshAll();
    showMessage("Guardian link updated.", "info");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not update link.", "error");
  }
}

async function removeLink(linkId) {
  const ok = window.confirm("Remove this guardian link?");
  if (!ok) return;

  try {
    const orgId = await getOrganizationId();
    const { error } = await supabase
      .from("child_guardians")
      .delete()
      .eq("id", linkId)
      .eq("organization_id", orgId);

    if (error) throw error;

    await refreshAll();
    showMessage("Guardian link removed.", "info");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not remove link.", "error");
  }
}

async function toggleBlock(linkId) {
  const row = state.linked.find((item) => String(getLinkId(item)) === String(linkId));
  if (!row) return;

  try {
    const orgId = await getOrganizationId();
    const nextBlocked = !row.pickup_blocked;

    const { error } = await supabase
      .from("child_guardians")
      .update({
        pickup_blocked: nextBlocked,
        can_pickup: nextBlocked ? false : !!row.can_pickup,
      })
      .eq("id", linkId)
      .eq("organization_id", orgId);

    if (error) throw error;

    await refreshAll();
    showMessage(nextBlocked ? "Pickup blocked." : "Pickup unblocked.", "info");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not update pickup block.", "error");
  }
}

async function makePrimary(linkId) {
  try {
    await clearOtherPrimary(linkId);
    const orgId = await getOrganizationId();

    const { error } = await supabase
      .from("child_guardians")
      .update({ is_primary: true })
      .eq("id", linkId)
      .eq("organization_id", orgId);

    if (error) throw error;

    await refreshAll();
    showMessage("Primary guardian updated.", "info");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not update primary guardian.", "error");
  }
}

linkedGuardianGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const linkId = button.dataset.linkId;

  if (action === "edit") {
    const row = state.linked.find((item) => String(getLinkId(item)) === String(linkId));
    if (row) openEdit(row);
    return;
  }

  if (action === "remove") {
    await removeLink(linkId);
    return;
  }

  if (action === "block") {
    await toggleBlock(linkId);
    return;
  }

  if (action === "primary") {
    await makePrimary(linkId);
  }
});

availableGuardiansList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="link"]');
  if (!button) return;

  const row = state.available.find((item) => String(getGuardianId(item)) === String(button.dataset.guardianId));
  if (row) openCreate(row);
});

guardianSearchInput.addEventListener("input", renderLinked);
availableGuardianSearchInput.addEventListener("input", renderAvailable);
showBlockedOnly.addEventListener("change", renderLinked);
showPickupOnly.addEventListener("change", renderLinked);
refreshBtn.addEventListener("click", refreshAll);

createForm.addEventListener("submit", createLink);
editForm.addEventListener("submit", saveEdit);

closeCreateDialogBtn.addEventListener("click", closeCreate);
cancelCreateDialogBtn.addEventListener("click", closeCreate);
closeEditDialogBtn.addEventListener("click", closeEdit);
cancelEditDialogBtn.addEventListener("click", closeEdit);

deleteLinkBtn.addEventListener("click", async () => {
  const linkId = editLinkId.value;
  closeEdit();
  await removeLink(linkId);
});

editCanPickup.addEventListener("change", () => {
  if (editCanPickup.checked) editPickupBlocked.checked = false;
});
editPickupBlocked.addEventListener("change", () => {
  if (editPickupBlocked.checked) editCanPickup.checked = false;
});
createCanPickup.addEventListener("change", () => {
  if (createCanPickup.checked) createPickupBlocked.checked = false;
});
createPickupBlocked.addEventListener("change", () => {
  if (createPickupBlocked.checked) createCanPickup.checked = false;
});

async function init() {
  if (!childId) {
    showMessage("Missing child_id in URL.", "error");
    linkedGuardianGrid.innerHTML = `<div class="empty">Missing child_id in URL.</div>`;
    availableGuardiansList.innerHTML = `<div class="empty">Missing child_id in URL.</div>`;
    return;
  }

  try {
    await refreshAll();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Could not load guardian links.", "error");
    linkedGuardianGrid.innerHTML = `<div class="empty">Could not load linked guardians.</div>`;
    availableGuardiansList.innerHTML = `<div class="empty">Could not load guardians.</div>`;
  }
}

init();