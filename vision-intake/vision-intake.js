import { parseVisionDocument } from "./vision-intake-parser.js";

const docInput = document.getElementById("docInput");
const extractBtn = document.getElementById("extractBtn");
const fillDemoBtn = document.getElementById("fillDemoBtn");

const statusBox = document.getElementById("statusBox");
const fieldsBox = document.getElementById("fieldsBox");
const warningsBox = document.getElementById("warningsBox");
const textPreview = document.getElementById("textPreview");

// FORM
const demoFirstName = document.getElementById("demoFirstName");
const demoLastName = document.getElementById("demoLastName");
const demoDob = document.getElementById("demoDob");
const demoGender = document.getElementById("demoGender");
const demoGuardian = document.getElementById("demoGuardian");
const demoPhone = document.getElementById("demoPhone");
const demoPhysician = document.getElementById("demoPhysician");
const demoAllergies = document.getElementById("demoAllergies");

let lastParsed = null;

// =========================
// MAIN BUTTON
// =========================
extractBtn.addEventListener("click", async () => {
  const file = docInput.files[0];

  if (!file) {
    alert("Please select a file first");
    return;
  }

  setStatus("Reading document...");

  try {
    const text = await extractText(file);

    if (!text) {
      setStatus("No readable text found");
      return;
    }

    textPreview.textContent = text;

    const parsed = parseVisionDocument(text);

    lastParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);

    setStatus("Document analyzed successfully");

  } catch (err) {
    console.error(err);
    setStatus("Error analyzing document");
  }
});

// =========================
// AUTOFILL BUTTON
// =========================
fillDemoBtn.addEventListener("click", () => {
  if (!lastParsed) {
    alert("Analyze document first");
    return;
  }

  const f = lastParsed.fields;

  demoFirstName.value = f.childFirstName || "";
  demoLastName.value = f.childLastName || "";
  demoDob.value = f.dob || "";
  demoGender.value = f.gender || "";
  demoGuardian.value = f.guardianName || "";
  demoPhone.value = f.phone || "";
  demoPhysician.value = f.physician || "";
  demoAllergies.value = f.allergies || "";

  setStatus("Form autofilled");
});

// =========================
// TEXT EXTRACTION
// =========================
async function extractText(file) {
  const type = file.type;

  // PDF
  if (type === "application/pdf") {
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

  // IMAGE OCR
  if (type.startsWith("image/")) {
    const Tesseract = (await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js")).default;

    const result = await Tesseract.recognize(file, "eng");

    return result.data.text;
  }

  throw new Error("Unsupported file type");
}

// =========================
// UI RENDER
// =========================
function renderFields(fields) {
  fieldsBox.innerHTML = Object.entries(fields)
    .map(([key, value]) => `
      <div>
        <strong>${key}</strong>: ${value || "Not detected"}
      </div>
    `)
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    warningsBox.innerHTML = "<p>No warnings</p>";
    return;
  }

  warningsBox.innerHTML = warnings.map(w => `<p>• ${w}</p>`).join("");
}

function setStatus(msg) {
  statusBox.innerHTML = `<p>${msg}</p>`;
}