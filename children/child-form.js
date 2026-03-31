import { supabase, requireAuth } from "../auth.js";
import { createChild } from "./children-api.js";

const form = document.getElementById("childForm");
const messageBox = document.getElementById("messageBox");
const dobInput = document.getElementById("date_of_birth");
const classroomSelect = document.getElementById("classroom");

function calculateClassroom(dob) {
  if (!dob) return null;

  const birthDate = new Date(dob);
  const today = new Date();
  const ageInYears = (today - birthDate) / (1000 * 60 * 60 * 24 * 365.25);

  if (ageInYears < 2) return "Infants";
  if (ageInYears < 3) return "Toddlers";
  if (ageInYears < 5) return "Preschool";
  return "School Age";
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
}

function showMessage(msg, type = "info") {
  if (!messageBox) return;

  messageBox.classList.remove("hidden");
  messageBox.textContent = msg || "";

  if (type === "error") {
    messageBox.className = "dtc-feedback";
    return;
  }

  messageBox.className = "dtc-feedback hidden";
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "dtc-feedback hidden";
}

dobInput?.addEventListener("change", () => {
  const autoClass = calculateClassroom(dobInput.value);
  if (autoClass) {
    classroomSelect.value = autoClass;
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No authenticated user found.");

    const { data: orgUser, error: orgError } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError) throw orgError;
    if (!orgUser?.organization_id) {
      throw new Error("No organization found for this user.");
    }

    const dob = document.getElementById("date_of_birth").value;

    const payload = {
      organization_id: orgUser.organization_id,
      first_name: document.getElementById("first_name").value.trim(),
      middle_name: document.getElementById("middle_name").value.trim() || null,
      last_name: document.getElementById("last_name").value.trim(),
      date_of_birth: dob || null,
      gender: document.getElementById("gender").value || null,
      enrollment_date: document.getElementById("enrollment_date").value || null,
      classroom: calculateClassroom(dob),
      status: document.getElementById("status").value || "active",
      notes: document.getElementById("notes").value.trim() || null,
    };

    await createChild(payload);

    showMessage("Child created successfully.", "info");

    setTimeout(() => {
      window.location.href = "./children-list.html";
    }, 900);
  } catch (err) {
    console.error("Create child error:", err);
    showMessage(err.message || "Could not create child.", "error");
  }
});

init();