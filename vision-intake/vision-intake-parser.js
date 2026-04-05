export function parseVisionDocument(rawText) {
  const source = String(rawText || "");
  const text = source.replace(/\r/g, "\n");
  const compact = text.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();

  const warnings = [];
  const unmapped = [];

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
    signaturePresent: false,
    relationToProvider: "",
    specialNeeds: "",
    specialDiet: "",
    paySource: "",
    race: "",
    ethnicity: "",
    rawDocumentTitle: "",
    documentType: "",
  };

  const confidence = {
    childFirstName: 0,
    childLastName: 0,
    dob: 0,
    gender: 0,
    guardianName: 0,
    phone: 0,
    physician: 0,
    allergies: 0,
    address: 0,
    meals: 0,
    attendanceSchedule: 0,
    enrollmentDate: 0,
    signaturePresent: 0,
    relationToProvider: 0,
    specialNeeds: 0,
    specialDiet: 0,
    paySource: 0,
    race: 0,
    ethnicity: 0,
    rawDocumentTitle: 0,
    documentType: 0,
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
    if (parts.length === 1) {
      return { first: parts[0], last: "" };
    }

    return {
      first: parts.slice(0, -1).join(" "),
      last: parts.slice(-1)[0],
    };
  }

  function setField(key, value, score = 0.5) {
    const cleaned = typeof value === "boolean" ? value : clean(value);
    const hasValue = typeof cleaned === "boolean" ? true : Boolean(cleaned);

    if (!hasValue) return;

    if (
      fields[key] === "" ||
      fields[key] === false ||
      score > (confidence[key] || 0)
    ) {
      fields[key] = cleaned;
      confidence[key] = score;
    }
  }

  function pushWarning(message) {
    if (message && !warnings.includes(message)) {
      warnings.push(message);
    }
  }

  function normalizeYesNo(value = "") {
    const v = clean(value).toLowerCase();
    if (["y", "yes"].includes(v)) return "Y";
    if (["n", "no"].includes(v)) return "N";
    return clean(value);
  }

  function matchLabelValue(label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\s*:\\s*(.+?)(?=\\s+[A-Z][A-Za-z /()'-]{1,40}:|$)`, "i");
    const match = compact.match(regex);
    return match?.[1] ? clean(match[1]) : "";
  }

  function getSectionSlice(startLabel, endLabels = []) {
    const startIndex = lower.indexOf(startLabel.toLowerCase());
    if (startIndex === -1) return "";

    let endIndex = compact.length;

    for (const endLabel of endLabels) {
      const idx = lower.indexOf(endLabel.toLowerCase(), startIndex + startLabel.length);
      if (idx !== -1 && idx < endIndex) {
        endIndex = idx;
      }
    }

    return compact.slice(startIndex, endIndex).trim();
  }

  function detectDocumentType() {
    if (lower.includes("child details") && lower.includes("contact")) {
      setField("documentType", "child_information", 0.98);
      return;
    }

    if (lower.includes("child information")) {
      setField("documentType", "child_information", 0.95);
      return;
    }

    if (lower.includes("enrollment")) {
      setField("documentType", "enrollment_form", 0.8);
      return;
    }

    if (lower.includes("medical") || lower.includes("physician") || lower.includes("allerg")) {
      setField("documentType", "medical_form", 0.65);
      return;
    }

    setField("documentType", "unknown", 0.2);
  }

  function detectChildAndGuardianNamesFromSections() {
    const childSection = getSectionSlice("child details", ["contact", "attendance details", "school details"]);
    const contactSection = getSectionSlice("contact", ["attendance details", "school details"]);

    if (childSection) {
      const childName = childSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] || "";
      if (childName) {
        const parts = splitName(childName);
        setField("childFirstName", parts.first, 0.99);
        setField("childLastName", parts.last, 0.99);
      }
    }

    if (contactSection) {
      const guardianName = contactSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] || "";
      if (guardianName) {
        setField("guardianName", guardianName, 0.99);
      }
    }
  }

  function detectChildNameFallback() {
    if (fields.childFirstName || fields.childLastName) return;

    const childDetailsSection = getSectionSlice("child details", ["contact", "attendance details", "school details"]);
    const fallbackName = childDetailsSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1]
      || compact.match(/\bChild Name:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1]
      || "";

    if (!fallbackName) {
      pushWarning("Child name not confidently detected");
      return;
    }

    const parts = splitName(fallbackName);
    setField("childFirstName", parts.first, 0.9);
    setField("childLastName", parts.last, 0.9);
  }

  function detectGuardianNameFallback() {
    if (fields.guardianName) return;

    const contactSection = getSectionSlice("contact", ["attendance details", "school details"]);
    let guardianName =
      contactSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
      compact.match(/\bGuardian Name:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
      compact.match(/\bParent(?:\/Guardian)? Name:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
      compact.match(/\bMother(?:'s)? Name:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
      compact.match(/\bFather(?:'s)? Name:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
      "";

    const childFull = `${fields.childFirstName} ${fields.childLastName}`.trim().toLowerCase();
    if (guardianName && guardianName.toLowerCase() === childFull) {
      guardianName = "";
    }

    if (!guardianName) {
      pushWarning("Guardian name not confidently detected");
      return;
    }

    setField("guardianName", guardianName, 0.88);
  }

  function detectDob() {
    const dob =
      compact.match(/\bDOB:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i)?.[1] ||
      compact.match(/\bDate of Birth:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i)?.[1] ||
      "";

    if (!dob) {
      pushWarning("DOB not confidently detected");
      return;
    }

    setField("dob", dob, 0.98);
  }

  function detectGender() {
    const raw =
      compact.match(/\bSex:\s*(Male|Female|M|F)\b/i)?.[1] ||
      compact.match(/\bGender:\s*(Male|Female|M|F|Boy|Girl)\b/i)?.[1] ||
      "";

    if (!raw) return;

    const normalized =
      ["male", "m", "boy"].includes(raw.toLowerCase()) ? "M" :
      ["female", "f", "girl"].includes(raw.toLowerCase()) ? "F" :
      raw;

    setField("gender", normalized, 0.95);
  }

  function detectPhone() {
    const contactSection = getSectionSlice("contact", ["attendance details", "school details"]);
    const phoneRaw =
      contactSection.match(/\bPrimary\s*-\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i)?.[1] ||
      contactSection.match(/\bPhone:\s*(?:Primary\s*-\s*)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i)?.[1] ||
      compact.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/)?.[1] ||
      "";

    if (!phoneRaw) {
      pushWarning("Phone not confidently detected");
      return;
    }

    setField("phone", normalizePhone(phoneRaw), 0.95);
  }

  function detectAddress() {
    const contactSection = getSectionSlice("contact", ["attendance details", "school details"]);
    const address =
      contactSection.match(/\bAddress:\s*(.+?)(?=\s+[A-Z][A-Za-z /()'-]{1,40}:|$)/i)?.[1] ||
      compact.match(/\bAddress:\s*(.+?)(?=\s+[A-Z][A-Za-z /()'-]{1,40}:|$)/i)?.[1] ||
      "";

    if (address) {
      setField("address", address, 0.95);
    }
  }

  function detectEnrollmentDate() {
    const value =
      compact.match(/\bEnrollment date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i)?.[1] ||
      "";

    if (value) {
      setField("enrollmentDate", value, 0.92);
    }
  }

  function detectMeals() {
    const attendanceSection = getSectionSlice("attendance details", ["school details"]);
    const value =
      attendanceSection.match(/\bMeals:\s*(.+?)(?=\s+[A-Z][A-Za-z /()?-]{1,50}:|$)/i)?.[1] ||
      "";

    if (value) {
      setField("meals", value, 0.9);
    }
  }

  function detectAttendance() {
    const attendanceSection = getSectionSlice("attendance details", ["school details"]);
    const matches = attendanceSection.match(
      /(?:Mo|Tu|We|Th|Fr|Sa|Su):\s*[0-9:AMPamp\s\-]{5,40}/g
    );

    if (matches?.length) {
      setField("attendanceSchedule", matches.map(clean).join(" | "), 0.88);
      return;
    }

    const rows = [...attendanceSection.matchAll(/\b(Mo|Tu|We|Th|Fr|Sa|Su):\s*([0-9: ]+[AP]M\s*-\s*[0-9: ]+[AP]M)/gi)];
    if (rows.length) {
      setField(
        "attendanceSchedule",
        rows.map((m) => `${m[1]}: ${clean(m[2])}`).join(" | "),
        0.88
      );
    }
  }

  function detectRelationToProvider() {
    const value = matchLabelValue("Relation to provider");
    if (value) {
      setField("relationToProvider", value, 0.88);
    }
  }

  function detectSpecialNeeds() {
    const value =
      compact.match(/\bSpecial needs:\s*([YN]|Yes|No)\b/i)?.[1] ||
      "";

    if (value) {
      setField("specialNeeds", normalizeYesNo(value), 0.86);
    }
  }

  function detectSpecialDiet() {
    const value =
      compact.match(/\bSpecial diet:\s*([YN]|Yes|No)\b/i)?.[1] ||
      "";

    if (value) {
      setField("specialDiet", normalizeYesNo(value), 0.86);
    }
  }

  function detectPaySource() {
    const value = matchLabelValue("Pay source");
    if (value) {
      setField("paySource", value, 0.88);
    }
  }

  function detectRace() {
    const value = matchLabelValue("Race");
    if (value) {
      setField("race", value, 0.86);
    }
  }

  function detectEthnicity() {
    const value = matchLabelValue("Ethnicity");
    if (value) {
      setField("ethnicity", value, 0.86);
    }
  }

  function detectPhysician() {
    const value =
      compact.match(/\bPhysician:\s*([A-Za-z .,'-]{3,100})/i)?.[1] ||
      compact.match(/\bDoctor:\s*([A-Za-z .,'-]{3,100})/i)?.[1] ||
      compact.match(/\bPediatrician:\s*([A-Za-z .,'-]{3,100})/i)?.[1] ||
      "";

    if (value) {
      setField("physician", value, 0.78);
    }
  }

  function detectAllergies() {
    let value =
      compact.match(/\bAllerg(?:y|ies):\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i)?.[1] ||
      compact.match(/\bFood Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i)?.[1] ||
      "";

    if (!value && /no known allergies/i.test(compact)) {
      value = "No known allergies";
    }

    if (value) {
      setField("allergies", value, 0.82);
    }
  }

  function detectSignaturePresent() {
    const present = /signature|signed|guardian signature|physician signature/i.test(compact);
    fields.signaturePresent = present;
    confidence.signaturePresent = present ? 0.7 : 0.15;
  }

  function detectUnmapped() {
    const knownLabels = [
      "name",
      "dob",
      "enrollment date",
      "participates in cacfp",
      "pay source",
      "race",
      "ethnicity",
      "sex",
      "relation to provider",
      "is child of migrant worker",
      "special needs",
      "special diet",
      "phone",
      "email",
      "address",
      "meals",
      "will pick up and drop off times vary",
      "will days vary weekly",
      "overnight child",
      "days in care",
      "school district",
      "school name",
      "grade/level",
      "days in school",
      "depart time",
      "return time",
      "attendance details",
      "child details",
      "contact",
      "school details"
    ];

    const lines = text
      .split("\n")
      .map((line) => clean(line))
      .filter(Boolean);

    for (const line of lines) {
      const low = line.toLowerCase();
      const isKnown = knownLabels.some((label) => low.includes(label));
      const isNoise = low.length < 3;

      if (!isKnown && !isNoise) {
        unmapped.push(line);
      }
    }
  }

  detectDocumentType();
  detectChildAndGuardianNamesFromSections();
  detectChildNameFallback();
  detectGuardianNameFallback();
  detectDob();
  detectGender();
  detectPhone();
  detectAddress();
  detectEnrollmentDate();
  detectMeals();
  detectAttendance();
  detectRelationToProvider();
  detectSpecialNeeds();
  detectSpecialDiet();
  detectPaySource();
  detectRace();
  detectEthnicity();
  detectPhysician();
  detectAllergies();
  detectSignaturePresent();
  detectUnmapped();

  const visibleFields = buildVisibleFields(fields, confidence, fields.documentType);
  const hiddenFields = buildHiddenFields(fields, visibleFields);
  const confidenceBands = buildConfidenceBands(confidence);

  return {
    documentType: fields.documentType || "unknown",
    fields,
    visibleFields,
    hiddenFields,
    confidence,
    confidenceBands,
    warnings: [...new Set(warnings)],
    unmapped,
  };
}

function buildVisibleFields(fields, confidence, documentType) {
  const template = getFormTemplate(documentType);
  const result = {};

  for (const key of template.visible) {
    if (
      fields[key] !== undefined &&
      fields[key] !== "" &&
      fields[key] !== false
    ) {
      result[key] = {
        value: fields[key],
        confidence: confidence[key] || 0,
      };
    }
  }

  return result;
}

function buildHiddenFields(fields, visibleFields) {
  const result = {};

  for (const [key, value] of Object.entries(fields)) {
    if (visibleFields[key]) continue;
    if (value === "" || value === false) continue;
    result[key] = value;
  }

  return result;
}

function buildConfidenceBands(confidence) {
  const high = [];
  const medium = [];
  const low = [];

  for (const [key, value] of Object.entries(confidence)) {
    if (!value) continue;
    if (value >= 0.85) high.push(key);
    else if (value >= 0.6) medium.push(key);
    else low.push(key);
  }

  return { high, medium, low };
}

function getFormTemplate(documentType) {
  const templates = {
    child_information: {
      visible: [
        "childFirstName",
        "childLastName",
        "dob",
        "gender",
        "guardianName",
        "phone",
        "physician",
        "allergies",
        "address",
        "meals",
        "enrollmentDate",
        "attendanceSchedule",
      ],
    },
    enrollment_form: {
      visible: [
        "childFirstName",
        "childLastName",
        "dob",
        "guardianName",
        "phone",
        "address",
        "enrollmentDate",
        "meals",
        "attendanceSchedule",
        "paySource",
      ],
    },
    medical_form: {
      visible: [
        "childFirstName",
        "childLastName",
        "dob",
        "physician",
        "allergies",
        "signaturePresent",
      ],
    },
    unknown: {
      visible: [
        "childFirstName",
        "childLastName",
        "dob",
        "guardianName",
        "phone",
        "address",
      ],
    },
  };

  return templates[documentType] || templates.unknown;
}