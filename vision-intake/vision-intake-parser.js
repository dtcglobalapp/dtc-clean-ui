export function parseVisionDocument(rawText) {
  const source = String(rawText || "");
  const text = source.replace(/\r/g, "");
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

  function matchFirst(patterns, haystack = compact) {
    for (const pattern of patterns) {
      const match = haystack.match(pattern);
      if (match?.[1]) return clean(match[1]);
    }
    return "";
  }

  function setField(key, value, score = 0.5) {
    const cleaned = typeof value === "boolean" ? value : clean(value);
    const hasValue = typeof cleaned === "boolean" ? cleaned : Boolean(cleaned);

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

  function detectDocumentType() {
    if (lower.includes("child information")) {
      setField("documentType", "child_information", 0.95);
      return;
    }

    if (lower.includes("enrollment") || lower.includes("enrollment form")) {
      setField("documentType", "enrollment_form", 0.8);
      return;
    }

    if (lower.includes("medical") || lower.includes("physician") || lower.includes("allerg")) {
      setField("documentType", "medical_form", 0.65);
      return;
    }

    setField("documentType", "unknown", 0.2);
  }

  function detectRawTitle() {
    const title = matchFirst([
      /#\s*>\s*([A-Za-z]+(?:\s+[A-Za-z]+)+\s*>\s*Child Information)/i,
      /([A-Za-z]+(?:\s+[A-Za-z]+)+\s*>\s*Child Information)/i,
      /([A-Za-z]+(?:\s+[A-Za-z]+)+\s*>\s*Child)/i,
    ]);

    if (title) {
      setField("rawDocumentTitle", title, 0.9);
      return;
    }

    if (lower.includes("child information")) {
      setField("rawDocumentTitle", "Child Information", 0.4);
    }
  }

  function detectChildName() {
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

    if (!childFullName) {
      const alt = matchFirst([
        /\bChild Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
        /\bStudent Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
      ]);
      if (alt) childFullName = alt;
    }

    if (!childFullName) {
      pushWarning("Child name not confidently detected");
      return;
    }

    const parts = splitName(childFullName);
    setField("childFirstName", parts.first, 0.95);
    setField("childLastName", parts.last, 0.95);
  }

  function detectGuardianName() {
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
        /\bMother(?:'s)? Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
        /\bFather(?:'s)? Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i,
      ]);
    }

    const childFull = `${fields.childFirstName} ${fields.childLastName}`.trim().toLowerCase();
    if (guardianName && guardianName.toLowerCase() === childFull) {
      guardianName = "";
    }

    if (!guardianName) {
      pushWarning("Guardian name not confidently detected");
      return;
    }

    guardianName = guardianName
      .replace(/\bDOB\b.*$/i, "")
      .replace(/\bPhone\b.*$/i, "")
      .trim();

    setField("guardianName", guardianName, 0.92);
  }

  function detectDob() {
    const dob = matchFirst([
      /\bDOB:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
      /\bDate of Birth:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
      /\bBirth Date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    ]);

    if (!dob) {
      pushWarning("DOB not confidently detected");
      return;
    }

    setField("dob", dob, 0.98);
  }

  function detectGender() {
    const gender = matchFirst([
      /\bSex:\s*(Male|Female|M|F)\b/i,
      /\bGender:\s*(Male|Female|M|F|Boy|Girl)\b/i,
      /\bStatus:\s*[A-Za-z ]+\s+Sex:\s*(Male|Female|M|F)\b/i,
    ]);

    if (!gender) return;

    const normalized = ["male", "m", "boy"].includes(gender.toLowerCase()) ? "M"
      : ["female", "f", "girl"].includes(gender.toLowerCase()) ? "F"
      : gender;

    setField("gender", normalized, 0.9);
  }

  function detectPhone() {
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

    if (!phone) {
      pushWarning("Phone not confidently detected");
      return;
    }

    setField("phone", phone, 0.88);
  }

  function detectPhysician() {
    let physician = matchFirst([
      /\bPhysician:\s*([A-Za-z .,'-]{3,100})/i,
      /\bDoctor:\s*([A-Za-z .,'-]{3,100})/i,
      /\bProvider:\s*([A-Za-z .,'-]{3,100})/i,
      /\bPediatrician:\s*([A-Za-z .,'-]{3,100})/i,
    ]);

    if (
      physician &&
      /not related|day care child|breakfast|lunch|pm snack|attendance details|school details/i.test(
        physician
      )
    ) {
      physician = "";
    }

    if (physician) {
      setField("physician", physician, 0.8);
    }
  }

  function detectAllergies() {
    let allergies = matchFirst([
      /\bAllerg(?:y|ies):\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
      /\bFood Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
      /\bKnown Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
    ]);

    if (!allergies && /no known allergies/i.test(compact)) {
      allergies = "No known allergies";
    }

    if (allergies) {
      setField("allergies", allergies, 0.85);
    }
  }

  function detectAddress() {
    const address = matchFirst([
      /\bAddress:\s*(.+?)(?=Pay source:|Withdraw|Race:|Expiration date:|Status:|$)/i,
    ]);

    if (address) {
      setField("address", address, 0.9);
    }
  }

  function detectEnrollmentDate() {
    const enrollmentDate = matchFirst([
      /\bEnrollment date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    ]);

    if (enrollmentDate) {
      setField("enrollmentDate", enrollmentDate, 0.9);
    }
  }

  function detectMeals() {
    const meals = matchFirst([
      /\bMeals:\s*([A-Za-z,\s]+?)(?=Is child of migrant worker:|Special needs:|$)/i,
    ]);

    if (meals) {
      setField("meals", meals, 0.88);
    }
  }

  function detectAttendance() {
    const attendanceMatches = compact.match(
      /(?:Mo|Tu|We|Th|Fr|Sa|Su):\s*[0-9:AMPamp\s\-]{5,40}/g
    );

    if (attendanceMatches?.length) {
      const cleaned = attendanceMatches.map(clean).join(" | ");
      setField("attendanceSchedule", cleaned, 0.85);
    }
  }

  function detectRelationToProvider() {
    const value = matchFirst([
      /\bRelation to provider:\s*(.+?)(?=Meals:|Is child of migrant worker:|Special needs:|$)/i,
    ]);

    if (value) {
      setField("relationToProvider", value, 0.82);
    }
  }

  function detectSpecialNeeds() {
    const value = matchFirst([
      /\bSpecial needs:\s*([YN]|Yes|No)\b/i,
    ]);

    if (value) {
      setField("specialNeeds", normalizeYesNo(value), 0.82);
    }
  }

  function detectSpecialDiet() {
    const value = matchFirst([
      /\bSpecial diet:\s*([YN]|Yes|No)\b/i,
    ]);

    if (value) {
      setField("specialDiet", normalizeYesNo(value), 0.82);
    }
  }

  function detectPaySource() {
    const value = matchFirst([
      /\bPay source:\s*(.+?)(?=Withdraw|Race:|Expiration date:|Status:|$)/i,
    ]);

    if (value) {
      setField("paySource", value, 0.84);
    }
  }

  function detectRace() {
    const value = matchFirst([
      /\bRace:\s*(.+?)(?=Expiration date:|Ethnicity:|Status:|$)/i,
    ]);

    if (value) {
      setField("race", value, 0.82);
    }
  }

  function detectEthnicity() {
    const value = matchFirst([
      /\bEthnicity:\s*(.+?)(?=Status:|Enrollment Form|$)/i,
    ]);

    if (value) {
      setField("ethnicity", value, 0.82);
    }
  }

  function detectSignaturePresent() {
    const present = /signature|signed|guardian signature|physician signature/i.test(compact);
    fields.signaturePresent = present;
    confidence.signaturePresent = present ? 0.7 : 0.15;

    if (!present) {
      pushWarning("No signature text detected. Visual signature may still exist.");
    }
  }

  function detectUnmapped() {
    const knownLabels = [
      "name",
      "dob",
      "date of birth",
      "birth date",
      "phone",
      "address",
      "pay source",
      "race",
      "ethnicity",
      "status",
      "sex",
      "gender",
      "enrollment date",
      "relation to provider",
      "meals",
      "special needs",
      "special diet",
      "physician",
      "doctor",
      "provider",
      "pediatrician",
      "allergy",
      "allergies",
      "food allergies",
      "known allergies",
      "school district",
      "school name",
      "grade/level",
      "days in school",
      "depart time",
      "return time",
      "is child of migrant worker",
      "overnight child",
      "developmentally ready for solid foods",
    ];

    const lines = text
      .split("\n")
      .map((line) => clean(line))
      .filter(Boolean);

    for (const line of lines) {
      const low = line.toLowerCase();
      const isKnown = knownLabels.some((label) => low.includes(label));
      const isNoise =
        low.length < 3 ||
        low === "i email:" ||
        low === "withdraw" ||
        /^#/.test(low);

      if (!isKnown && !isNoise) {
        unmapped.push(line);
      }
    }
  }

  function normalizeYesNo(value = "") {
    const v = clean(value).toLowerCase();
    if (["y", "yes"].includes(v)) return "Y";
    if (["n", "no"].includes(v)) return "N";
    return clean(value);
  }

  detectDocumentType();
  detectRawTitle();
  detectChildName();
  detectGuardianName();
  detectDob();
  detectGender();
  detectPhone();
  detectPhysician();
  detectAllergies();
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