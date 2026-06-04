/* ── Toast global (substitui alert()) ── */
window.showToast = function (msg, type = "error") {
  const existing = document.getElementById("cv-toast");
  if (existing) existing.remove();

  const colors = {
    error:   { bg: "#b71c1c", icon: "fa-circle-xmark" },
    success: { bg: "#1b5e20", icon: "fa-circle-check" },
    info:    { bg: "#1565c0", icon: "fa-circle-info" },
    warning: { bg: "#e65100", icon: "fa-triangle-exclamation" },
  };
  const { bg, icon } = colors[type] || colors.error;

  const toast = document.createElement("div");
  toast.id = "cv-toast";
  toast.style.cssText = [
    "position:fixed", "bottom:28px", "left:50%", "transform:translateX(-50%)",
    `background:${bg}`, "color:#fff", "padding:14px 22px", "border-radius:12px",
    "z-index:99999", "font-weight:600", "font-size:0.95rem",
    "box-shadow:0 4px 20px rgba(0,0,0,0.3)", "display:flex", "align-items:center",
    "gap:10px", "max-width:90vw", "pointer-events:none",
    "animation:cv-toast-in 0.2s ease",
  ].join(";");

  toast.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
  document.body.appendChild(toast);

  if (!document.getElementById("cv-toast-style")) {
    const s = document.createElement("style");
    s.id = "cv-toast-style";
    s.textContent = "@keyframes cv-toast-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
    document.head.appendChild(s);
  }

  setTimeout(() => toast?.remove(), 3500);
};

/* ── Interceptor de fetch para sessão expirada ── */
const originalFetch = window.fetch;
window.fetch = async function () {
  const response = await originalFetch.apply(this, arguments);
  if (response.status === 401 || response.status === 400) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.expired) {
        showToast("Sua sessão expirou. Faça login novamente.", "warning");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        if (!window.location.pathname.endsWith("/login.html")) {
          window.location.href = "/HTML/login.html";
        }
      }
    } catch (e) {}
  }
  return response;
};

document.addEventListener("DOMContentLoaded", () => {
  /* ── 1. Scroll shadow na navbar ── */
  const navbar = document.getElementById("main-nav");
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
    }, { passive: true });
  }

  /* ── 2. Hamburger menu ── */
  const hamburger = document.getElementById("nav-hamburger");
  const navLinks  = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      hamburger.classList.toggle("open", isOpen);
      hamburger.setAttribute("aria-expanded", isOpen);
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!navbar.contains(e.target)) {
        navLinks.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ── 3. Visibilidade do link de Usuários (admin) ── */
  const navUsuariosLi = document.getElementById("nav-usuarios-li");

  const token   = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  let isAdmin = false;

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "admin") isAdmin = true;
    } catch (e) {
      // ignorar erros de parse
    }

    if (isAdmin && navUsuariosLi) {
      navUsuariosLi.style.display = "flex";
    }

    const adminActions = document.getElementById("admin-actions");
    if (isAdmin && adminActions) {
      adminActions.style.display = "block";

      const novoCursoBtn = adminActions.querySelector("button");
      if (novoCursoBtn) {
        novoCursoBtn.addEventListener("click", () => {
          const form    = document.getElementById("createCourseForm");
          const idField = document.getElementById("courseId");
          const label   = document.getElementById("courseModalLabel");
          const delBtn  = document.getElementById("deleteCourseBtn");
          const errDiv  = document.getElementById("modal-error");

          if (form)    form.reset();
          if (idField) idField.value = "";
          if (label)   label.textContent = "Criar Novo Curso";
          if (delBtn)  delBtn.style.display = "none";
          if (errDiv)  errDiv.style.display = "none";
        });
      }
    }

    /* ── 4. Link Painel para responsáveis (guardians) ── */
    try {
      const user = JSON.parse(userStr);
      if (user?.role === "guardian") {
        const li = document.createElement("li");
        li.className = "nav-item";
        li.innerHTML = '<a class="nav-link" href="/HTML/painel-parental.html"><i class="fas fa-child"></i> Painel</a>';
        document.getElementById("nav-login")?.closest("li")?.before(li);
      }
    } catch (e) {}

    /* ── 5. ECA Digital — controle de tempo de sessão para menores ── */
    try {
      const user = JSON.parse(userStr);
      const limitMinutes = user?.sessionTimeLimitMinutes;

      if (limitMinutes && limitMinutes > 0) {
        const SESSION_KEY = "cv_session_start";
        if (!sessionStorage.getItem(SESSION_KEY)) {
          sessionStorage.setItem(SESSION_KEY, Date.now().toString());
        }

        let sessionWarned = false;

        const checkSessionTime = () => {
          const start = parseInt(sessionStorage.getItem(SESSION_KEY), 10);
          const elapsedMin = (Date.now() - start) / 60000;

          if (!sessionWarned && elapsedMin >= limitMinutes * 0.8) {
            sessionWarned = true;
            showSessionWarning(Math.ceil(limitMinutes - elapsedMin));
          }

          if (elapsedMin >= limitMinutes) {
            clearInterval(sessionInterval);
            sessionStorage.removeItem(SESSION_KEY);
            window.location.href = "/index.html?pausa=1";
          }
        };

        const sessionInterval = setInterval(checkSessionTime, 30000);
        checkSessionTime();
      }
    } catch (e) {
      // ignorar erros de parse
    }
  } else {
    if (navUsuariosLi) navUsuariosLi.style.display = "none";
  }

  /* ── 6. Marca o link ativo no nav conforme a URL atual ── */
  document.querySelectorAll("#nav-links .nav-link").forEach(link => {
    try {
      const href = new URL(link.href, window.location.origin).pathname;
      if (href === window.location.pathname) {
        link.classList.add("active");
      }
    } catch (_) {}
  });

  /* ── 7. Mensagem de pausa ao voltar da sessão expirada ── */
  if (new URLSearchParams(window.location.search).get("pausa") === "1") {
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1b5e20;color:#fff;padding:14px 28px;border-radius:12px;z-index:9999;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-size:1rem;";
    banner.textContent = "Hora de uma pausa! Você atingiu o limite de tempo de hoje.";
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 6000);
  }
});

function showSessionWarning(minutesLeft) {
  const existing = document.getElementById("cv-session-warning");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "cv-session-warning";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;";

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:36px 32px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
      <div style="font-size:52px;margin-bottom:12px;">⏰</div>
      <h3 style="color:#1b5e20;font-weight:900;margin:0 0 10px;">Atenção!</h3>
      <p style="color:#555;margin:0 0 22px;line-height:1.5;">
        Você está usando a plataforma há um bom tempo.<br>
        Faltam cerca de <strong>${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}</strong> para o seu limite de hoje.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="cv-session-extend" style="background:#2ecc71;color:#fff;border:none;padding:11px 24px;border-radius:24px;font-size:1rem;font-weight:700;cursor:pointer;">Continuar</button>
        <button id="cv-session-stop" style="background:#eee;color:#333;border:none;padding:11px 24px;border-radius:24px;font-size:1rem;font-weight:700;cursor:pointer;">Encerrar Sessão</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("cv-session-extend").addEventListener("click", () => overlay.remove());
  document.getElementById("cv-session-stop").addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("cv_session_start");
    window.location.href = "/HTML/login.html";
  });
}

/* ── Modal de confirmação (substitui confirm()) ── */
window.cvConfirm = function (message, onConfirm, opts = {}) {
  const existing = document.getElementById("cv-confirm-modal");
  if (existing) existing.remove();

  const icon       = opts.icon       || "fa-triangle-exclamation";
  const iconColor  = opts.iconColor  || "#e65100";
  const confirmTxt = opts.confirmTxt || "Confirmar";
  const confirmCls = opts.confirmCls || "btn-danger";

  const html = `
    <div class="modal fade" id="cv-confirm-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-body text-center p-4">
            <div style="font-size:2.2rem;color:${iconColor};margin-bottom:14px;">
              <i class="fas ${icon}"></i>
            </div>
            <p class="fw-semibold mb-4" style="font-size:0.95rem;color:#333;">${message}</p>
            <div class="d-flex gap-2 justify-content-center">
              <button id="cv-confirm-cancel" class="btn btn-light px-4 rounded-pill" data-bs-dismiss="modal">Cancelar</button>
              <button id="cv-confirm-ok"     class="btn ${confirmCls} px-4 rounded-pill">${confirmTxt}</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", html);
  const modalEl = document.getElementById("cv-confirm-modal");
  const modal   = new bootstrap.Modal(modalEl);

  document.getElementById("cv-confirm-ok").addEventListener("click", () => {
    modal.hide();
    onConfirm();
  });
  modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());
  modal.show();
};
