export function analyzeDocumentText(text) {

  const issues = [];

  if (!text.includes("signature")) {
    issues.push("Missing signature");
  }

  if (!text.includes("date")) {
    issues.push("Missing date");
  }

  if (text.includes("no allergies") && text.includes("allergy")) {
    issues.push("Conflicting allergy information");
  }

  if (text.includes("expired")) {
    issues.push("Document may be expired");
  }

  if (!text.includes("physician")) {
    issues.push("Missing physician information");
  }

  return {
    issues
  };
}