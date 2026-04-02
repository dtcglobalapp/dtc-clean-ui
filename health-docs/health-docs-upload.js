import { analyzeDocumentText } from "./health-docs-analyzer.js";

const input = document.getElementById("pdfInput");
const btn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");

btn.addEventListener("click", async () => {
  if (!input.files.length) {
    alert("Please upload a PDF first.");
    return;
  }

  const file = input.files[0];

  try {
    btn.disabled = true;
    btn.textContent = "Analyzing...";

    const text = await extractTextFromPDF(file);
    const result = analyzeDocumentText(text);

    renderResult(result, text);
  } catch (error) {
    console.error("Health docs analyze error:", error);
    resultBox.innerHTML = `
      <div class="dtc-card">
        <p><strong>Analysis failed:</strong> ${escapeHtml(error.message || "Unknown error")}</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = "Analyze Document";
  }
});

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs");
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(title, items, toneClass) {
  if (!items?.length) return "";
  return `
    <div class="dtc-card" style="margin-top:12px;">
      <h3>${escapeHtml(title)}</h3>
      <ul style="margin:10px 0 0 18px;">
        ${items.map((item) => `<li class="${toneClass || ""}">${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderResult(result, text) {
  const preview = escapeHtml(text.slice(0, 1500));

  resultBox.innerHTML = `
    <div class="dtc-card">
      <h3>${result.ok ? "✅ Document review completed" : "⚠️ Document review completed with issues"}</h3>
      <p style="margin-top:10px;">
        This is an intelligent first-pass review. Always confirm the document visually before making compliance decisions.
      </p>
    </div>

    ${renderList("Detected items", result.found, "dtc-success")}
    ${renderList("Warnings", result.warnings, "dtc-warning")}
    ${renderList("Issues", result.issues, "dtc-danger")}

    <div class="dtc-card" style="margin-top:12px;">
      <h3>Extracted text preview</h3>
      <pre style="white-space:pre-wrap; word-break:break-word; margin-top:10px;">${preview}</pre>
    </div>
  `;
}