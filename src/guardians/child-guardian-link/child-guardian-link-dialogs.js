import {
  escapeHtml,
  getCanPickup,
  getGuardianEmail,
  getGuardianId,
  getGuardianName,
  getGuardianPhone,
  getIsActive,
  getIsPrimary,
  getLinkId,
  getNotes,
  getPickupBlocked,
  getRelationship,
} from "./child-guardian-link-utils.js";

export function findLinkedByLinkId(state, linkId) {
  return state.linked.find((row) => String(getLinkId(row)) === String(linkId)) || null;
}

export function findAvailableGuardianById(state, guardianId) {
  return state.available.find((row) => String(getGuardianId(row)) === String(guardianId)) || null;
}

export function openEditDialog({ dom, state, linkRow }) {
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

export function closeEditDialog({ dom, state }) {
  state.editingLink = null;
  dom.editLinkDialog.close();
}

export function openCreateDialog({ dom, state, guardianRow }) {
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

export function closeCreateDialog({ dom, state }) {
  state.selectedGuardian = null;
  dom.createLinkDialog.close();
}