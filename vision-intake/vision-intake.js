import { parseVisionDocument } from "./vision-intake-parser.js";

/* ============================= */
/* ELEMENTOS UI */
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

/* ============================= */
/* BOTÓN ANALIZAR */
/* ============================= */

extractBtn.addEventListener("click", async () => {
  try {
    const file = docInput.files[0];
    if (!file) {
      alert("Please select a file");
      return;
    }

    setStatus("Reading document...");
    clearOutput(false);

    const text = await extractDocumentText(file);

    if (!text) {
      setStatus("No readable text detected.");
      return;
    }

    textPreview.textContent = text;

    const parsed = parseVisionDocument(text);
    latestParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);

    /* 🔥 AUTO FILL INTELIGENTE */
    autofillDemo(parsed.fields);
    autoMapForm(parsed.fields);

    setStatus("Document analyzed successfully.");

  } catch (err) {
    console.error(err);
    setStatus("Error analyzing document");
  }
});

/* ============================= */
/* BOTÓN MANUAL */
/* ============================= */

fillDemoBtn.addEventListener("click", () => {
  if (!latestParsed) {
    alert("Analyze a document first.");
    return;
  }

  autofillDemo(latestParsed.fields);
  autoMapForm(latestParsed.fields);
});

/* ============================= */
/* AUTOFILL DEMO */
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
/* 🔥 AUTO MAPPING UNIVERSAL */
/* ============================= */

function autoMapForm(fields) {
  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach(input => {
    const label = getLabel(input);
    const context = `${label} ${input.placeholder} ${input.name} ${input.id}`.toLowerCase();

    const value = matchField(context, fields);

    if (value !== null && value !== undefined) {
      input.value = value;
    }
  });
}

/* ============================= */

function matchField(context, fields) {
  const map = [
    { keys: ["first name", "firstname", "nombre"], value: fields.childFirstName },
    { keys: ["last name", "lastname", "apellido"], value: fields.childLastName },
    { keys: ["dob", "birth"], value: fields.dob },
    { keys: ["gender", "sex"], value: fields.gender },
    { keys: ["guardian", "parent"], value: fields.guardianName },
    { keys: ["phone", "tel"], value: fields.phone },
    { keys: ["physician", "doctor"], value: fields.physician },
    { keys: ["allerg"], value: fields.allergies },
    { keys: ["address"], value: fields.address },
    { keys: ["meal"], value: fields.meals }
  ];

  for (const item of map) {
    for (const key of item.keys) {
      if (context.includes(key)) return item.value || "";
    }
  }

  return null;
}

/* ============================= */

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
/* UI */
/* ============================= */

function renderFields(fields) {
  fieldsBox.innerHTML = Object.entries(fields)
    .map(([k, v]) => `<div><b>${k}:</b> ${v || "—"}</div>`)
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    warningsBox.innerHTML = "No warnings";
    return;
  }

  warningsBox.innerHTML = warnings.map(w => `<div>⚠ ${w}</div>`).join("");
}

function setStatus(msg) {
  statusBox.innerText = msg;
}

function clearOutput(clearStatus = true) {
  fieldsBox.innerHTML = "";
  warningsBox.innerHTML = "";
  textPreview.textContent = "";
  latestParsed = null;

  if (clearStatus) setStatus("Waiting for document...");
}

/* ============================= */
/* OCR + PDF */
/* ============================= */

async function extractDocumentText(file) {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (name.endsWith(".pdf") || type === "application/pdf") {
    return extractPdfText(file);
  }

  if (type.startsWith("image")) {
    return extractImageText(file);
  }

  throw new Error("Unsupported file type");
}

/* ============================= */

async function extractPdfText(file) {
  const pdfjsLib = await import("https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs");

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(i => i.str).join(" ") + "\n";
  }

  return text;
}

/* ============================= */

async function extractImageText(file) {
  const Tesseract = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");

  const { data } = await Tesseract.recognize(file, "eng");

  return data.text;
}