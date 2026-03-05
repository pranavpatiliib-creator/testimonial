const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzqetOqPzRjTtCE9UYEfXXuBJG5x7cjVmbXRd57szkrojWTd9aSQaVOeiDMrH-Iwn1hdQ/exec";

const form = document.getElementById("testimonialForm");
const submitBtn = document.getElementById("submitBtn");
const successMessage = document.getElementById("successMessage");
const formError = document.getElementById("formError");

function setError(errorId, message) {
  const errorNode = document.getElementById(errorId);
  if (errorNode) errorNode.textContent = message;
}

function clearAllErrors() {
  form.querySelectorAll(".error").forEach((node) => {
    node.textContent = "";
  });
  formError.textContent = "";
}

function validateForm() {
  clearAllErrors();

  let isValid = true;
  let firstInvalidElement = null;
  const requiredFields = Array.from(form.querySelectorAll("[required]"));

  requiredFields.forEach((field) => {
    if (field.type === "checkbox") {
      if (!field.checked) {
        setError(`${field.name}Error`, "Please confirm this required field.");
        isValid = false;
        if (!firstInvalidElement) firstInvalidElement = field;
      }
      return;
    }

    const value = field.value.trim();
    if (!value) {
      setError(`${field.name}Error`, "This field is required.");
      isValid = false;
      if (!firstInvalidElement) firstInvalidElement = field;
      return;
    }

    if (field.name === "yearOfGraduation") {
      const yearPattern = /^(19|20)\d{2}$/;
      if (!yearPattern.test(value)) {
        setError("yearOfGraduationError", "Enter a valid 4-digit year.");
        isValid = false;
        if (!firstInvalidElement) firstInvalidElement = field;
      }
    }
  });

  if (firstInvalidElement) firstInvalidElement.focus();
  return isValid;
}

function collectFormData() {
  const data = {};
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    data[key] = value;
  });

  // Backward compatibility for older Google Sheet/App Script columns.
  data.email = data.email || "";
  data.organization = data.organization || data.currentOrganization || "";
  data.hearAboutUs = data.hearAboutUs || "Alumni Form";
  data.rating = data.rating || "";
  data.bestArea = data.bestArea || "";
  data.recommendation = data.recommendation || "";
  data.favoriteFeature = data.favoriteFeature || data.testimonialMessage || "";
  data.improvement = data.improvement || "";
  data.teamResponsive = data.teamResponsive || "";
  data.submittedAt = new Date().toISOString();

  return data;
}

async function submitForm(event) {
  event.preventDefault();

  if (!validateForm()) return;

  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/")) {
    formError.textContent = "Set a valid Google Apps Script Web App URL in script.js before submitting.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams(collectFormData()),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Server did not return JSON");
    }

    const result = await response.json();
    if (!result || result.ok !== true) {
      throw new Error(result?.error || "Submission rejected");
    }

    form.classList.add("hidden");
    successMessage.classList.remove("hidden");
  } catch (error) {
    formError.textContent =
      "Submission failed. In Apps Script deploy Web App with access set to Anyone, then redeploy.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

form.addEventListener("submit", submitForm);
