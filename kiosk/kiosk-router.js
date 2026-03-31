function shell({ title, subtitle = "", body = "", backLabel = "← Back", showBack = true }) {
  return `
    <div class="kiosk-shell">
      <div class="kiosk-shell-inner">
        <div class="kiosk-card">
          ${showBack ? `
            <button id="routerBackBtn" type="button" class="kiosk-back-btn">
              ${backLabel}
            </button>
          ` : ``}

          <div class="kiosk-head">
            <div class="kiosk-eyebrow">DTC SMART KIOSK</div>
            <h1 class="kiosk-title">${title}</h1>
            ${subtitle ? `<p class="kiosk-subtitle">${subtitle}</p>` : ``}
          </div>

          <div class="kiosk-body">
            ${body}
          </div>
        </div>
      </div>
    </div>
  `;
}

function optionButton(label, type, tone = "default") {
  return `
    <button
      type="button"
      data-route-type="${type}"
      class="kiosk-option-btn kiosk-option-${tone}">
      ${label}
    </button>
  `;
}

function infoTile(label) {
  return `<div class="kiosk-info-tile">${label}</div>`;
}

function attachCommon(root, { onBack, onRoute }) {
  const backBtn = root.querySelector("#routerBackBtn");
  if (backBtn && onBack) {
    backBtn.addEventListener("click", onBack);
  }

  root.querySelectorAll("[data-route-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (onRoute) {
        onRoute({
          type: btn.dataset.routeType,
          label: btn.textContent.trim(),
        });
      }
    });
  });
}

function renderMirrorMenu(root, { onBack, onRoute }) {
  root.innerHTML = shell({
    title: "Show me your face",
    subtitle: "and I will tell you who you are. This is the intelligent router of the magical mirror.",
    showBack: false,
    body: `
      <div class="kiosk-options-grid">
        ${optionButton("👑 Felencho", "felencho", "primary")}
        ${optionButton("🧠 Bob", "bob", "default")}
        ${optionButton("👨‍👩‍👧 Parent / Guardian", "parent", "success")}
        ${optionButton("👷 Employee", "employee", "warning")}
        ${optionButton("🌍 Visitor / Future Client", "visitor", "default")}
      </div>
    `,
  });

  attachCommon(root, { onBack, onRoute });
}

function renderFelencho(root, { identity, onBack, onRoute }) {
  root.innerHTML = shell({
    title: `${identity.name}, how do you want to enter?`,
    subtitle: "Platform Owner access. Choose any role or experience mode.",
    body: `
      <div class="kiosk-options-grid">
        ${optionButton("👑 Platform Owner", "owner", "primary")}
        ${optionButton("🧭 Admin", "admin", "default")}
        ${optionButton("👷 Employee", "employee", "warning")}
        ${optionButton("👨‍👩‍👧 Parent", "parent", "success")}
        ${optionButton("🌍 Demo Visitor", "visitor", "default")}
      </div>
    `,
  });

  attachCommon(root, { onBack, onRoute });
}

function renderBob(root, { identity, onBack, onRoute }) {
  root.innerHTML = shell({
    title: `${identity.name}, test operator mode`,
    subtitle: "Choose an authorized testing route.",
    body: `
      <div class="kiosk-options-grid">
        ${optionButton("👷 Test Employee", "employee", "warning")}
        ${optionButton("👨‍👩‍👧 Test Parent", "parent", "success")}
        ${optionButton("🌍 Visitor Flow", "visitor", "default")}
      </div>
    `,
  });

  attachCommon(root, { onBack, onRoute });
}

function renderParent(root, { identity, onBack }) {
  root.innerHTML = shell({
    title: `Welcome ${identity.name || ""}`,
    subtitle: identity.message || "Guardian recognized. Choose what you need to do.",
    body: `
      <div class="kiosk-options-grid">
        ${infoTile("👶 Drop-off flow")}
        ${infoTile("🧒 Pickup flow")}
        ${infoTile("📄 Profile / alerts / documents")}
      </div>
    `,
  });

  attachCommon(root, { onBack });
}

function renderEmployee(root, { identity, onBack, onRoute }) {
  root.innerHTML = shell({
    title: identity.name || "Employee recognized",
    subtitle: identity.message || "Employee route ready.",
    body: `
      <div class="kiosk-options-grid">
        ${optionButton("✅ Continue to employee kiosk", "continue", "success")}
      </div>
    `,
  });

  attachCommon(root, { onBack, onRoute });
}

function renderAdmin(root, { identity, onBack }) {
  root.innerHTML = shell({
    title: "Business dashboard access",
    subtitle: `Role: ${identity.type}`,
    body: `
      <div class="kiosk-options-grid">
        ${infoTile("📊 Alerts")}
        ${infoTile("👥 Employees")}
        ${infoTile("🧒 Children")}
      </div>
    `,
  });

  attachCommon(root, { onBack });
}

function renderVisitor(root, { onBack }) {
  root.innerHTML = shell({
    title: "Your face is not registered",
    subtitle: "Do you want to know DTC? The magical mirror can also welcome future clients.",
    body: `
      <div class="kiosk-options-grid">
        ${infoTile("🏢 What is DTC?")}
        ${infoTile("🛡 Security & automation")}
        ${infoTile("🌍 Demo for daycare or other business")}
      </div>
    `,
  });

  attachCommon(root, { onBack });
}

function renderError(root, { identity, onBack }) {
  root.innerHTML = shell({
    title: identity.name || "Kiosk error",
    subtitle: identity.message || "Something went wrong.",
    body: `
      <div class="kiosk-error-box">
        ${identity.message || "Unknown error"}
      </div>
    `,
  });

  attachCommon(root, { onBack });
}

export function routeIdentity({ root, identity, onBack = null, onRoute = null }) {
  if (!root) return;

  switch (identity?.type) {
    case "mirror_menu":
      renderMirrorMenu(root, { onBack, onRoute });
      return;

    case "felencho":
      renderFelencho(root, { identity, onBack, onRoute });
      return;

    case "bob":
      renderBob(root, { identity, onBack, onRoute });
      return;

    case "parent":
    case "guardian":
      renderParent(root, { identity, onBack, onRoute });
      return;

    case "employee":
      renderEmployee(root, { identity, onBack, onRoute });
      return;

    case "owner":
    case "admin":
      renderAdmin(root, { identity, onBack, onRoute });
      return;

    case "visitor":
      renderVisitor(root, { identity, onBack, onRoute });
      return;

    case "error":
      renderError(root, { identity, onBack, onRoute });
      return;

    default:
      renderVisitor(root, { identity, onBack, onRoute });
  }
}