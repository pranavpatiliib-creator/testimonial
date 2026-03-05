const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxsPDySZXZyxKZxbLQPa9EEda8urYZy5UooBHEvD7s4zNPRNofF8zTjvaPGgZ2x8L1kig/exec";
const steps = Array.from(document.querySelectorAll(".step"));
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const successMessage = document.getElementById("successMessage");
const formError = document.getElementById("formError");

let currentStep = 0;
const totalSteps = steps.length;

function updateStepUI() {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStep);
  });

  prevBtn.disabled = currentStep === 0;
  nextBtn.classList.toggle("hidden", currentStep === totalSteps - 1);
  submitBtn.classList.toggle("hidden", currentStep !== totalSteps - 1);

  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
  progressPercent.textContent = `${percent}%`;
  formError.textContent = "";
}

function clearStepErrors(stepElement) {
  const errorNodes = stepElement.querySelectorAll(".error");
  errorNodes.forEach((node) => {
    node.textContent = "";
  });
}

function setError(errorId, message) {
  const errorNode = document.getElementById(errorId);
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function validateStep(stepIndex) {
  const step = steps[stepIndex];
  clearStepErrors(step);

  let isValid = true;
  let firstInvalidElement = null;
  const requiredFields = Array.from(step.querySelectorAll("[required]"));
  const visitedRadioGroups = new Set();

  requiredFields.forEach((field) => {
    if (field.type === "radio") {
      if (visitedRadioGroups.has(field.name)) {
        return;
      }
      visitedRadioGroups.add(field.name);

      const checked = step.querySelector(`input[name="${field.name}"]:checked`);
      if (!checked) {
        setError(`${field.name}Error`, "Please choose one option.");
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = field;
        }
      }
      return;
    }

    if (field.type === "checkbox") {
      if (!field.checked) {
        setError(`${field.name}Error`, "Please confirm this required field.");
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = field;
        }
      }
      return;
    }

    const value = field.value.trim();
    if (!value) {
      setError(`${field.name}Error`, "This field is required.");
      isValid = false;
      if (!firstInvalidElement) {
        firstInvalidElement = field;
      }
      return;
    }

    if (field.name === "yearOfGraduation") {
      const yearPattern = /^(19|20)\d{2}$/;
      if (!yearPattern.test(value)) {
        setError("yearOfGraduationError", "Enter a valid 4-digit year.");
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = field;
        }
      }
    }

    if (field.type === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        setError(`${field.name}Error`, "Enter a valid email address.");
        isValid = false;
        if (!firstInvalidElement) {
          firstInvalidElement = field;
        }
      }
    }
  });

  if (firstInvalidElement) {
    firstInvalidElement.focus();
  }

  return isValid;
}

function collectFormData() {
  const data = {};
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    data[key] = value;
  });

  data.submittedAt = new Date().toISOString();
  return data;
}

async function submitForm(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  formError.textContent = "";

  if (!validateStep(currentStep)) {
    return;
  }

  if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/")) {
    formError.textContent = "Set a valid Google Apps Script Web App URL in script.js before submitting.";
    return;
  }

  prevBtn.disabled = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const payload = collectFormData();

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const bodyText = await response.text();
      throw new Error(
        `Unexpected response type: ${contentType || "unknown"} ${bodyText.slice(0, 120)}`
      );
    }

    const result = await response.json();
    if (!result || result.ok !== true) {
      throw new Error(result?.error || "Server rejected the submission");
    }

    form.classList.add("hidden");
    successMessage.classList.remove("hidden");
  } catch (error) {
    formError.textContent =
      "Submission failed. In Apps Script deploy Web App with access set to Anyone, then redeploy.";
    prevBtn.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

nextBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) {
    return;
  }
  currentStep += 1;
  updateStepUI();
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep -= 1;
    updateStepUI();
  }
});

submitBtn.addEventListener("click", submitForm);
form.addEventListener("submit", submitForm);

updateStepUI();
