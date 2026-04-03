import { parseVisionDocument } from "./vision-intake-parser.js";

const docInput = document.getElementById("docInput");
const extractBtn = document.getElementById("extractBtn");
const fillDemoBtn = document.getElementById("fillDemoBtn");
const statusBox = document.getElementById("statusBox");

const fieldsBox = document.getElementById("fieldsBox");
const warningsBox = document.getElementById("warningsBox");
const textPreview = document.getElementById("textPreview");

const demoFirstName = document.getElementById("demoFirstName");
const demoLastName = document.getElementById("demoLastName");
const demoDob = document.getElementById("demoDob");
const demoGender = document.getElementById("demoGender");
const demoGuardian = document.getElementById("demoGuardian");
const demoPhone = document.getElementById("demoPhone");
const demoPhysician = document.getElementById("demoPhysician");
const demoAllergies = document.getElementById("demoAllergies");

let latestParsed = null;
let isBusy = false;

setStatus("Vision Intake ready.");

docInput.addEventListener("change", () => {
  const file = docInput.files?.[0];
  if (!file) {
    setStatus("Vision Intake ready.");
    return;
  }
  setStatus(`File selected: ${file.name}`);
});

extractBtn.addEventListener("click", async () => {
  const file = docInput.files?.[0];

  if (!file) {
    alert("Please choose a file first.");
    return;
  }

  if (isBusy) return;

  try {
    isBusy = true;
    latestParsed = null;
    extractBtn.disabled = true;
    fillDemoBtn.disabled = true;
    extractBtn.textContent = "Working...";

    clearOutput(false);
    setStatus(`Starting analysis for: ${file.name}`);

    const text = await extractText(file);

    if (!text || !text.trim()) {
      throw new Error("No readable text was extracted.");
    }

    textPreview.textContent = text;

    const parsed = parseVisionDocument(text);
    latestParsed = parsed;

    renderVisibleFields(parsed.visibleFields);
    renderWarnings(parsed.warnings);
    autofillDemo(parsed.visibleFields);

    setStatus("Document analyzed successfully.");
  } catch (error) {
    console.error("Vision Intake error:", error);
    setStatus(`Error: ${error.message || "Unknown error"}`);
  } finally {
    isBusy = false;
    extractBtn.disabled = false;
    fillDemoBtn.disabled = false;
    extractBtn.textContent = "Extract & Analyze";
  }
});

fillDemoBtn.addEventListener("click", () => {
  if (!latestParsed) {
    alert("Analyze document first.");
    return;
  }

  autofillDemo(latestParsed.visibleFields);
  setStatus("Form autofilled.");
});

function autofillDemo(fields) {
  demoFirstName.value = fields.childFirstName?.value || "";
  demoLastName.value = fields.childLastName?.value || "";
  demoDob.value = fields.dob?.value || "";
  demoGender.value = fields.gender?.value || "";
  demoGuardian.value = fields.guardianName?.value || "";
  demoPhone.value = fields.phone?.value || "";
  demoPhysician.value = fields.physician?.value || "";
  demoAllergies.value = fields.allergies?.value || "";
}

function renderVisibleFields(fields) {
  const rows = Object.entries(fields).map(([key, data]) => {
    const value = data?.value ?? "";
    const conf = Math.round((data?.confidence || 0) * 100);

    return `
      <div style="margin-bottom:6px;">
        <strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}
        <span style="color:gray; font-size:11px;">(${conf}%)</span>
      </div>
    `;
  });

  fieldsBox.innerHTML = rows.join("");
}

function renderWarnings(warnings) {
  if (!warnings || !warnings.length) {
    warningsBox.innerHTML = "<div>No warnings</div>";
    return;
  }

  warningsBox.innerHTML = warnings
    .map((w) => `<div>⚠️ ${escapeHtml(w)}</div>`)
    .join("");
}

async function extractText(file) {
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return await extractPdfText(file);
  }

  if (type.startsWith("image/")) {
    return await extractImageText(file);
  }

  throw new Error("Unsupported file type.");
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF library not loaded.");
  }

  setStatus("Reading PDF...");

  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i += 1) {
    setStatus(`Page ${i}/${pdf.numPages}`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str || "").join(" ") + "\n";
  }

  return text;
}

async function extractImageText(file) {
  if (!window.Tesseract) {
    throw new Error("OCR not loaded.");
  }

  setStatus("Running OCR...");

  const imageUrl = URL.createObjectURL(file);

  try {
    const result = await window.Tesseract.recognize(imageUrl, "eng", {
      logger: (m) => {
        if (!m || !m.status) return;
        const pct =
          typeof m.progress === "number"
            ? Math.round(m.progress * 100)
            : "";
        setStatus(`OCR: ${m.status}${pct !== "" ? ` ${pct}%` : ""}`);
      },
    });

    return result?.data?.text || "";
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function clearOutput(clearStatus = true) {
  fieldsBox.innerHTML = "";
  warningsBox.innerHTML = "";
  textPreview.textContent = "";

  demoFirstName.value = "";
  demoLastName.value = "";
  demoDob.value = "";
  demoGender.value = "";
  demoGuardian.value = "";
  demoPhone.value = "";
  demoPhysician.value = "";
  demoAllergies.value = "";

  if (clearStatus) setStatus("Vision Intake ready.");
}

function setStatus(msg) {
  statusBox.innerHTML = `<p>${escapeHtml(msg)}</p>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}