document.addEventListener("DOMContentLoaded", () => {

    // ── Toggle Login ↔ Cadastro ──────────────────────────────────────────────
    const loginForm    = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    document.getElementById("show-register-link").addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.style.display    = "none";
        registerForm.style.display = "block";
    });

    document.getElementById("show-login-link").addEventListener("click", (e) => {
        e.preventDefault();
        registerForm.style.display = "none";
        loginForm.style.display    = "block";
    });

    // ── Login ────────────────────────────────────────────────────────────────
    const errorDiv = document.getElementById("login-error");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorDiv.style.display = "none";
        errorDiv.textContent   = "";

        const email    = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(API_BASE + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                window.location.href = data.user.role === "guardian"
                    ? "/HTML/painel-parental.html"
                    : "/HTML/jogos.html";
            } else {
                errorDiv.textContent   = data.message || "Erro ao fazer login. Verifique suas credenciais.";
                errorDiv.style.display = "block";
            }
        } catch {
            errorDiv.textContent   = "Erro de conexão com o servidor.";
            errorDiv.style.display = "block";
        }
    });

    // ── Esqueci minha senha ──────────────────────────────────────────────────
    document.getElementById("forgot-password-link").addEventListener("click", (e) => {
        e.preventDefault();
        new bootstrap.Modal(document.getElementById("forgotPasswordModal")).show();
    });

    document.getElementById("forgot-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const infoDiv   = document.getElementById("forgot-info");
        const errDiv    = document.getElementById("forgot-error");
        const submitBtn = document.getElementById("forgot-submit-btn");
        const email     = document.getElementById("forgot-email").value.trim();

        infoDiv.style.display  = "none";
        errDiv.style.display   = "none";
        submitBtn.disabled     = true;
        submitBtn.textContent  = "Aguarde...";

        try {
            const res  = await fetch(API_BASE + "/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            infoDiv.textContent        = data.message || "Solicitação enviada.";
            infoDiv.style.display      = "block";
            document.getElementById("forgot-form").style.display = "none";
        } catch {
            errDiv.textContent    = "Erro de conexão com o servidor.";
            errDiv.style.display  = "block";
            submitBtn.disabled    = false;
            submitBtn.textContent = "Enviar link";
        }
    });

    // ── Cadastro — seletor de tipo de conta ──────────────────────────────────
    let selectedRole = "user";

    const roleCards           = document.querySelectorAll(".role-card");
    const guardianEmailField  = document.getElementById("guardian-email-field");
    const guardianEmailInput  = document.getElementById("reg-guardian-email");

    roleCards.forEach(card => {
        card.addEventListener("click", () => {
            roleCards.forEach(c => c.classList.remove("role-card--active"));
            card.classList.add("role-card--active");
            selectedRole = card.dataset.role;

            // Mostrar/ocultar campo do responsável conforme tipo escolhido
            if (selectedRole === "user") {
                guardianEmailField.style.display = "block";
                guardianEmailInput.required      = true;
            } else {
                guardianEmailField.style.display = "none";
                guardianEmailInput.required      = false;
                guardianEmailInput.value         = "";
            }
        });
    });

    // ── Cadastro — submit ────────────────────────────────────────────────────
    const regError   = document.getElementById("register-error");
    const regSuccess = document.getElementById("register-success");

    function showRegError(msg) {
        regError.textContent   = msg;
        regError.style.display = "block";
        regSuccess.style.display = "none";
    }

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        regError.style.display   = "none";
        regSuccess.style.display = "none";

        const name             = document.getElementById("reg-name").value.trim();
        const email            = document.getElementById("reg-email").value.trim();
        const guardianEmail    = guardianEmailInput.value.trim();
        const password         = document.getElementById("reg-password").value;
        const passwordConfirm  = document.getElementById("reg-password-confirm").value;
        const termsAccepted    = document.getElementById("reg-terms").checked;
        const submitBtn        = document.getElementById("register-submit-btn");

        if (!termsAccepted) {
            return showRegError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
        }
        if (password !== passwordConfirm) {
            return showRegError("As senhas não coincidem.");
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = "Criando conta...";

        const body = { name, email, password, role: selectedRole };
        if (selectedRole === "user") body.guardianEmail = guardianEmail;

        try {
            const res  = await fetch(API_BASE + "/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (res.ok) {
                regSuccess.textContent   = "Conta criada! Agora entre com seus dados.";
                regSuccess.style.display = "block";
                registerForm.reset();
                selectedRole = "user";
                roleCards.forEach(c => c.classList.remove("role-card--active"));
                document.querySelector('[data-role="user"]').classList.add("role-card--active");
                guardianEmailField.style.display = "block";

                setTimeout(() => {
                    registerForm.style.display = "none";
                    loginForm.style.display    = "block";
                }, 2000);
            } else {
                showRegError(data.message || "Erro ao criar conta.");
            }
        } catch {
            showRegError("Erro de conexão com o servidor.");
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = "Criar conta";
        }
    });
});
