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

extractBtn.addEventListener("click", async () => {
  const file = docInput.files?.[0];
  if (!file) {
    alert("Please choose a PDF or image first.");
    return;
  }

  try {
    setStatus("Reading document...");
    clearOutput();

    const text = await extractDocumentText(file);

    if (!text.trim()) {
      setStatus("No readable text extracted.");
      return;
    }

    const parsed = parseVisionDocument(text);
    latestParsed = parsed;

    renderFields(parsed.fields);
    renderWarnings(parsed.warnings);
    textPreview.textContent = text.slice(0, 5000);

    setStatus("Document analyzed successfully.");
  } catch (error) {
    console.error("Vision intake error:", error);
    setStatus(`Analysis failed: ${error.message || "Unknown error"}`);
  }
});

fillDemoBtn.addEventListener("click", () => {
  if (!latestParsed) {
    alert("Analyze a document first.");
    return;
  }

  const { fields } = latestParsed;

  demoFirstName.value = fields.childFirstName || "";
  demoLastName.value = fields.childLastName || "";
  demoDob.value = fields.dob || "";
  demoGender.value = fields.gender || "";
  demoGuardian.value = fields.guardianName || "";
  demoPhone.value = fields.phone || "";
  demoPhysician.value = fields.physician || "";
  demoAllergies.value = fields.allergies || "";

  setStatus("Demo form autofilled from detected fields.");
});

function setStatus(message) {
  statusBox.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function clearOutput() {
  fieldsBox.innerHTML = "";
  warningsBox.innerHTML = "";
  textPreview.textContent = "";
  latestParsed = null;
}

function renderFields(fields) {
  const rows = [
    ["Child First Name", fields.childFirstName],
    ["Child Last Name", fields.childLastName],
    ["DOB", fields.dob],
    ["Gender", fields.gender],
    ["Guardian", fields.guardianName],
    ["Phone", fields.phone],
    ["Physician", fields.physician],
    ["Allergies", fields.allergies],
    ["Address", fields.address],
    ["Meals", fields.meals],
    ["Enrollment Date", fields.enrollmentDate],
    ["Attendance", fields.attendanceSchedule],
  ];

  fieldsBox.innerHTML = rows
    .map(([label, value]) => {
      const safeValue = value ? escapeHtml(value) : "<em>Not detected</em>";
      return `<div><strong>${escapeHtml(label)}:</strong> ${safeValue}</div>`;
    })
    .join("");
}

function renderWarnings(warnings) {
  if (!warnings?.length) {
    warningsBox.innerHTML = `<p>No warnings detected.</p>`;
    return;
  }

  warningsBox.innerHTML = `
    <ul style="margin:0; padding-left:18px;">
      ${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

async function extractDocumentText(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (file.type.startsWith("image/")) {
    return extractImageTextWithOCR(file);
  }

  throw new Error("Unsupported file type. Please upload a PDF or image.");
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();

  let pdfjsLib;
  try {
    pdfjsLib = await import("https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs");
  } catch (error) {
    throw new Error("Could not load PDF reader module.");
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str || "");
    fullText += strings.join(" ") + "\n";
  }

  return fullText.trim();
}

async function extractImageTextWithOCR(file) {
  let Tesseract;

  try {
    const module = await import(
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"
    );
    Tesseract = module.default;
  } catch (error) {
    throw new Error("Could not load OCR engine.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const { data } = await Tesseract.recognize(imageUrl, "eng", {
      logger: () => {},
    });

    return data?.text || "";
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}