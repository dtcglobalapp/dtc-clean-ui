function fullName(item) {
  return [item?.first_name, item?.last_name].filter(Boolean).join(" ").trim() || "Unnamed Guardian";
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "G";
}

function badgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "dtc-badge dtc-badge-success";
    case "pending":
      return "dtc-badge dtc-badge-warning";
    default:
      return "dtc-badge dtc-badge-neutral";
  }
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function formatAddress(item) {
  const parts = [
    item?.address_line_1,
    item?.address_line_2,
    item?.city,
    item?.state,
    item?.zip_code,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "—";
}

function childName(child) {
  return [child?.first_name, child?.last_name].filter(Boolean).join(" ").trim() || "Unnamed Child";
}

export function renderGuardianProfile(dom, state) {
  dom.loading.hidden = !state.loading;
  dom.feedback.textContent = state.error || "";

  if (state.loading) {
    dom.content.hidden = true;
    dom.notFound.hidden = true;
    return;
  }

  if (!state.item) {
    dom.content.hidden = true;
    dom.notFound.hidden = false;
    return;
  }

  dom.notFound.hidden = true;
  dom.content.hidden = false;

  const name = fullName(state.item);
  const status = state.item.status || "inactive";

  dom.pageTitle.textContent = name;
  dom.pageSubtitle.textContent = "Guardian profile and linked children.";
  dom.avatar.textContent = initials(name);
  dom.fullName.textContent = name;
  dom.role.textContent = state.item.relationship || "Guardian";

  dom.statusBadge.className = badgeClass(status);
  dom.statusBadge.textContent = status;

  dom.primaryBadge.className = state.item.is_primary
    ? "dtc-badge dtc-badge-success"
    : "dtc-badge dtc-badge-neutral";
  dom.primaryBadge.textContent = state.item.is_primary ? "Primary Contact" : "Standard Contact";

  dom.phone.textContent = state.item.phone || "—";
  dom.email.textContent = state.item.email || "—";
  dom.relationship.textContent = state.item.relationship || "—";
  dom.language.textContent = state.item.preferred_language || "—";
  dom.address.textContent = formatAddress(state.item);
  dom.emergencyFlag.textContent = yesNo(state.item.is_emergency_contact);
  dom.notes.textContent = state.item.notes?.trim() || "No notes available.";

  renderGuardianChildren(dom, state.children);
}

export function renderGuardianChildren(dom, items) {
  if (!items.length) {
    dom.childrenEmpty.hidden = false;
    dom.childrenWrap.hidden = true;
    dom.childrenTableBody.innerHTML = "";
    return;
  }

  dom.childrenEmpty.hidden = true;
  dom.childrenWrap.hidden = false;

  dom.childrenTableBody.innerHTML = items.map(link => {
    const child = Array.isArray(link.children) ? link.children[0] : link.children;
    const name = childName(child);

    return `
      <tr>
        <td>
          <div class="dtc-person">
            <div class="dtc-avatar">${initials(name)}</div>
            <div>
              <div class="dtc-person-name">${name}</div>
              <div class="dtc-person-meta">${child?.status || "active"}</div>
            </div>
          </div>
        </td>
        <td>${link.relationship || "—"}</td>
        <td>
          <span class="${link.is_authorized_pickup ? "dtc-badge dtc-badge-success" : "dtc-badge dtc-badge-neutral"}">
            ${link.is_authorized_pickup ? "Authorized" : "No"}
          </span>
        </td>
        <td>
          <span class="${link.is_primary_guardian ? "dtc-badge dtc-badge-success" : "dtc-badge dtc-badge-neutral"}">
            ${link.is_primary_guardian ? "Primary" : "No"}
          </span>
        </td>
        <td class="dtc-col-actions">
          <div class="dtc-inline-actions">
            <button class="dtc-btn dtc-btn-sm dtc-btn-ghost" data-action="open-child" data-id="${child?.id || ""}">
              View Child
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}