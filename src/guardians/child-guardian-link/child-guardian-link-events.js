import {
  closeCreateDialog,
  closeEditDialog,
  findAvailableGuardianById,
  findLinkedByLinkId,
  openCreateDialog,
  openEditDialog,
} from "./child-guardian-link-dialogs.js";
import {
  createLink,
  makePrimary,
  removeLink,
  saveEditLink,
  toggleBlock,
} from "./child-guardian-link-controller.js";
import {
  filterAvailableRows,
  renderAvailable,
  renderLinked,
} from "./child-guardian-link-render.js";
import { toast } from "./child-guardian-link-utils.js";

export function wireChildGuardianLinkEvents({ dom, state }) {
  dom.guardianSearchInput.addEventListener("input", () => renderLinked({ dom, state }));
  dom.showBlockedOnly.addEventListener("change", () => renderLinked({ dom, state }));
  dom.showPickupOnly.addEventListener("change", () => renderLinked({ dom, state }));
  dom.availableGuardianSearchInput.addEventListener("input", () => renderAvailable({ dom, state }));

  dom.linkGuardianBtn.addEventListener("click", () => {
    const available = filterAvailableRows({ dom, state });
    if (!available.length) {
      toast("No available guardians found to link.");
      return;
    }
    openCreateDialog({ dom, state, guardianRow: available[0] });
  });

  dom.linkedGuardianGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const linkId = button.dataset.linkId;

    if (action === "edit") {
      const linkRow = findLinkedByLinkId(state, linkId);
      openEditDialog({ dom, state, linkRow });
      return;
    }

    if (action === "toggle-primary") {
      await makePrimary({ dom, state, linkId });
      return;
    }

    if (action === "toggle-block") {
      await toggleBlock({ dom, state, linkId });
      return;
    }

    if (action === "remove") {
      await removeLink({ dom, state, linkId });
    }
  });

  dom.availableGuardiansList.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="prepare-link"]');
    if (!button) return;

    const guardianRow = findAvailableGuardianById(state, button.dataset.guardianId);
    openCreateDialog({ dom, state, guardianRow });
  });

  dom.editLinkForm.addEventListener("submit", (event) => saveEditLink({ dom, state, event }));
  dom.createLinkForm.addEventListener("submit", (event) => createLink({ dom, state, event }));

  dom.closeEditDialogBtn.addEventListener("click", () => closeEditDialog({ dom, state }));
  dom.cancelEditDialogBtn.addEventListener("click", () => closeEditDialog({ dom, state }));

  dom.closeCreateDialogBtn.addEventListener("click", () => closeCreateDialog({ dom, state }));
  dom.cancelCreateDialogBtn.addEventListener("click", () => closeCreateDialog({ dom, state }));

  dom.deleteFromDialogBtn.addEventListener("click", async () => {
    const linkId = dom.editLinkId.value;
    closeEditDialog({ dom, state });
    await removeLink({ dom, state, linkId });
  });

  dom.editCanPickup.addEventListener("change", () => {
    if (dom.editCanPickup.checked) dom.editPickupBlocked.checked = false;
  });

  dom.editPickupBlocked.addEventListener("change", () => {
    if (dom.editPickupBlocked.checked) dom.editCanPickup.checked = false;
  });

  dom.createCanPickup.addEventListener("change", () => {
    if (dom.createCanPickup.checked) dom.createPickupBlocked.checked = false;
  });

  dom.createPickupBlocked.addEventListener("change", () => {
    if (dom.createPickupBlocked.checked) dom.createCanPickup.checked = false;
  });
}