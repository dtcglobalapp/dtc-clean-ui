function shell({ title, subtitle = "", body = "", backLabel = "← Back", showBack = true }) {
  return `
    <div style="min-height:100vh;background:#0f172a;color:white;font-family:system-ui;padding:28px;display:flex;align-items:center;justify-content:center;">
      <div style="width:min(900px,100%);">
        <div style="background:linear-gradient(135deg,#172554,#1e3a8a);border-radius:28px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.28);">
          ${showBack ? `
            <button id="routerBackBtn" type="button" style="border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:white;padding:10px 14px;border-radius:14px;font-weight:700;cursor:pointer;margin-bottom:18px;">
              ${backLabel}
            </button>
          ` : ``}

          <div style="display:flex;gap:16px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;">
            <div>
              <div style="font-size:.85rem;letter-spacing:.12em;text-transform:uppercase;opacity:.78;margin-bottom:8px;">DTC Smart Kiosk</div>
              <h1 style="margin:0;font-size:clamp(2rem,4vw,3.3rem);line-height:1.05;">${title}</h1>
              ${subtitle ? `<p style="margin:12px 0 0;color:rgba(255,255,255,.82);font-size:1.05rem;max-width:760px;">${subtitle}</p>` : ``}
            </div>
          </div>

          <div style="margin-top:26px;">
            ${body}
          </div>
        </div>
      </div>
    </div>
  `;
}

function optionButton(label, type, tone = "default") {
  const tones = {
    default: "background:rgba(255,255,255,.08);color:white;border:1px solid rgba(255,255,255,.14);",
    primary: "background:#3b82f6;color:white;border:1px solid rgba(59,130,246,.5);",
    success: "background:#15803d;color:white;border:1px solid rgba(21,128,61,.55);",
    warning: "background:#a16207;color:white;border:1px solid rgba(161,98,7,.55);",
    danger: "background:#b91c1c;color:white;border:1px solid rgba(185,28,28,.55);",
  };

  return `
    <button
      type="button"
      data-route-type="${type}"
      style="${tones[tone]}padding:14px 18px;border-radius:16px;font-weight:800;cursor:pointer;min-height:54px;text-align:left;">
      ${label}
    </button>
  `;
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">👶 Drop-off flow</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">🧒 Pickup flow</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">📄 Profile / alerts / documents</div>
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">📊 Alerts</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">👥 Employees</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">🧒 Children</div>
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">🏢 What is DTC?</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">🛡 Security & automation</div>
        <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">🌍 Demo for daycare or other business</div>
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
      <div style="padding:18px;border-radius:18px;background:rgba(185,28,28,.16);border:1px solid rgba(185,28,28,.28);color:#ffe2e2;">
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