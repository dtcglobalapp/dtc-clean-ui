export function parseVisionDocument(rawText) {
  const source = String(rawText || "");
  const text = source.replace(/\r/g, "");
  const compact = text.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();

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

  // =========================
  // CHILD NAME
  // Format:
  // # > Kaylee Rojas > Child Information
  // =========================
  let childFullName = matchFirst([
    /#\s*>\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s*>\s*Child Information/i,
    /#\s*>\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s*>\s*Child/i,
  ]);

  // fallback:
  // « | Rojas, Kaylee vo»
  if (!childFullName) {
    const reversed = compact.match(/\|\s*([A-Za-z]+),\s*([A-Za-z]+)/i);
    if (reversed?.[1] && reversed?.[2]) {
      childFullName = `${clean(reversed[2])} ${clean(reversed[1])}`;
    }
  }

  // fallback:
  // Name: Kaylee Rojas Name: Yokasta Santana Tiburcio
  if (!childFullName) {
    const firstNameField = compact.match(/\bName:\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s+Name:/i);
    if (firstNameField?.[1]) {
      childFullName = clean(firstNameField[1]);
    }
  }

  if (childFullName) {
    const nameParts = splitName(childFullName);
    fields.childFirstName = nameParts.first;
    fields.childLastName = nameParts.last;
  } else {
    warnings.push("Child name not confidently detected");
  }

  // =========================
  // GUARDIAN NAME
  // second Name: in same line
  // =========================
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

  if (!fields.guardianName) {
    warnings.push("Guardian name not confidently detected");
  }

  // =========================
  // DOB
  // =========================
  fields.dob = matchFirst([
    /\bDOB:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /\bDate of Birth:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
    /\bBirth Date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ]);

  if (!fields.dob) {
    warnings.push("DOB not confidently detected");
  }

  // =========================
  // GENDER
  // =========================
  fields.gender = matchFirst([
    /\bSex:\s*(Male|Female|M|F)\b/i,
    /\bGender:\s*(Male|Female|M|F|Boy|Girl)\b/i,
    /\bStatus:\s*[A-Za-z ]+\s+Sex:\s*(Male|Female|M|F)\b/i,
  ]);

  // =========================
  // PHONE
  // Format:
  // Phone: Primary - (917) 478-5898
  // "Secondary - (917) 478-5898
  // =========================
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

  if (!fields.phone) {
    warnings.push("Phone not confidently detected");
  }

  // =========================
  // ADDRESS
  // Format:
  // Address: 600w 189 st Apt 4F, New York, NY, 10040
  // =========================
  fields.address = matchFirst([
    /\bAddress:\s*([^]+?)(?=Pay source:|Withdraw|Race:|Expiration date:|Status:|$)/i,
  ]);

  // =========================
  // ENROLLMENT DATE
  // =========================
  fields.enrollmentDate = matchFirst([
    /\bEnrollment date:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})/i,
  ]);

  // =========================
  // MEALS
  // Format:
  // Meals: Breakfast, Lunch, PM Snack
  // =========================
  fields.meals = matchFirst([
    /\bMeals:\s*([A-Za-z,\s]+?)(?=Is child of migrant worker:|Special needs:|$)/i,
  ]);

  // =========================
  // ATTENDANCE
  // Format:
  // Mo: 12:30 PM - 06:00 PM
  // Tu: ...
  // =========================
  const attendanceMatches = compact.match(
    /(?:Mo|Tu|We|Th|Fr|Sa|Su):\s*[0-9:AMPamp\s\-]{5,40}/g
  );
  if (attendanceMatches?.length) {
    fields.attendanceSchedule = attendanceMatches.map(clean).join(" | ");
  }

  // =========================
  // PHYSICIAN
  // Only if explicitly medical
  // =========================
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

  fields.physician = physician;

  // =========================
  // ALLERGIES
  // =========================
  fields.allergies = matchFirst([
    /\bAllerg(?:y|ies):\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
    /\bFood Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
    /\bKnown Allergies:\s*([A-Za-z0-9 ,.'()\/-]{2,200})/i,
  ]);

  if (!fields.allergies && /no known allergies/i.test(compact)) {
    fields.allergies = "No known allergies";
  }

  // =========================
  // HARD FIXES FOR THIS EXACT FORMAT
  // =========================
  // Child name from top breadcrumb if still missing
  if (!fields.childFirstName || !fields.childLastName) {
    const top = compact.match(/#\s*>\s*([A-Za-z]+)\s+([A-Za-z]+)\s*>\s*Child Information/i);
    if (top?.[1] && top?.[2]) {
      fields.childFirstName = clean(top[1]);
      fields.childLastName = clean(top[2]);
    }
  }

  // Guardian from second Name:
  if (!fields.guardianName) {
    const secondName = compact.match(
      /\bName:\s*[A-Za-z]+(?:\s+[A-Za-z]+)+\s+Name:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i
    );
    if (secondName?.[1]) {
      fields.guardianName = clean(secondName[1]);
    }
  }

  // Phone from "Phone: Primary - ..."
  if (!fields.phone) {
    const phoneLine = compact.match(
      /\bPhone:\s*Primary\s*[-:]\s*(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i
    );
    if (phoneLine?.[1]) {
      fields.phone = normalizePhone(phoneLine[1]);
    }
  }

  // DOB / gender already strong, but keep as-is

  // Never let "Not Related" become physician
  if (/not related/i.test(fields.physician || "")) {
    fields.physician = "";
  }

  // =========================
  // WARNINGS
  // =========================
  if (!fields.childFirstName || !fields.childLastName) {
    warnings.push("Child name not confidently detected");
  }

  if (!fields.guardianName) {
    warnings.push("Guardian name not confidently detected");
  }

  if (!/signature|signed|guardian signature|physician signature/i.test(compact)) {
    warnings.push("No signature text detected. Visual signature may still exist.");
  }

  return {
    fields,
    warnings: [...new Set(warnings)],
  };
}