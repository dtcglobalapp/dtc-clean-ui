import {
  clearOtherPrimaryLinks,
  deleteChildGuardianLink,
  fetchAvailableGuardians,
  fetchChild,
  fetchLinkedGuardians,
  insertChildGuardianLink,
  updateChildGuardianLink,
} from "./child-guardian-link-api.js";
import {
  closeCreateDialog,
  closeEditDialog,
  findLinkedByLinkId,
} from "./child-guardian-link-dialogs.js";
import {
  renderAvailable,
  renderHero,
  renderLinked,
  sortLinkedRows,
} from "./child-guardian-link-render.js";
import {
  getCanPickup,
  getGuardianName,
  getPickupBlocked,
  toast,
} from "./child-guardian-link-utils.js";

export async function refreshAll({ dom, state }) {
  await loadChild({ dom, state });
  await loadLinked({ dom, state });
  await loadAvailable({ dom, state });
}

export async function loadChild({ dom, state }) {
  try {
    const data = await fetchChild(state.childId);
    state.child = data || { id: state.childId, first_name: "Child", last_name: "" };
    renderHero({ dom, state });
  } catch (error) {
    console.error("loadChild error", error);
    state.child = { id: state.childId, first_name: "Child", last_name: "" };
    renderHero({ dom, state });
    toast(`Could not load child: ${error.message}`);
  }
}

export async function loadLinked({ dom, state }) {
  try {
    const data = await fetchLinkedGuardians(state.childId);
    state.linked = sortLinkedRows(data);
    renderLinked({ dom, state });
  } catch (error) {
    console.error("loadLinked error", error);
    state.linked = [];
    renderLinked({ dom, state });
    toast(`Could not load linked guardians: ${error.message}`);
  }
}

export async function loadAvailable({ dom, state }) {
  dom.availableGuardiansList.innerHTML = `<div class="cg-empty-mini">Loading guardians...</div>`;

  try {
    const data = await fetchAvailableGuardians();
    state.available = Array.isArray(data) ? data : [];
    renderAvailable({ dom, state });
  } catch (error) {
    console.error("loadAvailable error", error);
    state.available = [];
    dom.availableGuardiansList.innerHTML = `
      <div class="cg-empty-mini">
        Could not load guardians.
        <br />
        <small>${error.message}</small>
      </div>
    `;
  }
}

export async function saveEditLink({ dom, state, event }) {
  event.preventDefault();

  const linkId = dom.editLinkId.value;
  if (!linkId) return;

  const payload = {
    relationship_to_child: dom.editRelationship.value.trim() || null,
    notes: dom.editNotes.value.trim() || null,
    can_pickup: dom.editCanPickup.checked,
    pickup_blocked: dom.editPickupBlocked.checked,
    is_active: dom.editIsActive.checked,
    is_primary: dom.editPrimary.checked,
  };

  try {
    if (payload.is_primary) {
      await clearOtherPrimaryLinks(state.childId, linkId);
    }

    await updateChildGuardianLink(linkId, payload);
    closeEditDialog({ dom, state });
    await refreshAll({ dom, state });
    toast("Guardian link updated.");
  } catch (error) {
    console.error("saveEditLink error", error);
    toast(`Could not update link: ${error.message}`);
  }
}

export async function createLink({ dom, state, event }) {
  event.preventDefault();

  const guardianId = dom.createGuardianId.value;
  if (!guardianId) {
    toast("Please select a guardian first.");
    return;
  }

  const payload = {
    child_id: state.childId,
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
      await clearOtherPrimaryLinks(
        state.childId,
        "00000000-0000-0000-0000-000000000000"
      );
    }

    await insertChildGuardianLink(payload);
    closeCreateDialog({ dom, state });
    await refreshAll({ dom, state });
    toast("Guardian linked successfully.");
  } catch (error) {
    console.error("createLink error", error);
    toast(`Could not create link: ${error.message}`);
  }
}

export async function removeLink({ dom, state, linkId }) {
  const row = findLinkedByLinkId(state, linkId);
  if (!row) return;

  const ok = window.confirm(`Remove ${getGuardianName(row)} from this child?`);
  if (!ok) return;

  try {
    await deleteChildGuardianLink(linkId);
    await refreshAll({ dom, state });
    toast("Guardian link removed.");
  } catch (error) {
    console.error("removeLink error", error);
    toast(`Could not remove link: ${error.message}`);
  }
}

export async function toggleBlock({ dom, state, linkId }) {
  const row = findLinkedByLinkId(state, linkId);
  if (!row) return;

  const nextBlocked = !getPickupBlocked(row);

  try {
    await updateChildGuardianLink(linkId, {
      pickup_blocked: nextBlocked,
      can_pickup: nextBlocked ? false : getCanPickup(row),
    });

    await refreshAll({ dom, state });
    toast(nextBlocked ? "Pickup blocked." : "Pickup unblocked.");
  } catch (error) {
    console.error("toggleBlock error", error);
    toast(`Could not update pickup block: ${error.message}`);
  }
}

export async function makePrimary({ dom, state, linkId }) {
  const row = findLinkedByLinkId(state, linkId);
  if (!row) return;

  try {
    await clearOtherPrimaryLinks(state.childId, linkId);
    await updateChildGuardianLink(linkId, { is_primary: true });
    await refreshAll({ dom, state });
    toast(`${getGuardianName(row)} is now the primary guardian.`);
  } catch (error) {
    console.error("makePrimary error", error);
    toast(`Could not set primary guardian: ${error.message}`);
  }
}