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

  const text = await extractTextFromPDF(file);

  const result = analyzeDocumentText(text);

  renderResult(result);
});

async function extractTextFromPDF(file) {

  const arrayBuffer = await file.arrayBuffer();

  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs");

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const strings = content.items.map(item => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText.toLowerCase();
}

function renderResult(result) {

  if (!result.issues.length) {
    resultBox.innerHTML = `
      <div class="dtc-success">
        ✅ Document looks good
      </div>
    `;
    return;
  }

  resultBox.innerHTML = `
    <div class="dtc-alert">
      ⚠️ Issues detected:
      <ul>
        ${result.issues.map(i => `<li>${i}</li>`).join("")}
      </ul>
    </div>
  `;
}