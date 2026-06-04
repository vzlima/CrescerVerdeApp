async function loadCourses() {
  const coursesContainer = document.getElementById("courses-container");
  coursesContainer.innerHTML = '<div class="col w-100 text-center"><p>Carregando cursos...</p></div>';

  try {
    const response = await fetch(API_BASE + "/api/courses");
    const data = await response.json();

    if (response.ok) {
      const courses = data.courses || [];

      coursesContainer.innerHTML = "";

      if (courses.length === 0) {
        coursesContainer.innerHTML = '<div class="col w-100 text-center"><p>Nenhum curso disponível no momento.</p></div>';
        return;
      }

      const userStr = localStorage.getItem("user");
      let isAdmin = false;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          isAdmin = user.role === 'admin';
        } catch (e) { console.error(e); }
      }

      courses.forEach(course => {
        const imageUrl = course.coverImage || "/Imagens/logo.png";
        const safeCourseData = encodeURIComponent(JSON.stringify(course));

        const editButton = isAdmin ?
          `<button class="btn btn-sm btn-outline-secondary mt-2 w-100" onclick="event.stopPropagation(); window.openEditModal('${safeCourseData}')">Editar Curso</button>` : "";

        const cardProps = `style="cursor: pointer;" onclick="window.location.href='/HTML/curso-detalhes.html?id=${course._id}'"`;

        const courseCard = `
                    <div class="col">
                        <div class="card h-100" ${cardProps}>
                            <img src="${imageUrl}" class="card-img-top" alt="${course.title}" style="height: 200px; object-fit: cover;">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title fw-bold">${course.title}</h5>
                                <p class="card-text text-muted flex-grow-1">${course.description}</p>
                                ${editButton}
                            </div>
                        </div>
                    </div>
                `;
        coursesContainer.innerHTML += courseCard;
      });
    } else {
      console.error("Failed to load courses:", data.error);
      coursesContainer.innerHTML = `<div class="col w-100 text-center"><p class="text-danger">Erro: ${data.error}</p></div>`;
    }
  } catch (error) {
    console.error("Error fetching courses:", error);
    coursesContainer.innerHTML = '<div class="col w-100 text-center"><p class="text-danger">Erro de conexão com o servidor.</p></div>';
  }
}

window.openEditModal = function (encodedCourseData) {
  try {
    const course = JSON.parse(decodeURIComponent(encodedCourseData));

    document.getElementById("courseId").value = course._id;
    document.getElementById("courseTitle").value = course.title || "";
    document.getElementById("courseDescription").value = course.description || "";
    document.getElementById("courseCoverImage").value = course.coverImage || "";
    document.getElementById("courseVideoUrl").value = course.videoUrl || "";

    document.getElementById("courseModalLabel").textContent = "Editar Curso";
    document.getElementById("deleteCourseBtn").style.display = "block";

    document.getElementById("modal-error").style.display = "none";

    const modalElement = document.getElementById('courseModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modalInstance.show();
  } catch (error) {
    console.error("Error parsing course data for edit modal:", error);
  }
};

window.deleteCourse = async function () {
  const courseId = document.getElementById("courseId").value;
  if (!courseId) return;

  cvConfirm("Excluir permanentemente este curso?", async () => {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Usuário não autenticado.", "warning");
    try {
      const response = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const modalElement = document.getElementById('courseModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modalInstance.hide();
        loadCourses();
      } else {
        const data = await response.json();
        showToast(data.error || "Erro ao deletar curso");
      }
    } catch (error) {
      console.error("Error deleting course", error);
      showToast("Erro de conexão com o servidor ao excluir.");
    }
  }, { confirmTxt: "Excluir", icon: "fa-trash" });
};

document.addEventListener("DOMContentLoaded", () => {
  loadCourses();

  const deleteCourseBtn = document.getElementById("deleteCourseBtn");
  if (deleteCourseBtn) {
    deleteCourseBtn.addEventListener("click", window.deleteCourse);
  }

  const createCourseForm = document.getElementById("createCourseForm");
  if (createCourseForm) {
    createCourseForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const courseId = document.getElementById("courseId").value;
      const title = document.getElementById("courseTitle").value;
      const description = document.getElementById("courseDescription").value;
      const coverImage = document.getElementById("courseCoverImage").value;
      const videoUrl = document.getElementById("courseVideoUrl").value;
      const errorDiv = document.getElementById("modal-error");

      errorDiv.style.display = "none";
      errorDiv.textContent = "";

      const token = localStorage.getItem("token");
      if (!token) {
        errorDiv.textContent = "Erro: Usuário não autenticado.";
        errorDiv.style.display = "block";
        return;
      }

      try {
        const url = courseId ? `${API_BASE}/api/courses/${courseId}` : API_BASE + "/api/courses";
        const method = courseId ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            description,
            coverImage: coverImage || null,
            videoUrl: videoUrl || null
          })
        });

        const data = await response.json();

        if (response.ok) {
          createCourseForm.reset();
          document.getElementById("courseId").value = "";

          const modalElement = document.getElementById('courseModal');
          const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
          modalInstance.hide();

          loadCourses();
        } else {
          errorDiv.textContent = data.error || "Erro ao salvar curso.";
          errorDiv.style.display = "block";
        }
      } catch (error) {
        console.error("Error saving course:", error);
        errorDiv.textContent = "Erro de conexão com o servidor.";
        errorDiv.style.display = "block";
      }
    });
  }
});
