export function parseVisionDocument(rawText) {
  const text = String(rawText || "").replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();

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
  };

  const findFirst = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return "";
  };

  const normalizePhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return value || "";
  };

  const splitName = (fullName) => {
    const cleaned = String(fullName || "").trim();
    if (!cleaned) return { first: "", last: "" };
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: "" };
    return {
      first: parts.slice(0, -1).join(" "),
      last: parts.slice(-1).join(" "),
    };
  };

  const childName =
    findFirst([
      /child(?:'s)? name[:\s]+([a-z ,.'-]{3,80})/i,
      /student name[:\s]+([a-z ,.'-]{3,80})/i,
      /name of child[:\s]+([a-z ,.'-]{3,80})/i,
      /patient name[:\s]+([a-z ,.'-]{3,80})/i,
    ]) || "";

  if (childName) {
    const parts = splitName(childName);
    fields.childFirstName = parts.first;
    fields.childLastName = parts.last;
  } else {
    warnings.push("Child name not confidently detected");
  }

  fields.dob = findFirst([
    /date of birth[:\s]+([0-9/.-]{6,20})/i,
    /\bdob[:\s]+([0-9/.-]{6,20})/i,
    /\bbirth date[:\s]+([0-9/.-]{6,20})/i,
  ]);

  if (!fields.dob) {
    warnings.push("DOB not confidently detected");
  }

  fields.gender = findFirst([
    /\bgender[:\s]+(male|female|m|f|boy|girl)/i,
    /\bsex[:\s]+(male|female|m|f)/i,
  ]);

  fields.guardianName = findFirst([
    /parent(?:\/guardian)? name[:\s]+([a-z ,.'-]{3,80})/i,
    /guardian name[:\s]+([a-z ,.'-]{3,80})/i,
    /mother[' ]?s name[:\s]+([a-z ,.'-]{3,80})/i,
    /father[' ]?s name[:\s]+([a-z ,.'-]{3,80})/i,
  ]);

  if (!fields.guardianName) {
    warnings.push("Guardian name not confidently detected");
  }

  fields.phone = normalizePhone(
    findFirst([
      /\bphone[:\s]+([0-9().\- ]{7,25})/i,
      /\bcell[:\s]+([0-9().\- ]{7,25})/i,
      /\btelephone[:\s]+([0-9().\- ]{7,25})/i,
      /\bmobile[:\s]+([0-9().\- ]{7,25})/i,
    ])
  );

  fields.physician = findFirst([
    /physician[:\s]+([a-z ,.'-]{3,80})/i,
    /doctor[:\s]+([a-z ,.'-]{3,80})/i,
    /provider[:\s]+([a-z ,.'-]{3,80})/i,
    /pediatrician[:\s]+([a-z ,.'-]{3,80})/i,
  ]);

  if (!fields.physician && (lower.includes("physician") || lower.includes("doctor") || lower.includes("provider"))) {
    warnings.push("Physician section found, but name could not be mapped cleanly");
  }

  fields.allergies = findFirst([
    /allerg(?:y|ies)[:\s]+([a-z0-9 ,.'()\/-]{2,200})/i,
    /food allergies[:\s]+([a-z0-9 ,.'()\/-]{2,200})/i,
    /known allergies[:\s]+([a-z0-9 ,.'()\/-]{2,200})/i,
  ]);

  if (!fields.allergies && lower.includes("no known allergies")) {
    fields.allergies = "No known allergies";
  }

  if (lower.includes("no allergies") && /allerg(?:y|ies)[:\s]+/i.test(text)) {
    warnings.push("Possible conflicting allergy language detected");
  }

  if (!/signature|signed|guardian signature|physician signature/i.test(text)) {
    warnings.push("No signature text detected. Visual signature may still exist.");
  }

  if (!/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{1,2}-\d{1,2}\b/.test(text)) {
    warnings.push("No clear date pattern detected");
  }

  return {
    fields,
    warnings,
  };
}