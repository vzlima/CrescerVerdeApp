let currentUser;

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("certificates-container");
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userStr || !token) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted">
                <p>Você precisa estar logado para ver seus certificados.</p>
                <a href="/HTML/login.html" class="btn btn-primary mt-2">Fazer Login</a>
            </div>
        `;
        return;
    }

    try {
        currentUser = JSON.parse(userStr);
    } catch (e) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/certificates/user/${currentUser.id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            container.innerHTML = `<div class="col-12 text-center text-danger mt-4"><p>Erro ao carregar certificados. Tente novamente mais tarde.</p></div>`;
            return;
        }

        const certificates = await res.json();

        if (certificates.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted mt-4">
                    <p style="font-size: 1.2rem;">Você ainda não possui nenhum certificado.</p>
                    <a href="/HTML/jogos.html" class="btn btn-outline-success mt-2">Explorar Jogos</a>
                </div>
            `;
            return;
        }

        container.innerHTML = certificates.map(cert => {
            const issueDate = new Date(cert.date || Date.now()).toLocaleDateString("pt-BR");
            return `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm border-0" style="border-radius: 12px; overflow: hidden;">
                        <div class="card-header bg-success text-white text-center py-3">
                            <h5 class="card-title mb-0" style="font-size: 1.1rem; font-weight: 600;">${cert.courseName}</h5>
                        </div>
                        <div class="card-body bg-light text-center d-flex flex-column justify-content-center">
                            <p class="mb-0 text-muted" style="font-size: 0.9rem;">
                                <strong>Emitido em:</strong> ${issueDate}
                            </p>
                        </div>
                        <div class="card-footer bg-white border-0 text-center pb-3 pt-0">
                            <button class="btn btn-sm btn-outline-success px-4" style="border-radius: 20px;" onclick="window.location.href='/HTML/jogo-detalhes.html?id=${cert.courseId}'">
                                Ir para o Curso
                            </button>
                            <button class="btn btn-sm btn-outline-success px-4" style="border-radius: 20px;" onclick="window.printCertificate('${cert._id}')">
                                Imprimir Certificado
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        container.innerHTML = `<div class="col-12 text-center text-danger mt-4"><p>Erro ao carregar certificados. Tente novamente mais tarde.</p></div>`;
    }
});

window.printCertificate = async function (certificateId) {
    const token = localStorage.getItem("token");

    const certRes = await fetch(`${API_BASE}/api/certificates/${certificateId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!certRes.ok) {
        showToast("Certificado não encontrado.");
        return;
    }

    const certificate = await certRes.json();
    const res = await fetch("/HTML/template-certificate.html");
    if (!res.ok) {
        showToast("Erro ao carregar template do certificado.");
        return;
    }

    let templateText = await res.text();

    const courseTitle = certificate.course?.title ?? "Curso";
    const userName = certificate.user?.name ?? "Aluno";
    const dateStr = new Date(certificate.date || certificate.createdAt || Date.now()).toLocaleDateString("pt-BR");

    templateText = templateText
        .replace("[NOME_ALUNO]", userName)
        .replace("[NOME_CURSO]", courseTitle)
        .replace("[DATA_CONCLUSAO]", dateStr)
        .replace("DATA_EMISSAO", dateStr);

    const scriptPrint = `<script>window.onload=function(){setTimeout(function(){window.print();window.close();},500);};<\/script>`;
    templateText = templateText.includes("</body>")
        ? templateText.replace("</body>", scriptPrint + "</body>")
        : templateText + scriptPrint;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(templateText);
        printWindow.document.close();
    } else {
        showToast("Permita pop-ups para imprimir o certificado.", "warning");
    }
};
