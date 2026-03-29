import { createChildGuardianLinkState } from "./child-guardian-link-state.js";
import { getDom } from "./child-guardian-link-dom.js";
import { wireChildGuardianLinkEvents } from "./child-guardian-link-events.js";
import { refreshAll } from "./child-guardian-link-controller.js";

const url = new URL(window.location.href);
const childId = url.searchParams.get("child_id");

const dom = getDom();
const state = createChildGuardianLinkState({ childId });

async function init() {
  if (!childId) {
    document.body.innerHTML = `
      <main style="padding:24px;color:white;font-family:system-ui;background:#0f172a;min-height:100vh;">
        Missing <strong>child_id</strong> in the URL.
      </main>
    `;
    return;
  }

  wireChildGuardianLinkEvents({ dom, state, refreshAll });
  await refreshAll({ dom, state });
}

init();