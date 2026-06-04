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
  const filtered = val === "all" ? globalUsersData : globalUsersData.filter(u => u.role === val);
  updateStats(globalUsersData);
  renderUsers(filtered);
}

function updateStats(users) {
  document.getElementById("stat-total").textContent    = users.length;
  document.getElementById("stat-alunos").textContent   = users.filter(u => u.role === "user").length;
  document.getElementById("stat-guardians").textContent = users.filter(u => u.role === "guardian").length;
  document.getElementById("stat-admins").textContent   = users.filter(u => u.role === "admin").length;
}

function findGuardianOfMinor(minorId) {
  return globalUsersData.find(u =>
    u.role === "guardian" && Array.isArray(u.guardianOf) &&
    u.guardianOf.map(String).includes(String(minorId))
  ) || null;
}

function getInitials(name) {
  return (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function renderUsers(users) {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <i class="fas fa-users-slash"></i>
        Nenhum usuário encontrado.
      </div>
    </td></tr>`;
    return;
  }

  const roleIcon  = { admin: 'fa-user-shield', guardian: 'fa-shield-alt', user: 'fa-graduation-cap' };
  const roleLabel = { admin: 'Admin', guardian: 'Responsável', user: 'Aluno' };
  const planIcon  = { free: 'fa-seedling', familia: 'fa-people-roof', escola: 'fa-school' };

  users.forEach(u => {
    const name     = u.name || '(sem nome)';
    const safeName = name.replace(/'/g, "\\'");
    const role     = u.role || 'user';
    const plan     = u.plan || 'free';

    // Avatar
    const avatar = `<div class="user-avatar role-${role}">${getInitials(name)}</div>`;

    // Name + minor tag
    const minorTag = u.isMinor
      ? '<span class="user-minor-tag">menor</span>'
      : '';
    const nameCell = `
      <div class="user-cell">
        ${avatar}
        <div>
          <div class="user-name">${name}${minorTag}</div>
        </div>
      </div>`;

    // Role badge
    const roleBadge = `<span class="role-badge ${role}">
      <i class="fas ${roleIcon[role] || 'fa-user'}" style="font-size:.7rem"></i>
      ${roleLabel[role] || role}
    </span>`;

    // Plan chip
    const planChip = `<span class="plan-chip ${plan}">
      <span class="plan-dot ${plan}"></span>
      ${PLAN_LABEL[plan] || plan}
    </span>`;

    // Vínculo
    let linkCell = '<span class="link-chip no-link"><i class="fas fa-minus" style="font-size:.65rem"></i> —</span>';
    if (role === "guardian") {
      const linked = globalUsersData.filter(x =>
        x.isMinor && Array.isArray(u.guardianOf) && u.guardianOf.map(String).includes(String(x._id))
      );
      linkCell = linked.length
        ? `<span class="link-chip student-count"><i class="fas fa-graduation-cap" style="font-size:.65rem"></i> ${linked.length} aluno${linked.length > 1 ? 's' : ''}</span>`
        : '<span class="link-chip no-link"><i class="fas fa-user-slash" style="font-size:.65rem"></i> Sem alunos</span>';
    } else if (u.isMinor) {
      const guardian = findGuardianOfMinor(u._id);
      linkCell = guardian
        ? `<span class="link-chip guardian-link"><i class="fas fa-shield-alt" style="font-size:.65rem"></i> ${guardian.name.split(' ')[0]}</span>`
        : '<span class="link-chip no-link"><i class="fas fa-user-slash" style="font-size:.65rem"></i> Sem responsável</span>';
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="ps-4">${nameCell}</td>
      <td><span class="user-email">${u.email || ''}</span></td>
      <td>${roleBadge}</td>
      <td>${planChip}</td>
      <td>${linkCell}</td>
      <td class="text-end pe-4">
        <button class="btn btn-sm btn-light text-primary border action-btn me-1"
          onclick="openEditModal('${u._id}')" title="Editar">
          <i class="bi bi-pencil-fill"></i>
        </button>
        <button class="btn btn-sm btn-light text-danger border action-btn"
          onclick="openDeleteModal('${u._id}', '${safeName}')" title="Excluir">
          <i class="bi bi-trash3-fill"></i>
        </button>
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
