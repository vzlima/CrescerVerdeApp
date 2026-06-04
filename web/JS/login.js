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

    // ── Show/hide senha ──────────────────────────────────────────────────────
    document.querySelectorAll(".toggle-pw").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            const icon  = btn.querySelector("i");
            if (input.type === "password") {
                input.type    = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");
                btn.setAttribute("aria-label", "Ocultar senha");
            } else {
                input.type    = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");
                btn.setAttribute("aria-label", "Mostrar senha");
            }
        });
    });

    // ── Gerador de senha segura ──────────────────────────────────────────────
    function generatePassword() {
        const upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lower   = "abcdefghijkmnpqrstuvwxyz";
        const digits  = "23456789";
        const special = "@#$%&*!";
        const all     = upper + lower + digits + special;

        // Garante pelo menos 1 de cada categoria
        const required = [
            upper[crypto.getRandomValues(new Uint32Array(1))[0] % upper.length],
            lower[crypto.getRandomValues(new Uint32Array(1))[0] % lower.length],
            digits[crypto.getRandomValues(new Uint32Array(1))[0] % digits.length],
            special[crypto.getRandomValues(new Uint32Array(1))[0] % special.length],
        ];

        const rest = Array.from(crypto.getRandomValues(new Uint32Array(8)),
            v => all[v % all.length]);

        // Embaralha
        const pw = [...required, ...rest];
        for (let i = pw.length - 1; i > 0; i--) {
            const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
            [pw[i], pw[j]] = [pw[j], pw[i]];
        }
        return pw.join("");
    }

    document.getElementById("generate-pw-btn").addEventListener("click", () => {
        const pw     = generatePassword();
        const input  = document.getElementById("reg-password");
        const confirm = document.getElementById("reg-password-confirm");

        input.value   = pw;
        confirm.value = pw;

        // Mostra a senha gerada em texto para o usuário copiar
        input.type   = "text";
        confirm.type = "text";
        document.querySelector('[data-target="reg-password"] i').classList.replace("fa-eye", "fa-eye-slash");
        document.querySelector('[data-target="reg-password-confirm"] i').classList.replace("fa-eye", "fa-eye-slash");

        updateStrength(pw);

        // Copia para clipboard
        navigator.clipboard?.writeText(pw).then(() => {
            const btn = document.getElementById("generate-pw-btn");
            btn.innerHTML = '<i class="fas fa-check"></i> Copiada!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-dice"></i> Gerar senha segura';
            }, 2000);
        });
    });

    // ── Indicador de força de senha ──────────────────────────────────────────
    function scorePassword(pw) {
        let score = 0;
        if (pw.length >= 8)  score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[@#$%&*!^()\-_=+]/.test(pw)) score++;
        return score; // 0-6
    }

    function updateStrength(pw) {
        const bar   = document.getElementById("pw-strength-bar");
        const label = document.getElementById("pw-strength-label");
        if (!bar || !label) return;

        const score = scorePassword(pw);
        const levels = [
            { pct: 0,   color: "",          text: "" },
            { pct: 16,  color: "#e53935",   text: "Muito fraca" },
            { pct: 33,  color: "#ef6c00",   text: "Fraca" },
            { pct: 50,  color: "#f9a825",   text: "Razoável" },
            { pct: 66,  color: "#7cb342",   text: "Boa" },
            { pct: 83,  color: "#2e7d32",   text: "Forte" },
            { pct: 100, color: "#1b5e20",   text: "Muito forte" },
        ];
        const lvl = levels[Math.min(score, 6)];
        bar.style.width      = lvl.pct + "%";
        bar.style.background = lvl.color;
        label.textContent    = pw.length ? lvl.text : "";
        label.style.color    = lvl.color;
    }

    document.getElementById("reg-password")?.addEventListener("input", (e) => {
        updateStrength(e.target.value);
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

                if (data.user.role === "guardian") {
                    window.location.href = "/HTML/painel-parental.html";
                } else if (data.user.role === "admin") {
                    window.location.href = "/HTML/jogos.html";
                } else {
                    // Mostra onboarding apenas na 1ª sessão de alunos
                    const onboarded = localStorage.getItem("cv_onboarded");
                    window.location.href = onboarded ? "/HTML/jogos.html" : "/HTML/onboarding.html";
                }
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
        regError.textContent     = msg;
        regError.style.display   = "block";
        regSuccess.style.display = "none";
    }

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        regError.style.display   = "none";
        regSuccess.style.display = "none";

        const name            = document.getElementById("reg-name").value.trim();
        const email           = document.getElementById("reg-email").value.trim();
        const guardianEmail   = guardianEmailInput.value.trim();
        const password        = document.getElementById("reg-password").value;
        const passwordConfirm = document.getElementById("reg-password-confirm").value;
        const termsAccepted   = document.getElementById("reg-terms").checked;
        const submitBtn       = document.getElementById("register-submit-btn");

        if (!termsAccepted) {
            return showRegError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
        }
        if (password.length < 8) {
            return showRegError("A senha deve ter pelo menos 8 caracteres.");
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
                regSuccess.textContent   = "Conta criada com sucesso! Redirecionando para o login...";
                regSuccess.style.display = "block";
                registerForm.reset();
                updateStrength("");
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
