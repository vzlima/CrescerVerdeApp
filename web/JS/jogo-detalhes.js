let currentCourseId = null;
let currentUser = null;
let isAdmin = false;
let courseContents = [];
let completedContentIds = [];
let activeContentId = null;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentCourseId = urlParams.get('id');

  if (!currentCourseId) {
    showToast("Jogo não encontrado.");
    window.location.href = "/HTML/jogos.html";
    return;
  }

  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      currentUser = JSON.parse(userStr);
      isAdmin = currentUser.role === 'admin';
    } catch (e) {}
  } else {
    window.location.href = "/HTML/login.html";
    return;
  }

  if (isAdmin) {
    document.getElementById("admin-actions-section").style.display = "block";
  } else {
    document.getElementById("student-progress-section").style.display = "block";
  }

  loadCourseDetails();
  loadContentsAndProgress();

  document.getElementById("contentForm").addEventListener("submit", handleContentSubmit);

  // Listener for Game Completion events — aceita string legada E objeto {type}
  window.addEventListener("message", (event) => {
    const d = event.data;
    const isComplete = d === "GAME_COMPLETED"
      || (d && (d.type === "GAME_COMPLETE" || d.type === "GAME_COMPLETED"));
    if (!isComplete) return;

    const btn = document.getElementById("mark-completed-btn");
    if (btn && btn.disabled === false) return; // já habilitado
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Marcar como Concluído";
      btn.classList.remove("btn-warning", "btn-secondary");
      btn.classList.add("btn-success");
    }
  });
});

async function loadCourseDetails() {
  try {
    const response = await fetch(API_BASE + "/api/courses");
    const data = await response.json();
    if (response.ok) {
      const course = data.courses.find(c => c._id === currentCourseId);
      if (course) {
        document.getElementById("course-title").textContent = course.title;
        document.getElementById("course-desc").textContent = course.description;
      }
    }
    // Registra abertura da trilha (fire-and-forget, apenas alunos)
    if (!isAdmin && currentUser) {
      const token = localStorage.getItem("token");
      fetch(API_BASE + "/api/courseProgress/open", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: currentCourseId }),
      }).catch(() => {});
    }
  } catch (err) {
    // course title stays as fallback
  }
}

async function loadContentsAndProgress() {
  const token = localStorage.getItem("token");
  try {
    const contentRes = await fetch(`${API_BASE}/api/courseContents/listByCourseId/${currentCourseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
    });
    const contentData = await contentRes.json();
    if (contentRes.ok) {
      courseContents = contentData.courseContents || [];
      courseContents.sort((a, b) => a.order - b.order);
    }

    if (!isAdmin) {
      const progRes = await fetch(API_BASE + "/api/courseProgress/get", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId: currentUser.id, courseId: currentCourseId })
      });
      const progData = await progRes.json();
      if (progRes.ok && progData.courseProgress) {
        completedContentIds = progData.courseProgress.completedContents || [];
        if (progData.courseProgress.isCourseCompleted) {
          document.getElementById("course-completed-alert").style.display = "block";
          const btn = document.getElementById("concluir-curso-btn");
          if (btn) btn.style.display = "none";
        }
      }
      updateProgressBar();
    }

    renderContentList();
    checkFullCompletion();

    // Auto-seleciona o conteúdo se há apenas um (ex: trilhas com 1 jogo)
    if (!isAdmin && courseContents.length === 1) {
      window.selectContent(courseContents[0]._id);
    }
  } catch (err) {
    // silently ignore — content list stays in last-known state
  }
}

function updateProgressBar() {
  if (courseContents.length === 0) return;
  const percentage = Math.round((completedContentIds.length / courseContents.length) * 100);
  const bar = document.getElementById("course-progress-bar");
  bar.style.width = percentage + "%";
  bar.textContent = percentage + "%";
  document.getElementById("course-progress-text").textContent = `${completedContentIds.length} de ${courseContents.length} conteúdos concluídos`;
}

function renderContentList() {
  const list = document.getElementById("content-list");
  list.innerHTML = "";

  if (courseContents.length === 0) {
    list.innerHTML = '<li class="list-group-item text-center">Nenhum conteúdo disponível.</li>';
    document.getElementById("content-viewer").innerHTML = '<div class="text-center text-muted my-5"><h4>Nenhum conteúdo adicionado ainda.</h4></div>';
    return;
  }

  courseContents.forEach((c) => {
    const isCompleted = completedContentIds.includes(c._id);
    const icon = isCompleted ? "✅" : (isAdmin ? "⚙️" : "🔒");

    // Admins have action buttons here implicitly
    const adminHtml = isAdmin ? `
      <div class="mt-2 text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="window.prepareEditContent('${c._id}', event)">Editar</button>
      </div>` : "";

    const li = document.createElement("li");
    li.className = `list-group-item content-list-item d-flex flex-column`;
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span><strong>${c.order}.</strong> ${c.title}</span>
        <span>${icon}</span>
      </div>
      ${adminHtml}
    `;
    li.onclick = () => window.selectContent(c._id);
    list.appendChild(li);
  });
}

window.selectContent = function (contentId) {
  activeContentId = contentId;
  const content = courseContents.find(c => c._id === contentId);
  if (!content) return;

  const viewer = document.getElementById("content-viewer");
  viewer.innerHTML = `<h4>${content.title}</h4><hr/>`;

  if (content.type === 'video') {
    let embedUrl = content.content;
    let videoId = "";

    if (embedUrl.includes("youtube.com/watch")) {
      try {
        const urlObj = new URL(embedUrl);
        videoId = urlObj.searchParams.get("v");
      } catch (e) {}
    } else if (embedUrl.includes("youtu.be/")) {
      videoId = embedUrl.split("youtu.be/")[1].split("?")[0];
    } else if (embedUrl.includes("youtube.com/embed/")) {
      videoId = embedUrl.split("youtube.com/embed/")[1].split("?")[0];
    }

    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    viewer.innerHTML += `<div class="ratio ratio-16x9">
      <iframe src="${embedUrl}" title="YouTube video" allowfullscreen></iframe>
    </div>`;
  } else if (content.type === 'game') {
    const container = document.createElement('div');
    container.className = "mt-4";
    container.style = "width: 100%; height: 600px;";

    const iframe = document.createElement('iframe');
    iframe.sandbox = "allow-scripts allow-same-origin";
    iframe.style = "width: 100%; height: 100%; border: none;";
    iframe.srcdoc = content.content;

    container.appendChild(iframe);
    viewer.appendChild(container);
  } else {
    viewer.innerHTML += `<div class="mt-3"><p style="white-space: pre-wrap;">${content.content}</p></div>`;
  }

  if (!isAdmin) {
    const isCompleted = completedContentIds.includes(content._id);
    const btn = document.getElementById("mark-completed-btn");
    document.getElementById("content-actions").style.display = "block";

    if (isCompleted) {
      btn.textContent = "Concluído";
      btn.className = "btn btn-secondary";
      btn.disabled = true;
    } else if (content.type === 'game') {
      btn.textContent = "Complete o jogo para concluir";
      btn.className = "btn btn-warning";
      btn.disabled = true;
    } else {
      btn.textContent = "Marcar como Concluído";
      btn.className = "btn btn-success";
      btn.disabled = false;
    }
  } else {
    // Admin vê o jogo mas sem botão de progresso
    document.getElementById("content-actions").style.display = "none";
  }
};

window.markContentCompleted = async function () {
  if (!activeContentId || isAdmin) return;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(API_BASE + "/api/courseProgress/addContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ userId: currentUser.id, courseId: currentCourseId, contentId: activeContentId })
    });

    if (res.ok) {
      completedContentIds.push(activeContentId);
      window.selectContent(activeContentId);
      updateProgressBar();
      renderContentList();
      checkFullCompletion();
    } else {
      showToast("Erro ao marcar como concluído.");
    }
  } catch (err) {
    showToast("Erro ao marcar como concluído.");
  }
};

function checkFullCompletion() {
  if (completedContentIds.length === courseContents.length && courseContents.length > 0) {
    document.getElementById("course-completed-alert").style.display = "block";
  }
}

window.concluirCurso = async function () {
  const token = localStorage.getItem("token");
  const btn = document.getElementById("concluir-curso-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Gerando...";
  }

  try {
    // 1. Marca como concluído no servidor
    await fetch(API_BASE + "/api/courseProgress/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ userId: currentUser.id, courseId: currentCourseId, isCourseCompleted: true })
    });

    const certRes = await fetch(API_BASE + "/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ userId: currentUser.id, courseId: currentCourseId })
    });

    if (!certRes.ok) {
      throw new Error("Erro ao emitir certificado.");
    }

    // 3. Imprime Certificado
    await printCertificate();

    if (btn) {
      btn.textContent = "Certificado Aberto";
      btn.classList.replace("btn-primary", "btn-success");
      btn.disabled = false;
      btn.onclick = printCertificate; // Imprimir de novo
    }
  } catch (err) {
    showToast("Erro ao emitir certificado.");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Concluir Jogo";
    }
  }
};

async function printCertificate() {
  const res = await fetch("/HTML/template-certificate.html");
  if (!res.ok) throw new Error("Template não encontrado");
  let templateText = await res.text();

  const courseTitle = document.getElementById("course-title").textContent;
  const userName = currentUser.name || "Aluno";
  const dateStr = new Date().toLocaleDateString("pt-BR");

  templateText = templateText.replace("[NOME_ALUNO]", userName);
  templateText = templateText.replace("[NOME_CURSO]", courseTitle);
  templateText = templateText.replace("[DATA_CONCLUSAO]", dateStr);
  templateText = templateText.replace("DATA_EMISSAO", dateStr);

  const scriptPrint = `<script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 500);
    };
  </script>`;

  if (templateText.includes("</body>")) {
    templateText = templateText.replace("</body>", scriptPrint + "</body>");
  } else {
    templateText += scriptPrint;
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(templateText);
    printWindow.document.close();
  } else {
    showToast("Permita pop-ups para imprimir o certificado.", "warning");
  }
}

// ADMIN ACTIONS
window.prepareAddContent = function () {
  document.getElementById("contentForm").reset();
  document.getElementById("contentId").value = "";
  document.getElementById("deleteContentBtn").style.display = "none";
  window.toggleContentInput();
};

window.prepareEditContent = function (id, event) {
  event.stopPropagation();
  const content = courseContents.find(c => c._id === id);
  if (!content) return;

  document.getElementById("contentId").value = content._id;
  document.getElementById("contentTitle").value = content.title;
  document.getElementById("contentType").value = content.type;
  window.toggleContentInput();
  document.getElementById("contentData").value = content.content;
  document.getElementById("contentOrder").value = content.order;

  document.getElementById("deleteContentBtn").style.display = "block";

  const modalElement = document.getElementById('contentModal');
  const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
  modalInstance.show();
};

window.toggleContentInput = function () {
  const type = document.getElementById("contentType").value;
  const label = document.getElementById("contentDataLabel");
  if (type === 'video') label.textContent = "URL do Vídeo (Youtube)";
  else if (type === 'game') label.textContent = "Código HTML do Jogo/Atividade";
  else label.textContent = "Texto do Conteúdo";
};

async function handleContentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("contentId").value;
  const title = document.getElementById("contentTitle").value;
  const type = document.getElementById("contentType").value;
  const content = document.getElementById("contentData").value;
  const order = parseInt(document.getElementById("contentOrder").value || "0");

  const token = localStorage.getItem("token");
  const url = id
    ? `${API_BASE}/api/courseContents/update/${id}`
    : API_BASE + "/api/courseContents/create";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ title, type, content, order, courseId: currentCourseId })
    });

    if (res.ok) {
      const modalElement = document.getElementById('contentModal');
      bootstrap.Modal.getInstance(modalElement).hide();
      loadContentsAndProgress();
    } else {
      document.getElementById("modal-error").textContent = "Erro ao salvar conteúdo.";
      document.getElementById("modal-error").style.display = "block";
    }
  } catch (err) {
    document.getElementById("modal-error").textContent = "Erro ao salvar conteúdo.";
    document.getElementById("modal-error").style.display = "block";
  }
}

window.deleteContent = async function () {
  const id = document.getElementById("contentId").value;
  if (!id) return;

  cvConfirm("Excluir este conteúdo permanentemente?", async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/courseContents/delete/${id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const modalElement = document.getElementById('contentModal');
        bootstrap.Modal.getInstance(modalElement).hide();
        loadContentsAndProgress();
      } else {
        showToast("Erro ao excluir conteúdo.");
      }
    } catch (err) {
      showToast("Erro ao excluir conteúdo.");
    }
  }, { confirmTxt: "Excluir", icon: "fa-trash" });
};
