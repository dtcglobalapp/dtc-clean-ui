export function parseVisionText(rawText = "") {
  const text = rawText.replace(/\s+/g, " ").trim();

  const result = {
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    guardian: "",
    phone: "",
    address: ""
  };

  // =========================
  // NAME DETECTION (SMART)
  // =========================

  const nameMatches = [...text.matchAll(/Name:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/g)];

  if (nameMatches.length >= 1) {
    const childName = nameMatches[0][1];
    const [first, last] = childName.split(" ");
    result.firstName = first;
    result.lastName = last;
  }

  if (nameMatches.length >= 2) {
    result.guardian = nameMatches[1][1];
  }

  // =========================
  // DOB
  // =========================
  const dobMatch = text.match(/DOB:\s*(\d{2}\/\d{2}\/\d{4})/);
  if (dobMatch) result.dob = dobMatch[1];

  // =========================
  // GENDER
  // =========================
  const genderMatch = text.match(/Sex:\s*(M|F)/i);
  if (genderMatch) result.gender = genderMatch[1].toUpperCase();

  // =========================
  // PHONE
  // =========================
  const phoneMatch = text.match(/\(?\d{3}\)?\s?\d{3}-\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0];

  // =========================
  // ADDRESS
  // =========================
  const addressMatch = text.match(/Address:\s*([^]+?)(?=Attendance|$)/);
  if (addressMatch) {
    result.address = addressMatch[1].trim();
  }

  return result;
}