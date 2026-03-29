import {
  childDisplayName,
  escapeHtml,
  getAvatarUrl,
  getCanPickup,
  getGuardianEmail,
  getGuardianId,
  getGuardianName,
  getGuardianPhone,
  getInitials,
  getIsActive,
  getIsPrimary,
  getLinkId,
  getNotes,
  getPickupBlocked,
  getRelationship,
} from "./child-guardian-link-utils.js";

export function sortLinkedRows(rows) {
  return [...rows].sort((a, b) => {
    const primaryDiff = Number(getIsPrimary(b)) - Number(getIsPrimary(a));
    if (primaryDiff !== 0) return primaryDiff;
    return getGuardianName(a).localeCompare(getGuardianName(b));
  });
}

export function filterLinkedRows({ dom, state }) {
  const search = dom.guardianSearchInput.value.trim().toLowerCase();
  const blockedOnly = dom.showBlockedOnly.checked;
  const pickupOnly = dom.showPickupOnly.checked;

  return state.linked.filter((row) => {
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

export function filterAvailableRows({ dom, state }) {
  const search = dom.availableGuardianSearchInput.value.trim().toLowerCase();
  const linkedGuardianIds = new Set(state.linked.map((row) => String(getGuardianId(row))));

  return state.available.filter((row) => {
    const guardianId = String(getGuardianId(row));
    if (linkedGuardianIds.has(guardianId)) return false;

    const name = getGuardianName(row).toLowerCase();
    const phone = getGuardianPhone(row).toLowerCase();
    const email = getGuardianEmail(row).toLowerCase();

    return !search || name.includes(search) || phone.includes(search) || email.includes(search);
  });
}

export function renderHero({ dom, state }) {
  const name = childDisplayName(state.child);
  dom.childTitle.textContent = name;
  dom.childSubtitle.textContent = "Manage who is linked, who can pick up, and who is primary.";
  dom.childAvatar.textContent = getInitials(name);
  dom.backToProfileBtn.href = `/children/child-profile.html?id=${encodeURIComponent(state.childId)}`;
}

export function renderLinked({ dom, state }) {
  const rows = filterLinkedRows({ dom, state });
  dom.linkedCountBadge.textContent = `${state.linked.length} linked`;

  if (!rows.length) {
    dom.linkedGuardianGrid.innerHTML = `
      <div class="cg-empty-state">
        <div class="cg-empty-icon">🛡️</div>
        <h3>No guardians linked yet</h3>
        <p>Use the button above to connect this child with a guardian.</p>
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
        <article class="cg-card" data-link-id="${escapeHtml(String(linkId))}" data-guardian-id="${escapeHtml(String(guardianId))}">
          <div class="cg-card-top">
            ${
              avatarUrl
                ? `<img class="cg-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />`
                : `<div class="cg-avatar">${escapeHtml(getInitials(name))}</div>`
            }

            <div class="cg-card-head">
              <h3 class="cg-card-name">${escapeHtml(name)}</h3>
              <div class="cg-card-meta">
                <div>${escapeHtml(relationship)}</div>
                <div>${phone ? `📞 ${escapeHtml(phone)}` : "📞 No phone"}</div>
                <div>${email ? `✉️ ${escapeHtml(email)}` : "✉️ No email"}</div>
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
            <button class="cg-action-btn primary" type="button" data-action="edit" data-link-id="${escapeHtml(String(linkId))}">
              Edit
            </button>
            <button class="cg-action-btn" type="button" data-action="toggle-primary" data-link-id="${escapeHtml(String(linkId))}">
              ${isPrimary ? "Primary ✓" : "Make Primary"}
            </button>
            <button class="cg-action-btn" type="button" data-action="toggle-block" data-link-id="${escapeHtml(String(linkId))}">
              ${pickupBlocked ? "Unblock Pickup" : "Block Pickup"}
            </button>
            <button class="cg-action-btn danger" type="button" data-action="remove" data-link-id="${escapeHtml(String(linkId))}">
              Remove
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderAvailable({ dom, state }) {
  const rows = filterAvailableRows({ dom, state });

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
              ? `<img class="cg-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />`
              : `<div class="cg-avatar">${escapeHtml(getInitials(name))}</div>`
          }

          <div class="cg-available-copy">
            <strong>${escapeHtml(name)}</strong>
            <span>${phone ? `📞 ${escapeHtml(phone)}` : "📞 No phone"}</span>
            <span>${email ? `✉️ ${escapeHtml(email)}` : "✉️ No email"}</span>
          </div>

          <button class="cg-link-btn" type="button" data-action="prepare-link" data-guardian-id="${escapeHtml(String(id))}">
            Link
          </button>
        </div>
      `;
    })
    .join("");
}