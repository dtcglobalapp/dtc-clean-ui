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
  const file = docInput.files?.[0];
  if (!file) {
    alert("Please choose a PDF or image first.");
    return;
  }

  if (isBusy) return;

  try {
    isBusy = true;
    extractBtn.disabled = true;
    fillDemoBtn.disabled = true;

    setStatus(`Reading document: ${escapeHtml(file.name)}`);
    clearOutput(false);

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

    autofillDemo(parsed.fields);

    setStatus("Document analyzed successfully and demo form autofilled.");
  } catch (error) {
    console.error("Vision intake error:", error);
    setStatus(`Analysis failed: ${error.message || "Unknown error"}`);
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
  setStatus("Demo form autofilled from detected fields.");
});

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

function setStatus(message) {
  statusBox.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function clearOutput(clearStatus = true) {
  fieldsBox.innerHTML = "";
  warningsBox.innerHTML = "";
  textPreview.textContent = "";
  latestParsed = null;

  demoFirstName.value = "";
  demoLastName.value = "";
  demoDob.value = "";
  demoGender.value = "";
  demoGuardian.value = "";
  demoPhone.value = "";
  demoPhysician.value = "";
  demoAllergies.value = "";

  if (clearStatus) {
    setStatus("Waiting for document...");
  }
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
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";

  if (name.endsWith(".pdf") || type === "application/pdf") {
    return extractPdfText(file);
  }

  if (type.startsWith("image/")) {
    return extractImageTextWithOCR(file);
  }

  throw new Error("Unsupported file type. Please upload a PDF or image.");
}

async function extractPdfText(file) {
  setStatus("Loading PDF reader...");

  const arrayBuffer = await file.arrayBuffer();

  let pdfjsLib;
  try {
    pdfjsLib = await import("https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs");
  } catch (error) {
    throw new Error("Could not load PDF reader module.");
  }

  setStatus("Reading PDF pages...");

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i += 1) {
    setStatus(`Reading PDF page ${i} of ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str || "");
    fullText += strings.join(" ") + "\n";
  }

  return fullText.trim();
}

async function extractImageTextWithOCR(file) {
  setStatus("Loading OCR engine...");

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
    setStatus("Preparing image for OCR...");

    const ocrPromise = Tesseract.recognize(imageUrl, "eng", {
      logger: (message) => {
        if (!message) return;
        if (message.status) {
          const pct =
            typeof message.progress === "number"
              ? ` ${Math.round(message.progress * 100)}%`
              : "";
          setStatus(`OCR: ${message.status}${pct}`);
        }
      },
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("OCR timed out. Try a clearer image or smaller screenshot."));
      }, 45000);
    });

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    return result?.data?.text || "";
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