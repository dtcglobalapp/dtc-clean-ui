(function () {
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
        throw new Error("No readable text was extracted from this file.");
      }

      textPreview.textContent = text;

      const parsed = parseVisionDocument(text);
      latestParsed = parsed;

      renderFields(parsed.fields);
      renderWarnings(parsed.warnings);
      autofillDemo(parsed.fields);

      setStatus("Document analyzed successfully and demo form autofilled.");
    } catch (error) {
      console.error("Vision Intake error:", error);
      setStatus(`Error analyzing document: ${error.message || "Unknown error"}`);
    } finally {
      isBusy = false;
      extractBtn.disabled = false;
      fillDemoBtn.disabled = false;
      extractBtn.textContent = "Extract & Analyze";
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
    statusBox.innerHTML = `<p>${escapeHtml(msg)}</p>`;
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

    if (clearStatus) {
      setStatus("Vision Intake ready.");
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
    if (!warnings || !warnings.length) {
      warningsBox.innerHTML = "<div>No warnings</div>";
      return;
    }

    warningsBox.innerHTML = warnings
      .map((w) => `<div>• ${escapeHtml(w)}</div>`)
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
      throw new Error("PDF library was not loaded.");
    }

    setStatus("Loading PDF...");

    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i += 1) {
      setStatus(`Reading PDF page ${i} of ${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str || "").join(" ") + "\n";
    }

    return text;
  }

  async function extractImageText(file) {
    if (!window.Tesseract) {
      throw new Error("OCR library was not loaded.");
    }

    setStatus("Loading OCR...");

    const imageUrl = URL.createObjectURL(file);

    try {
      const result = await window.Tesseract.recognize(imageUrl, "eng", {
        logger: (m) => {
          if (!m || !m.status) return;
          const pct =
            typeof m.progress === "number"
              ? ` ${Math.round(m.progress * 100)}%`
              : "";
          setStatus(`OCR: ${m.status}${pct}`);
        },
      });

      return result?.data?.text || "";
    } catch (error) {
      throw new Error(`OCR failed: ${error.message || "Unknown OCR error"}`);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  function parseVisionDocument(rawText) {
    const source = String(rawText || "");
    const text = source.replace(/\r/g, "");
    const compact = text.replace(/\s+/g, " ").trim();

    const warnings = [];
    const fields = {
      childFirstName: "",
      childLastName: "",
      dob: "",
      gender: "",
      guardianName: "",
      phone: "",
      physician: "",
      allergies: "",
      address: "",
      meals: "",
      attendanceSchedule: "",
      enrollmentDate: "",
    };

    function clean(value = "") {
      return String(value)
        .replace(/\s+/g, " ")
        .replace(/^[:\-\s"'`|>#\\]+/, "")
        .replace(/[:\-\s"'`|>#\\]+$/, "")
        .trim();
    }

    function normalizePhone(value = "") {
      const digits = String(value).replace(/\D/g, "");
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return clean(value);
    }

    function splitName(fullName = "") {
      const cleaned = clean(fullName);
      if (!cleaned) return { first: "", last: "" };
      const parts = cleaned.split(/\s+/);
      if (parts.length === 1) return { first: parts[0], last: "" };
      return {
        first: parts.slice(0, -1).join(" "),
        last: parts.slice(-1)[0],
      };
    }

    function matchFirst(patterns, haystack = compact) {
      for (const pattern of patterns) {
        const match = haystack.match(pattern);
        if (match?.[1]) return clean(match[1]);
      }
      return "";
    }

    let childFullName = matchFirst([
      /#\s*>\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s*>\s*Child Information/i,
      /#\s*>\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s*>\s*Child/i,
    ]);

    if (!childFullName) {
      const reversed = compact.match(/\|\s*([A-Za-z]+),\s*([A-Za-z]+)/i);
      if (reversed?.[1] && reversed?.[2]) {
        childFullName = `${clean(reversed[2])} ${clean(reversed[1])}`;
      }
    }

    if (!childFullName) {
      const firstNameField = compact.match(/\bName:\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s+Name:/i);
      if (firstNameField?.[1]) {
        childFullName = clean(firstNameField[1]);
      }
    }

    if (childFullName) {
      const parts = splitName(childFullName);
      fields.childFirstName = parts.first;
      fields.childLastName = parts.last;
    }

    let guardianName = "";

    const dualName = compact.match(
      /\bName:\s*[A-Za-z]+(?:\s+[A-Za-z]+)+\s+Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i
    );
    if (dualName?.[1]) {
      guardianName = clean(dualName[1]);
    }

    if (!guardianName) {
      guardianName = matchFirst([
        /\bGuardian Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
        /\bParent(?:\/Guardian)? Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
        /\bContact Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
      ]);
    }

    if (
      guardianName &&
      childFullName &&
      guardianName.toLowerCase() === childFullName.toLowerCase()
    ) {
      guardianName = "";
    }

    fields.guardianName = guardianName;

    fields.dob = matchFirst([
      /\bDOB:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
      /\bDate of Birth:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
      /\bBirth Date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    ]);

    fields.gender = matchFirst([
      /\bSex:\s*(Male|Female|M|F)\b/i,
      /\bGender:\s*(Male|Female|M|F|Boy|Girl)\b/i,
      /\bStatus:\s*[A-Za-z ]+\s+Sex:\s*(Male|Female|M|F)\b/i,
    ]);

    let phone = "";

    const primaryPhone = compact.match(
      /\bPhone:\s*Primary\s*[-:]\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i
    );
    if (primaryPhone?.[1]) {
      phone = normalizePhone(primaryPhone[1]);
    }

    if (!phone) {
      const anyPhone = compact.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
      if (anyPhone?.[1]) {
        phone = normalizePhone(anyPhone[1]);
      }
    }

    fields.phone = phone;

    fields.address = matchFirst([
      /\bAddress:\s*(.+?)(?=Pay source:|Withdraw|Race:|Expiration date:|Status:|$)/i,
    ]);

    fields.enrollmentDate = matchFirst([
      /\bEnrollment date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    ]);

    fields.meals = matchFirst([
      /\bMeals:\s*([A-Za-z,\s]+?)(?=Is child of migrant worker:|Special needs:|$)/i,
    ]);

    const attendanceMatches = compact.match(
      /(?:Mo|Tu|We|Th|Fr|Sa|Su):\s*[0-9:AMPamp\s\-]{5,40}/g
    );
    if (attendanceMatches?.length) {
      fields.attendanceSchedule = attendanceMatches.map(clean).join(" | ");
    }

    fields.physician = matchFirst([
      /\bPhysician:\s*([A-Za-z .,'-]{3,100})/i,
      /\bDoctor:\s*([A-Za-z .,'-]{3,100})/i,
      /\bProvider:\s*([A-Za-z .,'-]{3,100})/i,
      /\bPediatrician:\s*([A-Za-z .,'-]{3,100})/i,
    ]);

    if (
      fields.physician &&
      /not related|day care child|breakfast|lunch|pm snack|attendance details|school details/i.test(
        fields.physician
      )
    ) {
      fields.physician = "";
    }

    fields.allergies = matchFirst([
      /\bAllerg(?:y|ies):\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
      /\bFood Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
      /\bKnown Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
    ]);

    if (!fields.allergies && /no known allergies/i.test(compact)) {
      fields.allergies = "No known allergies";
    }

    if (!fields.childFirstName || !fields.childLastName) {
      warnings.push("Child name not confidently detected");
    }

    if (!fields.guardianName) {
      warnings.push("Guardian name not confidently detected");
    }

    if (!fields.phone) {
      warnings.push("Phone not confidently detected");
    }

    if (!fields.dob) {
      warnings.push("DOB not confidently detected");
    }

    if (!/signature|signed|guardian signature|physician signature/i.test(compact)) {
      warnings.push("No signature text detected. Visual signature may still exist.");
    }

    return {
      fields,
      warnings: [...new Set(warnings)],
    };
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();