import { parseVisionDocument } from "./vision-intake-parser.js";
import { autoMapForm } from "./vision-auto-mapper.js";

/* ============================= */
/* CONFIG */
/* ============================= */

const OCR_API_URL = "https://dtc-ocr-backend-production.up.railway.app/extract-text";

/* ============================= */
/* ELEMENTOS */
/* ============================= */

const docInput = document.getElementById("docInput");
const extractBtn = document.getElementById("extractBtn");
const fillDemoBtn = document.getElementById("fillDemoBtn");

const statusBox = document.getElementById("statusBox");
const fieldsBox = document.getElementById("fieldsBox");
const warningsBox = document.getElementById("warningsBox");
const textPreview = document.getElementById("textPreview");

/* DEMO FORM */
const demoFirstName = document.getElementById("demoFirstName");
const demoLastName = document.getElementById("demoLastName");
const demoDob = document.getElementById("demoDob");
const demoGender = document.getElementById("demoGender");
const demoGuardian = document.getElementById("demoGuardian");
const demoPhone = document.getElementById("demoPhone");
const demoPhysician = document.getElementById("demoPhysician");
const demoAllergies = document.getElementById("demoAllergies");

let latestParsed = null;
let CLEAN_MODE = false;

/* ============================= */
/* ANALIZAR */
/* ============================= */

extractBtn.addEventListener("click", async () => {
  try {
    const file = docInput.files[0];

    if (!file) {
      alert("Select a file first");
      return;
    }

    setStatus("Uploading file to OCR server...");
    clearOutput(false);

    const rawText = await extractTextFromBackend(file);

    if (!rawText || !rawText.trim()) {
      setStatus("No text detected");
      return;
    }

    textPreview.textContent = rawText;
    setStatus("Parsing document...");

    const parsed = parseVisionDocument(rawText);
    latestParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);

    autofillDemo(parsed.fields);
    autoMapForm(parsed.fields);

    setStatus("Form ready ✔");

    if (CLEAN_MODE) {
      activateCleanUI();
    } else {
      deactivateCleanUI();
    }
  } catch (err) {
    console.error(err);
    setStatus(getFriendlyError(err));
  }
});

/* ============================= */

fillDemoBtn.addEventListener("click", () => {
  if (!latestParsed) {
    alert("Analyze first");
    return;
  }

  autofillDemo(latestParsed.fields);
  autoMapForm(latestParsed.fields);

  if (CLEAN_MODE) {
    activateCleanUI();
  } else {
    deactivateCleanUI();
  }
});

/* ============================= */
/* BACKEND OCR */
/* ============================= */

async function extractTextFromBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(OCR_API_URL, {
    method: "POST",
    body: formData
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `OCR server error (${response.status})`);
  }

  return data.text || "";
}

function getFriendlyError(error) {
  const raw = String(error?.message || "Unknown error");

  if (raw.toLowerCase().includes("failed to fetch")) {
    return "Cannot reach OCR server";
  }

  return `Error analyzing document: ${raw}`;
}

/* ============================= */
/* AUTOFILL */
/* ============================= */

function autofillDemo(fields) {
  demoFirstName.value = fields.childFirstName || "";
  demoLastName.value = fields.childLastName || "";
  demoDob.value = fields.dob || "";
  demoGender.value = fields.gender || "";
  demoGuardian.value = fields.guardianName || "";
  demoPhone.value = fields.phone || "";
  demoPhysician.value = fields.physician || "";
  demoAllergies.value = fields.allergies || "";

  [demoFirstName, demoLastName, demoDob, demoGender, demoGuardian, demoPhone, demoPhysician, demoAllergies]
    .forEach((input) => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

/* ============================= */
/* UI LIMPIA */
/* ============================= */

function activateCleanUI() {
  if (fieldsBox) fieldsBox.style.display = "none";
  if (warningsBox) warningsBox.style.display = "none";
  if (textPreview) textPreview.style.display = "none";
  hideSectionTitles();
}

function deactivateCleanUI() {
  if (fieldsBox) fieldsBox.style.display = "";
  if (warningsBox) warningsBox.style.display = "";
  if (textPreview) textPreview.style.display = "";
  showSectionTitles();
}

function hideSectionTitles() {
  document.querySelectorAll("h3, h4").forEach((el) => {
    const text = (el.innerText || "").toLowerCase();
    if (text.includes("detected") || text.includes("warnings") || text.includes("extracted")) {
      el.style.display = "none";
    }
  });
}

function showSectionTitles() {
  document.querySelectorAll("h3, h4").forEach((el) => {
    el.style.display = "";
  });
}

/* ============================= */
/* UI */
/* ============================= */

function renderFields(fields) {
  if (!fieldsBox) return;

  fieldsBox.innerHTML = Object.entries(fields)
    .map(([k, v]) => `<div><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v || "—"))}</div>`)
    .join("");
}

function renderWarnings(warnings) {
  if (!warningsBox) return;

  if (!warnings.length) {
    warningsBox.innerHTML = "No warnings";
    return;
  }

  warningsBox.innerHTML = warnings
    .map((w) => `<div>⚠ ${escapeHtml(w)}</div>`)
    .join("");
}

function setStatus(msg) {
  if (statusBox) statusBox.innerText = msg;
}

function clearOutput(clearStatus = true) {
  if (fieldsBox) fieldsBox.innerHTML = "";
  if (warningsBox) warningsBox.innerHTML = "";
  if (textPreview) textPreview.textContent = "";

  latestParsed = null;

  if (clearStatus) setStatus("Waiting...");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}