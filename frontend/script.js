const applicationForm = document.querySelector("#applicationForm");
const formMessage = document.querySelector("#formMessage");
const quizSteps = Array.from(document.querySelectorAll(".quiz-step"));
const quizStepLabel = document.querySelector("#quizStepLabel");
const quizProgressBar = document.querySelector("#quizProgressBar");
const prevStepButton = document.querySelector("#prevStep");
const nextStepButton = document.querySelector("#nextStep");
const submitButton = document.querySelector("#submitApplication");
const requestSummary = document.querySelector("#requestSummary");
const successCard = document.querySelector("#successCard");
const successSummary = document.querySelector("#successSummary");
const mobileStickyCta = document.querySelector(".mobile-sticky-cta");
const heroSection = document.querySelector(".hero");
const applicationSection = document.querySelector("#application");
const siteFooter = document.querySelector(".site-footer");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentStep = 1;
let isSwitchingStep = false;

const requiredFieldLabels = {
  level: "уровень",
  goal: "цель занятий",
  difficulty: "сложность",
  preferred_time: "удобное время для связи",
  name: "имя",
  contact: "контакт",
};

const stepFields = {
  1: ["level", "goal"],
  2: ["difficulty", "preferred_time"],
  3: ["name", "contact"],
};

function getFormData() {
  return new FormData(applicationForm);
}

function setFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.classList.remove("is-success", "is-error");

  if (type) {
    formMessage.classList.add(`is-${type}`);
  }
}

function getFieldValue(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function getMissingFields(formData, fields) {
  return fields
    .filter((fieldName) => !getFieldValue(formData, fieldName))
    .map((fieldName) => requiredFieldLabels[fieldName]);
}

function updateRequestSummary() {
  const formData = getFormData();
  const level = getFieldValue(formData, "level") || "не выбран";
  const goal = getFieldValue(formData, "goal") || "не выбрана";
  const difficulty = getFieldValue(formData, "difficulty") || "не выбрана";

  requestSummary.textContent = `Ваш запрос: уровень — ${level}, цель — ${goal}, сложность — ${difficulty}.`;
}

function hideSuccessCard() {
  successCard.hidden = true;
}

function setQuizButtonsDisabled(isDisabled) {
  [prevStepButton, nextStepButton, submitButton].forEach((button) => {
    if (button) {
      button.disabled = isDisabled;
    }
  });
}

function renderStep(moveFocus = false) {
  quizSteps.forEach((step) => {
    step.classList.remove("is-leaving");
    step.classList.toggle("is-active", Number(step.dataset.step) === currentStep);
  });

  quizStepLabel.textContent = `Шаг ${currentStep} из 3`;
  quizProgressBar.style.width = `${(currentStep / 3) * 100}%`;
  prevStepButton.hidden = currentStep === 1;
  nextStepButton.hidden = currentStep === 3;
  submitButton.hidden = currentStep !== 3;
  setFormMessage("", null);
  updateRequestSummary();
  if (moveFocus) quizSteps.find((step) => Number(step.dataset.step) === currentStep)?.querySelector("legend")?.focus();
}

function switchStep(targetStep) {
  if (targetStep === currentStep || isSwitchingStep) {
    return;
  }

  if (prefersReducedMotion.matches) {
    currentStep = targetStep;
    renderStep(true);
    return;
  }

  const activeStep = quizSteps.find((step) => Number(step.dataset.step) === currentStep);

  isSwitchingStep = true;
  setQuizButtonsDisabled(true);
  activeStep?.classList.remove("is-active");
  activeStep?.classList.add("is-leaving");

  window.setTimeout(() => {
    currentStep = targetStep;
    renderStep(true);
    isSwitchingStep = false;
    setQuizButtonsDisabled(false);
  }, 180);
}

function validateCurrentStep() {
  const formData = getFormData();
  const missingFields = getMissingFields(formData, stepFields[currentStep]);

  if (missingFields.length) {
    setFormMessage(`Заполните: ${missingFields.join(", ")}.`, "error");
    return false;
  }

  return true;
}

function renderSuccessSummary(formData) {
  const readValue = (fieldName) => {
    if (formData instanceof FormData) {
      return getFieldValue(formData, fieldName);
    }

    return String(formData?.[fieldName] || "").trim();
  };

  const items = [
    ["Имя", readValue("name")],
    ["Контакт", readValue("contact")],
    ["Уровень", readValue("level")],
    ["Цель", readValue("goal")],
    ["Сложность", readValue("difficulty")],
    ["Удобное время", readValue("preferred_time")],
  ];

  successSummary.replaceChildren();

  items.forEach(([label, value]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    successSummary.append(row);
  });
}

nextStepButton?.addEventListener("click", () => {
  hideSuccessCard();

  if (!validateCurrentStep()) {
    return;
  }

  switchStep(Math.min(currentStep + 1, 3));
});

prevStepButton?.addEventListener("click", () => {
  hideSuccessCard();
  switchStep(Math.max(currentStep - 1, 1));
});

applicationForm?.addEventListener("input", () => {
  hideSuccessCard();
  updateRequestSummary();
});

applicationForm?.addEventListener("change", () => {
  hideSuccessCard();
  updateRequestSummary();
});

applicationForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  hideSuccessCard();

  const formData = getFormData();

  const missingFields = getMissingFields(formData, Object.keys(requiredFieldLabels));
  const hasConsent = formData.get("demo_consent") === "on";

  if (missingFields.length || !hasConsent) {
    const consentText = hasConsent ? "" : " и подтвердите отправку только тестовых данных";
    const fieldText = missingFields.length
      ? `Заполните: ${missingFields.join(", ")}`
      : "Проверьте форму";

    setFormMessage(`${fieldText}${consentText}.`, "error");
    return;
  }

  submitApplication(formData);
});

async function submitApplication(formData) {
  const originalButtonText = submitButton.textContent;

  submitButton.textContent = "Отправляем...";
  setQuizButtonsDisabled(true);
  setFormMessage("", null);

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: getFieldValue(formData, "name"),
        contact: getFieldValue(formData, "contact"),
        level: getFieldValue(formData, "level"),
        goal: getFieldValue(formData, "goal"),
        difficulty: getFieldValue(formData, "difficulty"),
        preferred_time: getFieldValue(formData, "preferred_time"),
        demo_consent: formData.get("demo_consent") === "on",
        website: getFieldValue(formData, "website"),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      setFormMessage(result?.error || "Не удалось отправить заявку. Попробуйте позже.", "error");
      return;
    }

    const successTitle = successCard.querySelector("h3");
    const successText = successCard.querySelector("p");
    successTitle.textContent = result.demo ? "Демо-заявка отправлена" : "Заявка принята";
    successText.textContent = result.demo
      ? "Демо-заявка отправлена. В публичной версии данные не сохраняются."
      : "Спасибо! Тестовая заявка отправлена и сохранена в локальной базе.";
    if (result.demo) successSummary.replaceChildren();
    else renderSuccessSummary(result.application || formData);
    successCard.hidden = false;
    applicationForm.reset();
    currentStep = 1;
    renderStep();
    successCard.focus();
  } catch (error) {
    setFormMessage("Не удалось отправить заявку. Попробуйте позже.", "error");
  } finally {
    submitButton.textContent = originalButtonText;
    setQuizButtonsDisabled(false);
  }
}

function initRevealAnimations() {
  const revealElements = document.querySelectorAll(
    ".section:not(.hero), .step-card, .compare-card, .format-card, .result-cards article, .speech-grid p"
  );

  revealElements.forEach((element) => element.classList.add("reveal"));

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12,
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function updateMobileStickyCta() {
  if (!mobileStickyCta || !heroSection || !applicationSection || !siteFooter) {
    return;
  }

  const isMobile = window.matchMedia("(max-width: 680px)").matches;

  if (!isMobile) {
    mobileStickyCta.classList.remove("is-visible");
    return;
  }

  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  const applicationRect = applicationSection.getBoundingClientRect();
  const footerRect = siteFooter.getBoundingClientRect();
  const isAfterHero = window.scrollY > heroBottom - 120;
  const isNearForm =
    applicationRect.top < window.innerHeight - 90 && applicationRect.bottom > 120;
  const isNearFooter = footerRect.top < window.innerHeight;

  mobileStickyCta.classList.toggle("is-visible", isAfterHero && !isNearForm && !isNearFooter);
}

window.addEventListener("scroll", updateMobileStickyCta, { passive: true });
window.addEventListener("resize", updateMobileStickyCta);

initRevealAnimations();
updateMobileStickyCta();
renderStep();
