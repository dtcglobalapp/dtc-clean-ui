export function analyzeDocumentText(text) {
  const issues = [];
  const warnings = [];
  const found = [];

  const raw = String(text || "");
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();

  const hasAny = (patterns) => patterns.some((pattern) => pattern.test(normalized));

  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    /\b\d{4}-\d{1,2}-\d{1,2}\b/,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/
  ];

  const signaturePatterns = [
    /\bsignature\b/,
    /\bsigned\b/,
    /\bparent\/guardian\b/,
    /\bguardian signature\b/,
    /\bphysician signature\b/,
    /\bprovider signature\b/,
    /\bauthorizing signature\b/
  ];

  const physicianPatterns = [
    /\bphysician\b/,
    /\bdoctor\b/,
    /\bdr\.\b/,
    /\bprovider\b/,
    /\bmedical provider\b/,
    /\bhealth care provider\b/,
    /\bpediatrician\b/,
    /\bpractitioner\b/
  ];

  const allergyPatterns = [
    /\ballergy\b/,
    /\ballergies\b/,
    /\ballergic\b/
  ];

  const noAllergyPatterns = [
    /\bno allergy\b/,
    /\bno allergies\b/,
    /\bnone known\b/,
    /\bnka\b/,
    /\bno known allergies\b/
  ];

  const diagnosisPatterns = [
    /\bdiagnosis\b/,
    /\bcondition\b/,
    /\bmedical condition\b/,
    /\bdiagnosed\b/
  ];

  const expirationPatterns = [
    /\bexpires?\b/,
    /\bexpiration\b/,
    /\bvalid until\b/
  ];

  const immunizationPatterns = [
    /\bimmunization\b/,
    /\bvaccine\b/,
    /\bvaccination\b/,
    /\bshots?\b/
  ];

  const medicationPatterns = [
    /\bmedication\b/,
    /\bmedicine\b/,
    /\bprescribed\b/,
    /\bdosage\b/
  ];

  if (hasAny(datePatterns)) {
    found.push("Date detected");
  } else {
    issues.push("No date detected");
  }

  if (hasAny(signaturePatterns)) {
    found.push("Signature-related text detected");
  } else {
    warnings.push("No signature text detected. Document may still contain a visual signature only.");
  }

  if (hasAny(physicianPatterns)) {
    found.push("Physician/provider reference detected");
  } else {
    warnings.push("No physician/provider text detected");
  }

  if (hasAny(allergyPatterns)) {
    found.push("Allergy section detected");
  }

  if (hasAny(noAllergyPatterns) && hasAny(allergyPatterns)) {
    warnings.push("Possible conflicting allergy language detected. Review allergy section carefully.");
  }

  if (hasAny(diagnosisPatterns)) {
    found.push("Diagnosis/condition language detected");
  }

  if (hasAny(expirationPatterns)) {
    found.push("Expiration-related text detected");
  }

  if (hasAny(immunizationPatterns)) {
    found.push("Immunization/vaccine language detected");
  }

  if (hasAny(medicationPatterns)) {
    found.push("Medication-related language detected");
  }

  if (normalized.includes("error") || normalized.includes("incorrect")) {
    warnings.push("Document contains words suggesting a correction or problem");
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    found
  };
}