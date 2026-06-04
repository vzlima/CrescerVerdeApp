const API_BASE_URL = (window.API_BASE || "") + "/api";
let currentUserIdToDelete = null;
let lastCreatedUserId = null;
let globalUsersData = [];

const PLAN_LABEL = { free: 'Gratuito', familia: 'Família', escola: 'Escola' };
const PLAN_COLOR = { free: '#27ae60', familia: '#2980b9', escola: '#8e44ad' };

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (!token || !userStr) { window.location.href = "/HTML/login.html"; return; }
  try {
    const user = JSON.parse(userStr);
    if (user.role !== "admin") {
      showToast("Acesso negado. Apenas administradores.", "warning");
      window.location.href = "/index.html";
      return;
    }
  } catch (e) { window.location.href = "/HTML/login.html"; return; }

  loadUsers();
  document.getElementById("user-form").addEventListener("submit", handleUserFormSubmit);
  document.getElementById("confirm-delete-btn").addEventListener("click", executeDeleteUser);
  document.getElementById("change-password-form").addEventListener("submit", handleChangePasswordSubmit);

  const copyBtn = document.getElementById("copyPasswordBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const pwdInput = document.getElementById("generatedPasswordDisplay");
      if (pwdInput?.value) {
        navigator.clipboard.writeText(pwdInput.value)
          .then(() => {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check2-all me-2"></i>Copiado!';
            copyBtn.classList.replace('btn-success', 'btn-dark');
            setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.classList.replace('btn-dark', 'btn-success'); }, 2000);
          })
          .catch(() => showToast("Erro ao copiar senha."));
      }
    });
  }

  document.getElementById("openChangePasswordBtn")?.addEventListener("click", () => {
    bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
    if (lastCreatedUserId) {
      document.getElementById("change-password-user-id").value = lastCreatedUserId;
      document.getElementById("change-password-form").reset();
      document.getElementById("change-password-error").style.display = "none";
      new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
    }
  });
});

/* ── Auth ── */
function getAuthHeaders() {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` };
}

/* ── Messages ── */
function showMessage(type, text) {
  const err = document.getElementById("error-message");
  const ok  = document.getElementById("success-message");
  err.style.display = ok.style.display = "none";
  if (type === "error") { err.textContent = text; err.style.display = "block"; }
  else { ok.textContent = text; ok.style.display = "block"; setTimeout(() => { ok.style.display = "none"; }, 3000); }
}

/* ── Load ── */
async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Carregando usuários...</td></tr>';
  try {
    const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) { globalUsersData = data.users || []; filterUsersByRole(); }
    else tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Erro: ${data.error || 'Falha ao carregar'}</td></tr>`;
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Erro de conexão.</td></tr>'; }
}

/* ── Filter + Render ── */
function filterUsersByRole() {
  const val = document.getElementById("role-filter").value;
  renderUsers(val === "all" ? globalUsersData : globalUsersData.filter(u => u.role === val));
}

function findGuardianOfMinor(minorId) {
  return globalUsersData.find(u =>
    u.role === "guardian" && Array.isArray(u.guardianOf) &&
    u.guardianOf.map(String).includes(String(minorId))
  ) || null;
}

function renderUsers(users) {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Nenhum usuário encontrado.</td></tr>';
    return;
  }

  const roleBadge = {
    admin:    '<span class="badge bg-light-success border border-success border-opacity-25 rounded-pill"><i class="bi bi-shield-lock-fill me-1"></i>Admin</span>',
    guardian: '<span class="badge bg-light-warning border border-warning border-opacity-25 rounded-pill"><i class="bi bi-person-heart me-1"></i>Responsável</span>',
    user:     '<span class="badge bg-light-secondary border border-secondary border-opacity-25 rounded-pill"><i class="bi bi-person-fill me-1"></i>Aluno</span>',
  };

  users.forEach(u => {
    const displayName = u.name || '(sem nome)';
    const safeName = displayName.replace(/'/g, "\\'");
    const role = roleBadge[u.role] || roleBadge.user;
    const plan = u.plan || 'free';
    const planLabel = `<span class="plan-dot ${plan}"></span>${PLAN_LABEL[plan] || plan}`;

    let vínculo = '<span class="text-muted small">—</span>';
    if (u.role === "guardian") {
      const linked = globalUsersData.filter(x => x.isMinor && Array.isArray(u.guardianOf) && u.guardianOf.map(String).includes(String(x._id)));
      vínculo = linked.length
        ? `<span class="badge bg-light-primary border border-primary border-opacity-25 rounded-pill small"><i class="bi bi-people me-1"></i>${linked.length} aluno${linked.length > 1 ? 's' : ''}</span>`
        : '<span class="text-muted small">Sem alunos</span>';
    } else if (u.isMinor) {
      const guardian = findGuardianOfMinor(u._id);
      vínculo = guardian
        ? `<span class="badge bg-light-warning border border-warning border-opacity-25 rounded-pill small"><i class="bi bi-person-heart me-1"></i>${guardian.name}</span>`
        : `<span class="badge bg-light-secondary border border-secondary border-opacity-25 rounded-pill small text-muted"><i class="bi bi-person-x me-1"></i>Sem responsável</span>`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="ps-4 fw-medium text-dark">${displayName}${u.isMinor ? ' <span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 rounded-pill" style="font-size:.7rem">menor</span>' : ''}</td>
      <td class="text-muted small">${u.email || ''}</td>
      <td>${role}</td>
      <td class="small">${planLabel}</td>
      <td>${vínculo}</td>
      <td class="text-end pe-4">
        <button class="btn btn-sm btn-light text-primary border action-btn me-1" onclick="openEditModal('${u._id}')" title="Editar"><i class="bi bi-pencil-fill"></i></button>
        <button class="btn btn-sm btn-light text-danger border action-btn" onclick="openDeleteModal('${u._id}', '${safeName}')" title="Excluir"><i class="bi bi-trash3-fill"></i></button>
      </td>`;
    tbody.appendChild(row);
  });
}

/* ── Modal helpers ── */
function rebuildResponsavelDropdown(currentGuardianId) {
  const sel = document.getElementById("responsavel-select");
  sel.innerHTML = '<option value="">— Nenhum responsável —</option>';
  globalUsersData.filter(u => u.role === "guardian").forEach(g => {
    const opt = document.createElement("option");
    opt.value = g._id;
    opt.textContent = `${g.name} (${g.email})`;
    if (String(g._id) === String(currentGuardianId)) opt.selected = true;
    sel.appendChild(opt);
  });
}

function rebuildGuardianOfChecklist(currentGuardianOf = []) {
  const list = document.getElementById("guardian-of-list");
  const minors = globalUsersData.filter(u => u.isMinor);
  if (!minors.length) {
    list.innerHTML = '<small class="text-muted">Nenhum aluno cadastrado como menor ainda.</small>';
    return;
  }
  const currentIds = currentGuardianOf.map(String);
  list.innerHTML = "";
  minors.forEach(m => {
    const div = document.createElement("div");
    div.className = "form-check";
    div.innerHTML = `
      <input class="form-check-input guardian-of-checkbox" type="checkbox" value="${m._id}" id="gof-${m._id}" ${currentIds.includes(String(m._id)) ? "checked" : ""}>
      <label class="form-check-label small" for="gof-${m._id}">${m.name} <span class="text-muted">(${m.email})</span></label>`;
    list.appendChild(div);
  });
}

function resetUserModal() {
  document.getElementById("user-form").reset();
  document.getElementById("user-id").value = "";
  document.getElementById("userModalLabel").textContent = "Novo Usuário";
  document.getElementById("password-container").style.display = "block";
  document.getElementById("terms-check-container").style.display = "block";
  document.getElementById("accept-terms-check").setAttribute("required", "");
  document.getElementById("minor-container").style.display = "flex";
  document.getElementById("responsavel-container").style.display = "none";
  document.getElementById("guardian-of-container").style.display = "none";
  document.getElementById("guardian-of-list").innerHTML = '<small class="text-muted">Nenhum aluno menor cadastrado ainda.</small>';
}

async function openEditModal(id) {
  resetUserModal();
  document.getElementById("userModalLabel").textContent = "Editar Usuário";
  document.getElementById("user-id").value = id;
  document.getElementById("password-container").style.display = "none";
  document.getElementById("terms-check-container").style.display = "none";
  document.getElementById("accept-terms-check").removeAttribute("required");

  try {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.user) {
      const u = data.user;
      document.getElementById("user-name").value = u.name;
      document.getElementById("user-email").value = u.email;
      document.getElementById("user-role").value = u.role || "user";
      document.getElementById("user-plan").value = u.plan || "free";
      document.getElementById("user-is-minor").checked = !!u.isMinor;

      if (u.role === "guardian") {
        document.getElementById("minor-container").style.display = "none";
        document.getElementById("responsavel-container").style.display = "none";
        document.getElementById("guardian-of-container").style.display = "block";
        rebuildGuardianOfChecklist(u.guardianOf || []);
      } else {
        document.getElementById("minor-container").style.display = "flex";
        document.getElementById("guardian-of-container").style.display = "none";
        if (u.isMinor) {
          document.getElementById("responsavel-container").style.display = "block";
          const guardian = findGuardianOfMinor(id);
          rebuildResponsavelDropdown(guardian?._id || null);
        } else {
          document.getElementById("responsavel-container").style.display = "none";
        }
      }

      new bootstrap.Modal(document.getElementById('userModal')).show();
    } else {
      showMessage("error", "Não foi possível carregar os dados do usuário.");
    }
  } catch { showMessage("error", "Erro ao buscar dados do usuário."); }
}

function onRoleChange() {
  const role = document.getElementById("user-role").value;
  if (role === "guardian") {
    document.getElementById("minor-container").style.display = "none";
    document.getElementById("responsavel-container").style.display = "none";
    document.getElementById("guardian-of-container").style.display = "block";
    rebuildGuardianOfChecklist([]);
  } else {
    document.getElementById("minor-container").style.display = "flex";
    document.getElementById("guardian-of-container").style.display = "none";
    onIsMinorChange();
  }
}

function onIsMinorChange() {
  const isMinor = document.getElementById("user-is-minor").checked;
  const role = document.getElementById("user-role").value;
  if (role !== "guardian" && isMinor) {
    document.getElementById("responsavel-container").style.display = "block";
    rebuildResponsavelDropdown(null);
  } else {
    document.getElementById("responsavel-container").style.display = "none";
  }
}

/* ── Submit ── */
async function handleUserFormSubmit(e) {
  e.preventDefault();

  const id       = document.getElementById("user-id").value;
  const name     = document.getElementById("user-name").value;
  const email    = document.getElementById("user-email").value;
  const role     = document.getElementById("user-role").value;
  const plan     = document.getElementById("user-plan").value;
  const isMinor  = document.getElementById("user-is-minor").checked;
  const isUpdate = id !== "";

  const payload = { name, email, role, plan, isMinor };

  if (role === "guardian") {
    payload.guardianOf = Array.from(document.querySelectorAll(".guardian-of-checkbox:checked")).map(cb => cb.value);
  }

  let generatedPassword = null;
  if (!isUpdate) {
    generatedPassword = generateRandomPassword(8);
    payload.password = generatedPassword;
  }

  const url    = isUpdate ? `${API_BASE_URL}/users/${id}` : `${API_BASE_URL}/users`;
  const method = isUpdate ? "PUT" : "POST";

  try {
    const res  = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) { showToast(`Erro: ${data.error || data.message || 'Falha ao salvar'}`); return; }

    const savedId = isUpdate ? id : (data.user?._id || null);

    // Vinculação responsável ↔ aluno
    if (role !== "guardian" && isMinor && savedId) {
      const selectedGuardianId = document.getElementById("responsavel-select")?.value || "";
      const prevGuardian = findGuardianOfMinor(id);
      const prevGuardianId = prevGuardian ? String(prevGuardian._id) : "";

      if (selectedGuardianId !== prevGuardianId) {
        // Remove do responsável antigo
        if (prevGuardianId) {
          const oldGof = (prevGuardian.guardianOf || []).map(String).filter(x => x !== String(savedId));
          await fetch(`${API_BASE_URL}/users/${prevGuardianId}`, {
            method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ guardianOf: oldGof })
          });
        }
        // Adiciona ao novo responsável
        if (selectedGuardianId) {
          const newGuardian = globalUsersData.find(u => String(u._id) === selectedGuardianId);
          const newGof = [...new Set([...(newGuardian?.guardianOf || []).map(String), String(savedId)])];
          await fetch(`${API_BASE_URL}/users/${selectedGuardianId}`, {
            method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ guardianOf: newGof })
          });
        }
      }
    }

    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();

    if (isUpdate) {
      showMessage("success", "Usuário atualizado com sucesso!");
    } else {
      lastCreatedUserId = savedId;
      document.getElementById("generatedPasswordDisplay").value = generatedPassword;
      document.getElementById("accept-terms-check").setAttribute("required", "");
      new bootstrap.Modal(document.getElementById('passwordModal')).show();
      showMessage("success", "Usuário criado com sucesso!");
    }

    loadUsers();
  } catch { showToast("Erro de conexão ao salvar usuário."); }
}

/* ── Change Password ── */
async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const userId  = document.getElementById("change-password-user-id").value;
  const newPwd  = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-new-password").value;
  const errDiv  = document.getElementById("change-password-error");
  errDiv.style.display = "none";

  if (newPwd !== confirm) { errDiv.textContent = "As senhas não coincidem."; errDiv.style.display = "block"; return; }

  try {
    const res  = await fetch(`${API_BASE_URL}/users/${userId}/password`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ newPassword: newPwd }) });
    const data = await res.json();
    if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide(); showMessage("success", "Senha alterada com sucesso!"); }
    else { errDiv.textContent = data.error || "Erro ao alterar senha."; errDiv.style.display = "block"; }
  } catch { errDiv.textContent = "Erro de conexão."; errDiv.style.display = "block"; }
}

/* ── Delete ── */
function openDeleteModal(id, name) {
  currentUserIdToDelete = id;
  document.getElementById("delete-user-name").textContent = name;
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function executeDeleteUser() {
  if (!currentUserIdToDelete) return;
  try {
    const res  = await fetch(`${API_BASE_URL}/users/${currentUserIdToDelete}`, { method: "DELETE", headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide(); showMessage("success", "Usuário removido com sucesso!"); loadUsers(); }
    else showToast(`Erro: ${data.error || 'Falha ao deletar'}`);
  } catch { showToast("Erro de conexão ao deletar usuário."); }
  finally { currentUserIdToDelete = null; }
}

/* ── Util ── */
function generateRandomPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let r = "";
  for (let i = 0; i < length; i++) r += charset[Math.floor(Math.random() * charset.length)];
  return r;
}
