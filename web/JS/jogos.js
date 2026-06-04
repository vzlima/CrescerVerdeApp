const PLAN_LEVEL = { free: 0, familia: 1, escola: 2 };
const PLAN_LABEL  = { free: "Gratuito", familia: "Família", escola: "Escola" };

let allCourses = [];

function getUserPlan() {
  try { return JSON.parse(localStorage.getItem("user"))?.plan || "free"; }
  catch { return "free"; }
}

function getUserRole() {
  try { return JSON.parse(localStorage.getItem("user"))?.role || null; }
  catch { return null; }
}

function getUserId() {
  try { return JSON.parse(localStorage.getItem("user"))?._id || null; }
  catch { return null; }
}

function isLocked(course) {
  return PLAN_LEVEL[getUserPlan()] < PLAN_LEVEL[course.minPlan || "free"];
}

function diffBadge(diff) {
  const map = {
    iniciante:    '<span class="diff-badge badge-iniciante">Iniciante</span>',
    intermediario:'<span class="diff-badge badge-inter">Intermediário</span>',
    avancado:     '<span class="diff-badge badge-avanc">Avançado</span>',
  };
  return map[diff] || '';
}

/* ── Render ── */
function renderTrails(courses) {
  const container = document.getElementById("courses-container");
  const isAdmin   = getUserRole() === "admin";

  if (!courses.length) {
    container.innerHTML = '<p class="text-center text-muted py-5" style="grid-column:1/-1">Nenhuma trilha encontrada.</p>';
    return;
  }

  container.innerHTML = courses.map(c => {
    const locked    = isLocked(c);
    const emoji     = c.emoji || "🌿";
    const plan      = c.minPlan || "free";
    const planBadge = plan !== "free"
      ? `<span class="plan-badge">${PLAN_LABEL[plan]}</span>` : "";
    const timeLabel = c.estimatedMinutes ? `<span class="trail-time">⏱ ${c.estimatedMinutes} min</span>` : "";
    const editBtn   = isAdmin
      ? `<button class="trail-edit-btn" onclick="event.stopPropagation(); openEditModal('${c._id}')">✏️ Editar</button>` : "";

    const lockOverlay = locked ? `
      <div class="trail-locked-overlay">
        <div class="lock-icon">🔒</div>
        <div class="lock-label">Disponível no Plano ${PLAN_LABEL[plan]}</div>
        <button class="btn-unlock" onclick="event.stopPropagation(); window.location.href='/HTML/planos.html'">Ver Planos</button>
      </div>` : "";

    const coverHtml = c.coverImage
      ? `<div class="trail-header">
           <img src="${c.coverImage}" alt="${c.title}" class="trail-cover-img"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="trail-emoji-fallback" style="display:none">${emoji}</div>
         </div>`
      : `<div class="trail-header trail-header-emoji"><div class="trail-emoji-fallback">${emoji}</div></div>`;

    const clickAttr = locked
      ? 'class="trail-card locked"'
      : `class="trail-card" onclick="window.location.href='/HTML/jogo-detalhes.html?id=${c._id}'"`;

    return `
      <div ${clickAttr} data-diff="${c.difficulty || 'iniciante'}">
        ${editBtn}
        ${coverHtml}
        <div class="trail-body">
          <div class="trail-title">${c.title}</div>
          <div class="trail-desc">${c.description}</div>
          <div class="trail-meta">
            ${diffBadge(c.difficulty)}
            ${planBadge}
            ${timeLabel}
          </div>
          <div class="trail-progress" id="prog-${c._id}">
            <div class="trail-progress-bar" style="width:0%"></div>
          </div>
        </div>
        ${lockOverlay}
      </div>`;
  }).join("");

  loadAllProgress(courses);
}

/* ── Progress ── */
async function loadAllProgress(courses) {
  const token  = localStorage.getItem("token");
  const userId = getUserId();
  if (!token || !userId) return;

  for (const c of courses) {
    if (isLocked(c)) continue;
    try {
      const res = await fetch(`${API_BASE}/api/courseProgress/get?userId=${userId}&courseId=${c._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) continue;
      const { progress } = await res.json();
      const pct = progress?.percentComplete ?? 0;
      const bar = document.querySelector(`#prog-${c._id} .trail-progress-bar`);
      if (bar) bar.style.width = `${pct}%`;
    } catch {}
  }
}

/* ── Filters ── */
function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter   = btn.dataset.filter;
      const filtered = filter === "all"
        ? allCourses
        : allCourses.filter(c => c.difficulty === filter);
      renderTrails(filtered);
    });
  });
}

/* ── Load ── */
async function loadCourses() {
  const container = document.getElementById("courses-container");
  container.innerHTML = '<p class="text-center text-muted py-5" style="grid-column:1/-1">Carregando trilhas...</p>';
  try {
    const res  = await fetch(`${API_BASE}/api/courses`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao carregar");
    allCourses = (data.courses || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    renderTrails(allCourses);
  } catch (err) {
    container.innerHTML = `<p class="text-center text-danger py-5" style="grid-column:1/-1">Erro ao carregar trilhas: ${err.message}</p>`;
  }
}

/* ── Admin modal ── */
function resetCourseModal() {
  document.getElementById("createCourseForm").reset();
  document.getElementById("courseId").value          = "";
  document.getElementById("courseModalLabel").textContent = "Nova Trilha";
  document.getElementById("deleteCourseBtn").style.display = "none";
  document.getElementById("modal-error").style.display    = "none";
}

function openEditModal(courseId) {
  const c = allCourses.find(x => String(x._id) === String(courseId));
  if (!c) return;

  document.getElementById("courseId").value          = c._id;
  document.getElementById("courseTitle").value       = c.title || "";
  document.getElementById("courseDescription").value = c.description || "";
  document.getElementById("courseCoverImage").value  = c.coverImage || "";
  document.getElementById("courseVideoUrl").value    = c.videoUrl || "";
  document.getElementById("courseEmoji").value       = c.emoji || "";
  document.getElementById("courseDifficulty").value  = c.difficulty || "iniciante";
  document.getElementById("courseMinPlan").value     = c.minPlan || "free";
  document.getElementById("courseMinutes").value     = c.estimatedMinutes || "";
  document.getElementById("courseOrder").value       = c.order || "";

  document.getElementById("courseModalLabel").textContent  = "Editar Trilha";
  document.getElementById("deleteCourseBtn").style.display = "block";
  document.getElementById("modal-error").style.display     = "none";

  new bootstrap.Modal(document.getElementById("courseModal")).show();
}

window.openEditModal = openEditModal;

window.deleteCourse = async function () {
  const id = document.getElementById("courseId").value;
  if (!id) return;

  cvConfirm("Excluir esta trilha permanentemente? Esta ação não pode ser desfeita.", async () => {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Não autenticado.", "warning");
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById("courseModal"))?.hide();
        loadCourses();
      } else {
        const d = await res.json();
        showToast(d.error || "Erro ao deletar trilha.");
      }
    } catch { showToast("Erro de conexão."); }
  }, { confirmTxt: "Excluir", icon: "fa-trash" });
};

/* ── DOMContentLoaded ── */
document.addEventListener("DOMContentLoaded", () => {
  if (getUserRole() === "admin") {
    const adminActions = document.getElementById("admin-actions");
    if (adminActions) adminActions.style.display = "block";
  }

  setupFilters();
  loadCourses();

  // Aplica preferência de dificuldade definida no onboarding
  const preferred = localStorage.getItem("cv_preferred_trail");
  if (preferred) {
    const btn = document.querySelector(`.filter-btn[data-filter="${preferred}"]`);
    if (btn) btn.click();
    localStorage.removeItem("cv_preferred_trail");
  }

  document.getElementById("deleteCourseBtn")?.addEventListener("click", window.deleteCourse);

  document.getElementById("createCourseForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById("modal-error");
    errorDiv.style.display = "none";

    const token = localStorage.getItem("token");
    if (!token) {
      errorDiv.textContent = "Não autenticado.";
      errorDiv.style.display = "block";
      return;
    }

    const id      = document.getElementById("courseId").value;
    const payload = {
      title:            document.getElementById("courseTitle").value,
      description:      document.getElementById("courseDescription").value,
      coverImage:       document.getElementById("courseCoverImage").value || null,
      videoUrl:         document.getElementById("courseVideoUrl").value || null,
      emoji:            document.getElementById("courseEmoji").value || "🌿",
      difficulty:       document.getElementById("courseDifficulty").value,
      minPlan:          document.getElementById("courseMinPlan").value,
      estimatedMinutes: parseInt(document.getElementById("courseMinutes").value) || 15,
      order:            parseInt(document.getElementById("courseOrder").value) || 0,
    };

    try {
      const url    = id ? `${API_BASE}/api/courses/${id}` : `${API_BASE}/api/courses`;
      const method = id ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById("courseModal"))?.hide();
        loadCourses();
      } else {
        errorDiv.textContent = data.error || "Erro ao salvar trilha.";
        errorDiv.style.display = "block";
      }
    } catch {
      errorDiv.textContent = "Erro de conexão.";
      errorDiv.style.display = "block";
    }
  });
});
