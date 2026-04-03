export function autoMapForm(fields) {
  if (!fields) return;

  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach(input => {
    const label = getLabelText(input);
    const placeholder = input.placeholder || "";
    const name = input.name || "";
    const id = input.id || "";

    const context = `${label} ${placeholder} ${name} ${id}`.toLowerCase();

    const matchedValue = matchField(context, fields);

    if (matchedValue !== null && matchedValue !== undefined) {
      input.value = matchedValue;
    }
  });
}

/* ============================= */
/* 🔍 MATCH INTELIGENTE */
/* ============================= */

function matchField(context, fields) {
  const dictionary = [
    {
      keys: ["first name", "firstname", "nombre", "child name", "student name"],
      value: fields.childFirstName
    },
    {
      keys: ["last name", "lastname", "apellido"],
      value: fields.childLastName
    },
    {
      keys: ["dob", "birth", "date of birth", "fecha"],
      value: fields.dob
    },
    {
      keys: ["gender", "sex"],
      value: fields.gender
    },
    {
      keys: ["guardian", "parent", "mother", "father"],
      value: fields.guardianName
    },
    {
      keys: ["phone", "tel", "telefono"],
      value: fields.phone
    },
    {
      keys: ["physician", "doctor"],
      value: fields.physician
    },
    {
      keys: ["allerg", "allergy"],
      value: fields.allergies
    },
    {
      keys: ["address", "direccion"],
      value: fields.address
    },
    {
      keys: ["meal", "food"],
      value: fields.meals
    }
  ];

  for (const item of dictionary) {
    for (const key of item.keys) {
      if (context.includes(key)) {
        return item.value || "";
      }
    }
  }

  return null;
}

/* ============================= */
/* 🔎 DETECTAR LABEL */
/* ============================= */

function getLabelText(input) {
  let label = "";

  if (input.id) {
    const labelElement = document.querySelector(`label[for="${input.id}"]`);
    if (labelElement) label += labelElement.innerText;
  }

  if (!label && input.closest("label")) {
    label += input.closest("label").innerText;
  }

  return label;
}