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

  function splitPersonName(fullName = "") {
    const cleaned = clean(fullName)
      .replace(/\b(primary|secondary)\b/gi, "")
      .replace(/\b(dob|date of birth|phone|address|email)\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return { first: "", last: "" };

    const parts = cleaned.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return { first: parts[0], last: "" };
    }

    return {
      first: parts[0],
      last: parts.slice(1).join(" "),
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

  function matchAfterLabel(label, haystack = compact) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `\\b${escaped}\\s*:\\s*(.+?)(?=\\s+(?:[A-Z][A-Za-z /()'&.-]{1,40}:|Mo:|Tu:|We:|Th:|Fr:|Sa:|Su:)|$)`,
      "i"
    );
    const match = haystack.match(regex);
    return match?.[1] ? clean(match[1]) : "";
  }

  function detectDocumentType() {
    if (lower.includes("child details") && lower.includes("contact")) {
      setField("documentType", "child_information", 0.99);
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

  function detectNames() {
    const childSection = getSectionSlice("child details", ["contact", "attendance details", "school details"]);
    const contactSection = getSectionSlice("contact", ["attendance details", "school details"]);

    let childFullName = "";
    let guardianFullName = "";

    if (childSection) {
      childFullName =
        childSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
        "";
    }

    if (contactSection) {
      guardianFullName =
        contactSection.match(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/i)?.[1] ||
        "";
    }

    if (!childFullName || !guardianFullName) {
      const allNames = [...compact.matchAll(/\bName:\s*([A-Z][A-Za-z'.,-]+(?:\s+[A-Z][A-Za-z'.,-]+){1,5})/g)]
        .map((m) => clean(m[1]))
        .filter(Boolean);

      if (!childFullName && allNames.length >= 1) {
        childFullName = allNames[0];
      }

      if (!guardianFullName && allNames.length >= 2) {
        guardianFullName = allNames[1];
      }
    }

    if (childFullName) {
      const child = splitPersonName(childFullName);
      setField("childFirstName", child.first, 0.99);
      setField("childLastName", child.last, 0.99);
    } else {
      pushWarning("Child name not confidently detected");
    }

    if (guardianFullName) {
      const guardian = splitPersonName(guardianFullName);
      const guardianJoined = clean(`${guardian.first} ${guardian.last}`);
      const childJoined = clean(`${fields.childFirstName} ${fields.childLastName}`).toLowerCase();

      if (guardianJoined && guardianJoined.toLowerCase() !== childJoined) {
        setField("guardianName", guardianJoined, 0.99);
      }
    } else {
      pushWarning("Guardian name not confidently detected");
    }
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
      contactSection.match(/\bSecondary\s*-\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i)?.[1] ||
      compact.match(/\bPrimary\s*-\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i)?.[1] ||
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
      matchAfterLabel("Address", contactSection) ||
      matchAfterLabel("Address") ||
      "";

    if (address) {
      setField("address", address, 0.95);
    }
  }

  function detectEnrollmentDate() {
    const value = matchAfterLabel("Enrollment date");
    if (value) {
      setField("enrollmentDate", value, 0.92);
    }
  }

  function detectMeals() {
    const attendanceSection = getSectionSlice("attendance details", ["school details"]);
    const value = matchAfterLabel("Meals", attendanceSection);
    if (value) {
      setField("meals", value, 0.9);
    }
  }

  function detectAttendance() {
    const attendanceSection = getSectionSlice("attendance details", ["school details"]);
    const rows = [...attendanceSection.matchAll(/\b(Mo|Tu|We|Th|Fr|Sa|Su):\s*([0-9: ]+[AP]M\s*-\s*[0-9: ]+[AP]M)/gi)];

    if (rows.length) {
      setField(
        "attendanceSchedule",
        rows.map((m) => `${m[1]}: ${clean(m[2])}`).join(" | "),
        0.9
      );
    }
  }

  function detectRelationToProvider() {
    const value = matchAfterLabel("Relation to provider");
    if (value) setField("relationToProvider", value, 0.88);
  }

  function detectSpecialNeeds() {
    const value = compact.match(/\bSpecial needs:\s*([YN]|Yes|No)\b/i)?.[1] || "";
    if (value) setField("specialNeeds", normalizeYesNo(value), 0.86);
  }

  function detectSpecialDiet() {
    const value = compact.match(/\bSpecial diet:\s*([YN]|Yes|No)\b/i)?.[1] || "";
    if (value) setField("specialDiet", normalizeYesNo(value), 0.86);
  }

  function detectPaySource() {
    const value = matchAfterLabel("Pay source");
    if (value) setField("paySource", value, 0.88);
  }

  function detectRace() {
    const value = matchAfterLabel("Race");
    if (value) setField("race", value, 0.86);
  }

  function detectEthnicity() {
    const value = matchAfterLabel("Ethnicity");
    if (value) setField("ethnicity", value, 0.86);
  }

  function detectPhysician() {
    const value =
      matchAfterLabel("Physician") ||
      matchAfterLabel("Doctor") ||
      matchAfterLabel("Pediatrician") ||
      "";

    if (value) {
      setField("physician", value, 0.78);
    }
  }

  function detectAllergies() {
    let value =
      matchAfterLabel("Allergies") ||
      matchAfterLabel("Allergy") ||
      matchAfterLabel("Food Allergies") ||
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
      "days in care",
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
  detectNames();
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
        "address"
      ],
    },
    enrollment_form: {
      visible: [
        "childFirstName",
        "childLastName",
        "dob",
        "gender",
        "guardianName",
        "phone",
        "address",
        "enrollmentDate"
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