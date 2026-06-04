const TOTAL_STEPS = 3;
let currentStep = 1;
let selectedDiff = "iniciante";

const progressFill = document.getElementById("ob-progress-fill");
const btnNext      = document.getElementById("ob-btn-next");
const btnSkip      = document.getElementById("ob-skip");

function goTo(n) {
  document.getElementById(`ob-step-${currentStep}`).classList.remove("active");
  document.getElementById(`dot-${currentStep - 1}`).classList.remove("active");
  currentStep = n;
  document.getElementById(`ob-step-${currentStep}`).classList.add("active");
  document.getElementById(`dot-${currentStep - 1}`).classList.add("active");

  const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
  progressFill.style.width = pct + "%";

  if (currentStep === TOTAL_STEPS) {
    btnNext.innerHTML = 'Começar! <i class="fas fa-rocket"></i>';
  } else {
    btnNext.innerHTML = 'Próximo <i class="fas fa-arrow-right"></i>';
  }
}

btnNext.addEventListener("click", () => {
  if (currentStep < TOTAL_STEPS) {
    goTo(currentStep + 1);
  } else {
    finish();
  }
});

btnSkip.addEventListener("click", finish);

// Difficulty card selection
document.querySelectorAll(".ob-diff-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".ob-diff-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedDiff = card.dataset.diff;
  });
});

function finish() {
  localStorage.setItem("cv_onboarded", "1");
  if (selectedDiff && selectedDiff !== "iniciante") {
    localStorage.setItem("cv_preferred_trail", selectedDiff);
  } else {
    localStorage.removeItem("cv_preferred_trail");
  }
  window.location.href = "/HTML/jogos.html";
}
