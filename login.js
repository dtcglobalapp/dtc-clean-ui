import { signIn, getSessionUser } from "./auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const messageBox = document.getElementById("messageBox");

function showMessage(text, type = "info") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtn.textContent = isLoading ? "Signing in..." : "Sign In";
}

async function boot() {
  const user = await getSessionUser();
  if (user) {
    window.location.href = "./children/children-list.html";
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setLoading(true);

  try {
    await signIn(emailInput.value.trim(), passwordInput.value);
    showMessage("Login successful. Redirecting...", "info");
    window.location.href = "./children/children-list.html";
  } catch (error) {
    console.error("Login error:", error);
    showMessage(error.message || "Could not sign in.", "error");
  } finally {
    setLoading(false);
  }
});

boot();