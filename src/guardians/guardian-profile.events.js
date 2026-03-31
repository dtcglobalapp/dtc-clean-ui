export function bindGuardianProfileEvents({ dom, state, reload, onEdit, onOpenChild }) {
  dom.btnRefresh?.addEventListener("click", reload);

  dom.btnEdit?.addEventListener("click", () => {
    if (!state.guardianId) return;
    onEdit(state.guardianId);
  });

  dom.btnCall?.addEventListener("click", () => {
    const phone = state.item?.phone?.trim();
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  });

  dom.btnEmail?.addEventListener("click", () => {
    const email = state.item?.email?.trim();
    if (!email) return;
    window.location.href = `mailto:${email}`;
  });

  dom.childrenTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='open-child']");
    if (!button) return;

    const childId = button.dataset.id;
    if (!childId) return;

    onOpenChild(childId);
  });
}