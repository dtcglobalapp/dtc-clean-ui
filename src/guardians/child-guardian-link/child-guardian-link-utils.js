export function toast(message) {
  window.alert(message);
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "G";
}

export function getRowValue(row, keys = [], fallback = null) {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(row, key) &&
      row[key] !== undefined &&
      row[key] !== null
    ) {
      return row[key];
    }
  }
  return fallback;
}

export function getGuardianName(row) {
  return (
    getRowValue(row, ["guardian_name", "display_name", "full_name", "name"]) ||
    [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim() ||
    "Guardian"
  );
}

export function getGuardianPhone(row) {
  return getRowValue(row, ["guardian_phone", "phone", "mobile_phone", "cell_phone"], "");
}

export function getGuardianEmail(row) {
  return getRowValue(row, ["guardian_email", "email"], "");
}

export function getRelationship(row) {
  return getRowValue(
    row,
    ["relationship_to_child", "relationship", "relation_to_child", "relation"],
    ""
  );
}

export function getNotes(row) {
  return getRowValue(row, ["notes", "link_notes", "pickup_notes"], "");
}

export function getAvatarUrl(row) {
  return getRowValue(row, ["photo_url", "avatar_url", "image_url"], "");
}

export function getCanPickup(row) {
  return !!getRowValue(row, ["can_pickup", "pickup_allowed", "pickup_authorized"], false);
}

export function getPickupBlocked(row) {
  return !!getRowValue(row, ["pickup_blocked", "is_pickup_blocked", "blocked_pickup"], false);
}

export function getIsPrimary(row) {
  return !!getRowValue(row, ["is_primary", "primary_guardian"], false);
}

export function getIsActive(row) {
  const val = getRowValue(row, ["is_active", "active"], true);
  return val !== false;
}

export function getGuardianId(row) {
  return getRowValue(row, ["guardian_id", "id"]);
}

export function getLinkId(row) {
  return getRowValue(row, ["child_guardian_id", "id", "link_id"]);
}

export function childDisplayName(child) {
  return (
    getRowValue(child, ["full_name", "display_name", "name"]) ||
    [child?.first_name, child?.last_name].filter(Boolean).join(" ").trim() ||
    "Child"
  );
}