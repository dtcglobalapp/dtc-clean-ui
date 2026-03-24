export function mountKioskUI(root, { onFace, onPin, onReset }) {
  root.innerHTML = `
    <style>
      :root{
        --bg0:#f4f7fb;
        --bg1:#ffffff;
        --bg2:#f8fafc;
        --bdr:#dde3ec;
        --bdr2:#cfd8e3;
        --txt:#172033;
        --mut:#667085;
        --mut2:#7b8698;
        --ok:#16a34a;
        --accent:#1d4ed8;
        --accent2:#1e40af;
        --warn:#d97706;
        --shadow:0 20px 50px rgba(15,23,42,.10);
        --radius:28px;
      }

      * { box-sizing:border-box; }

      html, body {
        height:100%;
        margin:0;
        padding:0;
        background:var(--bg0);
        color:var(--txt);
        font-family: Inter, Arial, sans-serif;
      }

      .kiosk-wrap{
        min-height:100vh;
        padding:
          max(18px, env(safe-area-inset-top))
          max(18px, env(safe-area-inset-right))
          max(18px, env(safe-area-inset-bottom))
          max(18px, env(safe-area-inset-left));
        display:grid;
        place-items:center;
        background:
          radial-gradient(900px 500px at 15% 10%, rgba(29,78,216,.07), transparent 60%),
          radial-gradient(700px 400px at 85% 20%, rgba(255,255,255,.7), transparent 55%),
          var(--bg0);
      }

      .kiosk-card{
        width:min(1100px, 100%);
        background:var(--bg1);
        border:1px solid var(--bdr);
        border-radius:var(--radius);
        box-shadow:var(--shadow);
        padding:24px;
      }

      .kiosk-top{
        display:flex;
        align-items:flex-start;
        gap:16px;
        margin-bottom:20px;
      }

      .brand-mark{
        width:64px;
        height:64px;
        border-radius:22px;
        display:grid;
        place-items:center;
        background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border:1px solid #bfdbfe;
        color:var(--accent);
        font-size:28px;
        font-weight:900;
        flex-shrink:0;
      }

      .brand-copy{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .eyebrow{
        margin:0;
        font-size:12px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
        color:var(--accent);
      }

      .title{
        margin:0;
        font-size:32px;
        line-height:1.05;
        font-weight:900;
      }

      .sub{
        margin:0;
        color:var(--mut);
        line-height:1.55;
        max-width:700px;
      }

      .net-wrap{
        margin-left:auto;
        display:flex;
        align-items:center;
      }

      .pill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        border:1px solid var(--bdr);
        background:var(--bg2);
        padding:10px 14px;
        border-radius:999px;
        font-size:14px;
        color:var(--mut);
        font-weight:700;
      }

      .dot{
        width:10px;
        height:10px;
        border-radius:50%;
        background:var(--ok);
      }

      .dot.warn{
        background:var(--warn);
      }

      .kiosk-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:18px;
      }

      .kiosk-panel{
        border:1px solid var(--bdr);
        background:var(--bg2);
        border-radius:24px;
        padding:20px;
        min-height:280px;
        display:flex;
        flex-direction:column;
      }

      .panel-title{
        margin:0 0 8px;
        font-size:24px;
        font-weight:900;
      }

      .panel-copy{
        margin:0;
        color:var(--mut);
        line-height:1.6;
      }

      .btn{
        appearance:none;
        cursor:pointer;
        border:none;
        border-radius:18px;
        min-height:64px;
        padding:0 18px;
        font-size:18px;
        font-weight:800;
        width:100%;
        transition:transform .15s ease, background .15s ease, border-color .15s ease;
      }

      .btn:active{
        transform:scale(.995);
      }

      .btn-primary{
        background:var(--accent);
        color:#fff;
      }

      .btn-primary:hover{
        background:var(--accent2);
      }

      .btn-secondary{
        background:#eef2f7;
        color:var(--txt);
        border:1px solid var(--bdr);
      }

      .btn-secondary:hover{
        border-color:var(--bdr2);
      }

      .face-btn{
        margin-top:18px;
      }

      .pin-row{
        display:flex;
        gap:12px;
        margin-top:18px;
      }

      .pin-input{
        flex:1;
        min-height:64px;
        border:1px solid var(--bdr);
        background:#fff;
        color:var(--txt);
        padding:0 16px;
        border-radius:18px;
        font-size:22px;
        font-weight:700;
        outline:none;
        text-align:center;
        letter-spacing:.08em;
      }

      .pin-input:focus{
        border-color:rgba(29,78,216,.55);
        box-shadow:0 0 0 4px rgba(29,78,216,.08);
      }

      .pin-btn{
        min-width:140px;
        width:auto;
        padding:0 20px;
      }

      .reset-btn{
        margin-top:14px;
      }

      .hr{
        border:0;
        border-top:1px solid var(--bdr);
        margin:16px 0;
      }

      .status{
        margin-top:auto;
        font-size:14px;
        font-weight:700;
        color:var(--mut2);
        line-height:1.5;
        word-break:break-word;
      }

      .status.ok{
        color:var(--ok);
      }

      .status.bad{
        color:#dc2626;
      }

      .kiosk-footer{
        margin-top:18px;
        border-top:1px solid var(--bdr);
        padding-top:16px;
        color:var(--mut);
        line-height:1.6;
        font-size:14px;
      }

      @media (max-width: 920px){
        .kiosk-grid{
          grid-template-columns:1fr;
        }

        .net-wrap{
          margin-left:0;
        }

        .kiosk-top{
          flex-direction:column;
        }
      }

      @media (max-width: 640px){
        .kiosk-wrap{
          padding:
            max(12px, env(safe-area-inset-top))
            max(12px, env(safe-area-inset-right))
            max(12px, env(safe-area-inset-bottom))
            max(12px, env(safe-area-inset-left));
        }

        .kiosk-card{
          padding:16px;
          border-radius:24px;
        }

        .brand-mark{
          width:56px;
          height:56px;
          border-radius:18px;
          font-size:24px;
        }

        .title{
          font-size:26px;
        }

        .panel-title{
          font-size:22px;
        }

        .kiosk-panel{
          padding:16px;
          border-radius:20px;
          min-height:auto;
        }

        .pin-row{
          flex-direction:column;
        }

        .pin-btn{
          width:100%;
          min-width:0;
        }

        .btn,
        .pin-input{
          min-height:58px;
        }
      }
    </style>

    <div class="kiosk-wrap">
      <div class="kiosk-card">
        <div class="kiosk-top">
          <div class="brand-mark">DTC</div>

          <div class="brand-copy">
            <p class="eyebrow">Control Total (Daycares)</p>
            <h1 class="title">Kiosk Access</h1>
            <p class="sub">
              Fast entrance for staff, guardians, and authorized users.
              Face scan works best online. PIN keeps the kiosk alive even when internet fails.
            </p>
          </div>

          <div class="net-wrap">
            <span class="pill" id="net-pill">
              <span class="dot" id="net-dot"></span>
              <span id="net-text">Checking network…</span>
            </span>
          </div>
        </div>

        <div class="kiosk-grid">
          <section class="kiosk-panel">
            <h2 class="panel-title">Face Access</h2>
            <p class="panel-copy">
              Best when online. Scan the face and route the person directly to the right screen.
            </p>

            <button class="btn btn-primary face-btn" id="faceBtn">📷 Scan Face</button>

            <hr class="hr" />

            <div class="status" id="faceStatus">Status: waiting…</div>
          </section>

          <section class="kiosk-panel">
            <h2 class="panel-title">PIN Access</h2>
            <p class="panel-copy">
              If camera or internet is unavailable, enter the PIN and continue working without stopping the daycare flow.
            </p>

            <div class="pin-row">
              <input
                id="pinInput"
                class="pin-input"
                inputmode="numeric"
                placeholder="PIN"
                maxlength="8"
                aria-label="PIN"
              />
              <button class="btn btn-primary pin-btn" id="pinBtn">Enter</button>
            </div>

            <button class="btn btn-secondary reset-btn" id="resetBtn">🔄 Reset / Clear</button>

            <hr class="hr" />

            <div class="status" id="pinStatus">Status: waiting…</div>
          </section>
        </div>

        <div class="kiosk-footer">
          Later, DTC will auto-configure this kiosk from administration:
          who can enter here, what route each role should open, and what fallback options stay active offline.
        </div>
      </div>
    </div>
  `;

  const netText = root.querySelector("#net-text");
  const netDot = root.querySelector("#net-dot");
  const faceBtn = root.querySelector("#faceBtn");
  const pinBtn = root.querySelector("#pinBtn");
  const pinInput = root.querySelector("#pinInput");
  const resetBtn = root.querySelector("#resetBtn");

  function refreshNet() {
    const online = navigator.onLine;
    netText.textContent = online ? "Online" : "Offline";
    netDot.className = "dot" + (online ? "" : " warn");
  }

  window.addEventListener("online", refreshNet);
  window.addEventListener("offline", refreshNet);
  refreshNet();

  faceBtn.addEventListener("click", onFace);

  pinBtn.addEventListener("click", () => {
    const pin = pinInput.value.trim();
    onPin(pin);
  });

  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pinBtn.click();
  });

  resetBtn.addEventListener("click", onReset);

  return {
    setFaceStatus: (msg, ok = true) => {
      const el = root.querySelector("#faceStatus");
      el.textContent = `Status: ${msg}`;
      el.classList.toggle("ok", ok);
      el.classList.toggle("bad", !ok);
    },

    setPinStatus: (msg, ok = true) => {
      const el = root.querySelector("#pinStatus");
      el.textContent = `Status: ${msg}`;
      el.classList.toggle("ok", ok);
      el.classList.toggle("bad", !ok);
    },

    clearPin: () => {
      pinInput.value = "";
    },
  };
}