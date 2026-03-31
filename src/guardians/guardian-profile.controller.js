import { guardianProfileState } from "./guardian-profile.state.js";
import { getGuardianProfileDom } from "./guardian-profile.dom.js";
import { fetchGuardianProfile, fetchGuardianChildren } from "./guardian-profile.api.js";
import { renderGuardianProfile } from "./guardian-profile.render.js";
import { bindGuardianProfileEvents } from "./guardian-profile.events.js";

const ORGANIZATION_ID = "REPLACE_WITH_REAL_ORG_ID";

const dom = getGuardianProfileDom();
const params = new URLSearchParams(window.location.search);

guardianProfileState.organizationId = ORGANIZATION_ID;
guardianProfileState.guardianId = params.get("id") || "";

async function loadGuardianProfile() {
  guardianProfileState.loading = true;
  guardianProfileState.error = "";
  renderGuardianProfile(dom, guardianProfileState);

  try {
    const [guardian, children] = await Promise.all([
      fetchGuardianProfile({
        organizationId: guardianProfileState.organizationId,
        guardianId: guardianProfileState.guardianId,
      }),
      fetchGuardianChildren({
        organizationId: guardianProfileState.organizationId,
        guardianId: guardianProfileState.guardianId,
      }),
    ]);

    guardianProfileState.item = guardian;
    guardianProfileState.children = children;
  } catch (error) {
    guardianProfileState.item = null;
    guardianProfileState.children = [];
    guardianProfileState.error = error.message || "Failed to load guardian profile";
  } finally {
    guardianProfileState.loading = false;
    renderGuardianProfile(dom, guardianProfileState);
  }
}

function goToGuardianEdit(guardianId) {
  window.location.href = `./guardian-form.html?id=${encodeURIComponent(guardianId)}`;
}

function goToChildProfile(childId) {
  window.location.href = `../children/child-profile.html?id=${encodeURIComponent(childId)}`;
}

bindGuardianProfileEvents({
  dom,
  state: guardianProfileState,
  reload: loadGuardianProfile,
  onEdit: goToGuardianEdit,
  onOpenChild: goToChildProfile,
});

loadGuardianProfile();