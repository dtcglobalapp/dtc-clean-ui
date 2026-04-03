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

extractBtn.addEventListener("click", async () => {
  if (isBusy) return;

  const file = docInput.files?.[0];
  if (!file) {
    alert("Please choose a file");
    return;
  }

  isBusy = true;
  extractBtn.disabled = true;
  fillDemoBtn.disabled = true;

  setStatus("Reading document...");
  clearOutput(false);

  try {
    const text = await extractText(file);

    if (!text.trim()) {
      setStatus("No readable text extracted.");
      return;
    }

    textPreview.textContent = text;

    const parsed = parseVisionDocument(text);
    latestParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);

    setStatus("Document analyzed successfully.");

  } catch (err) {
    console.error(err);
    setStatus("Error analyzing document");
  } finally {
    isBusy = false;
    extractBtn.disabled = false;
    fillDemoBtn.disabled = false;
  }
});

fillDemoBtn.addEventListener("click", () => {
  if (!latestParsed) {
    alert("Analyze a document first.");
    return;
  }

  autofillDemo(latestParsed.fields);
  setStatus("Demo form autofilled.");
});

function autofillDemo(f) {
  demoFirstName.value = f.childFirstName || "";
  demoLastName.value = f.childLastName || "";
  demoDob.value = f.dob || "";
  demoGender.value = f.gender || "";
  demoGuardian.value = f.guardianName || "";
  demoPhone.value = f.phone || "";
  demoPhysician.value = f.physician || "";
  demoAllergies.value = f.allergies || "";
}

function setStatus(msg) {
  statusBox.textContent = msg;
}

function clearOutput(clearStatus = true) {
  fieldsBox.innerHTML = "";
  warningsBox.innerHTML = "";
  textPreview.textContent = "";

  latestParsed = null;

  if (clearStatus) setStatus("Waiting for document...");
}

function renderFields(fields) {
  const entries = Object.entries(fields);

  fieldsBox.innerHTML = entries.map(([k, v]) => {
    return `<div><strong>${k}:</strong> ${v || "Not detected"}</div>`;
  }).join("");
}

function renderWarnings(warnings) {
  if (!warnings.length) {
    warningsBox.innerHTML = "<div>No warnings</div>";
    return;
  }

  warningsBox.innerHTML = warnings.map(w => `<div>• ${w}</div>`).join("");
}

async function extractText(file) {
  const type = file.type;

  // ===== PDF =====
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

  // ===== IMAGE OCR (FIXED) =====
  if (type.startsWith("image/")) {

    const Tesseract = (await import(
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
    )).default;

    const imageUrl = URL.createObjectURL(file);

    try {
      const result = await Tesseract.recognize(
        imageUrl,
        "eng",
        {
          logger: m => console.log(m)
        }
      );

      return result.data.text;

    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  throw new Error("Unsupported file type");
}