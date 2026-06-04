document.addEventListener("DOMContentLoaded", () => {
  const userStr = localStorage.getItem("user");
  const token   = localStorage.getItem("token");

  if (userStr && token) {
    try {
      const user = JSON.parse(userStr);

      const loginLinks = document.querySelectorAll('.nav-link[href*="login.html"]');
      loginLinks.forEach(loginLink => {
        const li = loginLink.parentElement;
        li.classList.add("ms-4", "d-flex", "align-items-center", "gap-3");

        // Nome clicável → perfil (usuário) ou usuários (admin)
        const profileHref = user.role === 'admin' ? '/HTML/usuarios.html' : '/HTML/perfil.html';
        const userLink = document.createElement("a");
        userLink.className   = "nav-link fw-bold p-0";
        userLink.href        = profileHref;
        userLink.textContent = user.name.split(' ')[0];
        userLink.title       = user.role === 'admin' ? 'Gerenciar usuários' : 'Meu perfil';
        userLink.style.cssText = "cursor:pointer;text-decoration:none;";

        const signOutBtn = document.createElement("a");
        signOutBtn.className = "nav-link text-danger p-0 d-flex align-items-center";
        signOutBtn.href      = "#";
        signOutBtn.title     = "Sair";
        signOutBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/></svg>`;

        signOutBtn.addEventListener("click", (e) => {
          e.preventDefault();

          // Envia beacon de logout com duração da sessão
          try {
            const sessionStart   = sessionStorage.getItem("cv_session_start");
            const sessionDuration = sessionStart
              ? Math.round((Date.now() - parseInt(sessionStart)) / 60000)
              : null;
            const apiBase = window.API_BASE || "https://crescer-verde-app.vercel.app";
            navigator.sendBeacon(
              `${apiBase}/api/auth/logout`,
              new Blob([JSON.stringify({ sessionDuration, token })], { type: "application/json" })
            );
          } catch (_) {}

          localStorage.removeItem("user");
          localStorage.removeItem("token");
          sessionStorage.removeItem("cv_session_start");
          window.location.href = "/index.html";
        });

        li.innerHTML = '';
        li.appendChild(userLink);
        li.appendChild(signOutBtn);
      });

      // Oculta link de certificados para admin
      if (user.role === 'admin') {
        document.querySelectorAll('.nav-link[href*="certificados.html"]').forEach(link => {
          if (link.parentElement) link.parentElement.style.display = 'none';
        });
      }
    } catch (_) {}
  }
});
