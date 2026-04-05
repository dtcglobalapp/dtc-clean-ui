import { parseVisionDocument } from "./vision-intake-parser.js";

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

/* ============================= */

let latestParsed = null;
let CLEAN_MODE = true;

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

    const parsed = parseVisionDocument(rawText);
    latestParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);

    autofillDemo(parsed.fields);
    autoMapForm(parsed.fields);

    setStatus("Form ready ✔");

    if (CLEAN_MODE) activateCleanUI();
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

  if (CLEAN_MODE) activateCleanUI();
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
}

/* ============================= */
/* AUTO MAP UNIVERSAL */
/* ============================= */

function autoMapForm(fields) {
  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach((input) => {
    const label = getLabel(input);
    const context = `${label} ${input.placeholder || ""} ${input.name || ""} ${input.id || ""}`.toLowerCase();

    const value = matchField(context, fields);

    if (value !== null && value !== undefined) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

function matchField(context, fields) {
  const map = [
    { keys: ["first name", "firstname", "nombre", "child name", "student name"], value: fields.childFirstName },
    { keys: ["last name", "lastname", "apellido"], value: fields.childLastName },
    { keys: ["dob", "birth", "date of birth", "fecha"], value: fields.dob },
    { keys: ["gender", "sex"], value: fields.gender },
    { keys: ["guardian", "parent", "mother", "father"], value: fields.guardianName },
    { keys: ["phone", "tel", "telefono"], value: fields.phone },
    { keys: ["physician", "doctor"], value: fields.physician },
    { keys: ["allerg", "allergy"], value: fields.allergies },
    { keys: ["address", "direccion"], value: fields.address },
    { keys: ["meal", "food"], value: fields.meals }
  ];

  for (const item of map) {
    for (const key of item.keys) {
      if (context.includes(key)) {
        return item.value || "";
      }
    }
  }

  return null;
}

function getLabel(input) {
  let label = "";

  if (input.id) {
    const el = document.querySelector(`label[for="${input.id}"]`);
    if (el) label += el.innerText;
  }

  if (!label && input.closest("label")) {
    label += input.closest("label").innerText;
  }

  return label;
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

function hideSectionTitles() {
  document.querySelectorAll("h3, h4").forEach((el) => {
    const text = (el.innerText || "").toLowerCase();

    if (
      text.includes("detected") ||
      text.includes("warnings") ||
      text.includes("extracted")
    ) {
      el.style.display = "none";
    }
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