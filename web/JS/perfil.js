document.addEventListener("DOMContentLoaded", async () => {
  const token   = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (!token || !userStr) { window.location.href = "/HTML/login.html"; return; }

  let user;
  try { user = JSON.parse(userStr); } catch { window.location.href = "/HTML/login.html"; return; }

  const API = (window.API_BASE || "") + "/api";

  // ── Avatar + header ─────────────────────────────────────
  const initials = (user.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  document.getElementById("profile-avatar").textContent    = initials;
  document.getElementById("profile-name").textContent      = user.name || "";
  const roleLabel = { user: "Aluno", guardian: "Responsável", admin: "Administrador" };
  document.getElementById("profile-role-chip").textContent = roleLabel[user.role] || user.role;

  // ── Preenche formulário com dados frescos ───────────────
  try {
    const res  = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok && data.user) {
      document.getElementById("pf-name").value  = data.user.name  || "";
      document.getElementById("pf-email").value = data.user.email || "";
    }
  } catch (_) {
    document.getElementById("pf-name").value  = user.name  || "";
    document.getElementById("pf-email").value = user.email || "";
  }

  // ── Show/hide senha ─────────────────────────────────────
  document.querySelectorAll(".toggle-pw").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const icon  = btn.querySelector("i");
      if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  });

  // ── Salvar perfil ───────────────────────────────────────
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("profile-form-error");
    const okDiv  = document.getElementById("profile-form-success");
    const btn    = document.getElementById("profile-save-btn");
    errDiv.style.display = okDiv.style.display = "none";

    const name  = document.getElementById("pf-name").value.trim();
    const email = document.getElementById("pf-email").value.trim();

    btn.disabled    = true;
    btn.textContent = "Salvando...";

    try {
      const res  = await fetch(`${API}/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        // Atualiza localStorage
        const fresh = { ...user, name: data.user.name, email: data.user.email };
        localStorage.setItem("user", JSON.stringify(fresh));
        document.getElementById("profile-avatar").textContent =
          (data.user.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
        document.getElementById("profile-name").textContent = data.user.name;
        okDiv.textContent    = "Perfil atualizado com sucesso!";
        okDiv.style.display  = "block";
      } else {
        errDiv.textContent   = data.error || "Erro ao salvar.";
        errDiv.style.display = "block";
      }
    } catch {
      errDiv.textContent   = "Erro de conexão.";
      errDiv.style.display = "block";
    } finally {
      btn.disabled    = false;
      btn.innerHTML   = '<i class="fas fa-save me-1"></i> Salvar';
    }
  });

  // ── Trocar senha ────────────────────────────────────────
  document.getElementById("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("pw-form-error");
    const okDiv  = document.getElementById("pw-form-success");
    const btn    = document.getElementById("pw-save-btn");
    errDiv.style.display = okDiv.style.display = "none";

    const currentPassword = document.getElementById("pf-current-pw").value;
    const newPassword     = document.getElementById("pf-new-pw").value;
    const confirmPassword = document.getElementById("pf-confirm-pw").value;

    if (newPassword.length < 8) {
      errDiv.textContent   = "A nova senha deve ter pelo menos 8 caracteres.";
      errDiv.style.display = "block"; return;
    }
    if (newPassword !== confirmPassword) {
      errDiv.textContent   = "As senhas não coincidem.";
      errDiv.style.display = "block"; return;
    }

    btn.disabled    = true;
    btn.textContent = "Alterando...";

    try {
      const res  = await fetch(`${API}/users/me/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        okDiv.textContent    = "Senha alterada com sucesso!";
        okDiv.style.display  = "block";
        document.getElementById("password-form").reset();
      } else {
        errDiv.textContent   = data.error || "Erro ao alterar senha.";
        errDiv.style.display = "block";
      }
    } catch {
      errDiv.textContent   = "Erro de conexão.";
      errDiv.style.display = "block";
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fas fa-key me-1"></i> Alterar senha';
    }
  });

  // ── Certificados ────────────────────────────────────────
  try {
    const res  = await fetch(`${API}/certificates/user/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const certs = await res.json();
    const list  = document.getElementById("certs-list");
    if (!Array.isArray(certs) || certs.length === 0) {
      list.innerHTML = '<p class="text-muted small mb-0">Nenhum certificado ainda. Complete uma trilha!</p>';
    } else {
      list.innerHTML = certs.slice(0, 5).map(c => {
        const date = new Date(c.date || Date.now()).toLocaleDateString("pt-BR");
        return `<div class="cert-mini">
          <div class="cert-mini-icon"><i class="fas fa-certificate"></i></div>
          <div>
            <div class="cert-mini-name">${c.courseName}</div>
            <div class="cert-mini-date">${date}</div>
          </div>
        </div>`;
      }).join("");
    }
  } catch (_) {
    document.getElementById("certs-list").innerHTML = '<p class="text-muted small mb-0">Erro ao carregar certificados.</p>';
  }

  // ── Deletar conta (LGPD) ────────────────────────────────
  document.getElementById("btn-delete-account").addEventListener("click", () => {
    cvConfirm(
      "Isso apagará permanentemente sua conta, progresso e certificados.<br><strong>Ação irreversível.</strong>",
      async () => {
        try {
          const res = await fetch(`${API}/users/me`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("cv_onboarded");
            window.location.href = "/index.html";
          } else {
            showToast("Erro ao excluir conta.");
          }
        } catch {
          showToast("Erro de conexão.");
        }
      },
      { confirmTxt: "Sim, excluir", confirmCls: "btn-danger", icon: "fa-trash-alt", iconColor: "#e53935" }
    );
  });
});
