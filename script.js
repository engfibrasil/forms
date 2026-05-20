const state = {
    materials: [],
    selectedTechnicianFromList: false,
    selectedMunicipioFromList: false,
    selectedMaterialFromList: false
};

const currentYear = String(window.APP_CONFIG?.currentYear || new Date().getFullYear());

const form = document.getElementById("mainForm");
const alertBox = document.getElementById("alertBox");
const materialsError = document.getElementById("materialsError");
const materialsTableBody = document.getElementById("materialsTableBody");

const tecnicoSearch = document.getElementById("tecnico_search");
const tecnicoSuggestions = document.getElementById("tecnico_suggestions");
const idTecnico = document.getElementById("id_tecnico");
const nomeTecnico = document.getElementById("nome_tecnico");

const municipioSearch = document.getElementById("municipio_search");
const municipioSuggestions = document.getElementById("municipio_suggestions");
const municipio = document.getElementById("municipio");
const uf = document.getElementById("uf");
const eps = document.getElementById("eps");

const ttk = document.getElementById("ttk");

const causaSearch = document.getElementById("causa_search");
const causaSuggestions = document.getElementById("causa_suggestions");

const materialSearch = document.getElementById("material_search");
const materialSuggestions = document.getElementById("material_suggestions");
const codMaterial = document.getElementById("cod_material");
const nomeMaterial = document.getElementById("nome_material");
const quantidade = document.getElementById("quantidade");
const addMaterialBtn = document.getElementById("addMaterialBtn");

const successModal = document.getElementById("successModal");
const successFileName = document.getElementById("successFileName");
const closeSuccessModalBtn = document.getElementById("closeSuccessModal");
const confirmSuccessModalBtn = document.getElementById("confirmSuccessModal");
const modalBackdrop = document.getElementById("modalBackdrop");

function setThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    const root = document.documentElement;
    let theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.setAttribute("data-theme", theme);
    updateThemeIcon(toggle, theme);

    toggle.addEventListener("click", () => {
        theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", theme);
        updateThemeIcon(toggle, theme);
    });
}

function updateThemeIcon(toggle, theme) {
    const icon = toggle.querySelector(".theme-icon");
    icon.textContent = theme === "dark" ? "☾" : "☀";
}

function showAlert(message, type = "error") {
    alertBox.className = `alert ${type}`;
    alertBox.innerHTML = message;
    alertBox.classList.remove("hidden");
}

function hideAlert() {
    alertBox.classList.add("hidden");
    alertBox.innerHTML = "";
}

function openSuccessModal(fileName) {
    successFileName.textContent = fileName ? `Arquivo gerado: ${fileName}` : "";
    successModal.classList.remove("hidden");
    successModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    confirmSuccessModalBtn.focus();
}

function closeSuccessModal() {
    successModal.classList.add("hidden");
    successModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function lockField(input, locked) {
    input.readOnly = locked;
    input.classList.toggle("locked", locked);
}

function toUpperTrim(value) {
    return (value || "").toString().trim().toUpperCase();
}

function cleanText(value) {
    return (value || "").toString().trim().replace(/\s+/g, " ");
}

async function fetchSuggestions(url, query) {
    if (!query || query.trim().length < 1) {
        return [];
    }

    const response = await fetch(`${url}?q=${encodeURIComponent(query)}`, {
        headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
        throw new Error("Falha ao buscar sugestões.");
    }

    return await response.json();
}

function renderSuggestions(container, items, onSelect) {
    container.innerHTML = "";

    if (!items.length) {
        container.classList.add("hidden");
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = item.display;
        div.addEventListener("mousedown", (e) => {
            e.preventDefault();
            onSelect(item);
        });
        container.appendChild(div);
    });

    container.classList.remove("hidden");
}

function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function validateField(field, validator, message) {
    const fieldWrap = field.closest(".field");
    const errorText = fieldWrap ? fieldWrap.querySelector(".error-text") : null;
    const valid = validator(field.value);

    if (!valid) {
        fieldWrap?.classList.add("invalid");
        if (errorText) errorText.textContent = message;
    } else {
        fieldWrap?.classList.remove("invalid");
        if (errorText) errorText.textContent = "";
    }

    return valid;
}

function applyTecnicoMask() {
    let value = toUpperTrim(idTecnico.value).replace(/[^A-Z0-9]/g, "");
    if (!value.startsWith("FB")) {
        value = "FB" + value.replace(/^FB/, "");
    }
    value = "FB" + value.replace(/^FB/, "").replace(/\D/g, "").slice(0, 7);
    idTecnico.value = value.slice(0, 9);
}

function applyTTKMask() {
    let value = toUpperTrim(ttk.value).replace(/[^A-Z0-9/]/g, "");

    if (!value.startsWith("TT_")) {
        value = "TT_" + value.replace(/^TT_?/, "");
    }

    let afterPrefix = value.replace(/^TT_/, "");
    let onlyDigits = afterPrefix.replace(/\D/g, "").slice(0, 8);

    let finalValue = `TT_${onlyDigits}`;

    if (onlyDigits.length === 8) {
        finalValue += `/${currentYear}`;
    }

    ttk.value = finalValue.slice(0, 16);
}

function applyMaterialMask() {
    let value = toUpperTrim(codMaterial.value).replace(/[^A-Z0-9-]/g, "");
    let letters = value.replace(/[^A-Z]/g, "").slice(0, 3);
    let numbers = value.replace(/\D/g, "").slice(0, 11);

    if (letters.length > 0) {
        codMaterial.value = letters + (letters.length === 3 ? "-" : "") + numbers;
    } else {
        codMaterial.value = numbers;
    }
}

function validateTecnicoFields() {
    const validId = validateField(
        idTecnico,
        value => /^FB\d{7}$/.test(toUpperTrim(value)),
        "Use o formato FB0000000."
    );

    const validNome = validateField(
        nomeTecnico,
        value => cleanText(value).length > 0,
        "Nome Técnico é obrigatório."
    );

    const validEps = validateField(
        eps,
        value => cleanText(value).length > 0,
        "EPS é obrigatório."
    );

    return validId && validNome && validEps;
}

function validateMunicipioFields() {
    const v1 = validateField(
        municipio,
        value => cleanText(value).length > 0,
        "Município é obrigatório."
    );

    const v2 = validateField(
        uf,
        value => /^[A-Z]{2}$/.test(toUpperTrim(value)),
        "UF deve conter 2 letras."
    );

    return v1 && v2;
}

function validateAtividadeFields() {
    const referencia = document.getElementById("referencia_atividade");

    const v1 = validateField(
        referencia,
        value => cleanText(value).length > 0,
        "Referência da Atividade é obrigatória."
    );

    const v2 = validateField(
        ttk,
        value => new RegExp(`^TT_\\d{8}/${currentYear}$`).test(toUpperTrim(value)),
        `Use o formato TT_00000000/${currentYear}.`
    );

    const v3 = validateField(
        causaSearch,
        value => cleanText(value).length > 0,
        "Causa é obrigatória."
    );

    return v1 && v2 && v3;
}

function validateCurrentMaterialFields() {
    const v1 = validateField(
        codMaterial,
        value => /^[A-Z]{3}-\d{11}$/.test(toUpperTrim(value)),
        "Use o formato AAA-00000000000."
    );

    const v2 = validateField(
        nomeMaterial,
        value => cleanText(value).length > 0,
        "Nome Material é obrigatório."
    );

    const v3 = validateField(
        quantidade,
        value => /^\d+$/.test(String(value).trim()) && Number(value) > 0,
        "Quantidade deve ser maior que zero."
    );

    return v1 && v2 && v3;
}

function clearMaterialInputs() {
    materialSearch.value = "";
    codMaterial.value = "";
    nomeMaterial.value = "";
    quantidade.value = "";
    state.selectedMaterialFromList = false;
    lockField(codMaterial, false);
    lockField(nomeMaterial, false);
    materialSuggestions.classList.add("hidden");
}

function renderMaterials() {
    materialsTableBody.innerHTML = "";

    if (!state.materials.length) {
        materialsTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">Nenhum material adicionado.</td>
            </tr>
        `;
        materialsError.classList.remove("hidden");
        return;
    }

    materialsError.classList.add("hidden");

    state.materials.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.cod_material}</td>
            <td>${item.nome_material}</td>
            <td>${item.quantidade}</td>
            <td><button type="button" class="remove-btn" data-index="${index}">Remover</button></td>
        `;
        materialsTableBody.appendChild(tr);
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.dataset.index);
            state.materials.splice(idx, 1);
            renderMaterials();
        });
    });
}

function bindRealtimeValidation() {
    idTecnico.addEventListener("input", () => {
        applyTecnicoMask();
        validateTecnicoFields();
    });

    nomeTecnico.addEventListener("input", validateTecnicoFields);

    eps.addEventListener("input", () => {
        eps.value = toUpperTrim(eps.value);
        validateTecnicoFields();
    });

    municipio.addEventListener("input", validateMunicipioFields);

    uf.addEventListener("input", () => {
        uf.value = toUpperTrim(uf.value).slice(0, 2);
        validateMunicipioFields();
    });

    ttk.addEventListener("input", () => {
        applyTTKMask();
        validateAtividadeFields();
    });

    document.getElementById("referencia_atividade").addEventListener("change", validateAtividadeFields);

    causaSearch.addEventListener("input", () => {
        causaSearch.value = toUpperTrim(causaSearch.value);
        validateAtividadeFields();
    });

    codMaterial.addEventListener("input", () => {
        applyMaterialMask();
        validateCurrentMaterialFields();
    });

    nomeMaterial.addEventListener("input", () => {
        nomeMaterial.value = toUpperTrim(nomeMaterial.value);
        validateCurrentMaterialFields();
    });

    quantidade.addEventListener("input", validateCurrentMaterialFields);
}

function setupAutocomplete() {
    const handleTecnicoSearch = debounce(async () => {
        const query = tecnicoSearch.value;
        if (!query.trim()) {
            tecnicoSuggestions.classList.add("hidden");
            return;
        }

        try {
            const items = await fetchSuggestions("/api/tecnicos", query);
            renderSuggestions(tecnicoSuggestions, items, (item) => {
                idTecnico.value = item.cod;
                nomeTecnico.value = item.tecnico;
                eps.value = item.eps || "";
                lockField(idTecnico, true);
                lockField(nomeTecnico, true);
                lockField(eps, true);
                state.selectedTechnicianFromList = true;
                tecnicoSearch.value = item.display;
                tecnicoSuggestions.classList.add("hidden");
                validateTecnicoFields();
            });
        } catch (error) {
            tecnicoSuggestions.classList.add("hidden");
        }
    }, 200);

    const handleMunicipioSearch = debounce(async () => {
        const query = municipioSearch.value;
        if (!query.trim()) {
            municipioSuggestions.classList.add("hidden");
            return;
        }

        try {
            const items = await fetchSuggestions("/api/municipios", query);
            renderSuggestions(municipioSuggestions, items, (item) => {
                municipio.value = item.municipio;
                uf.value = item.uf;
                lockField(municipio, true);
                lockField(uf, true);
                state.selectedMunicipioFromList = true;
                municipioSearch.value = item.display;
                municipioSuggestions.classList.add("hidden");
                validateMunicipioFields();
            });
        } catch (error) {
            municipioSuggestions.classList.add("hidden");
        }
    }, 200);

    const handleMaterialSearch = debounce(async () => {
        const query = materialSearch.value;
        if (!query.trim()) {
            materialSuggestions.classList.add("hidden");
            return;
        }

        try {
            const items = await fetchSuggestions("/api/materiais", query);
            renderSuggestions(materialSuggestions, items, (item) => {
                codMaterial.value = item.cod_material;
                nomeMaterial.value = item.nome_material;
                lockField(codMaterial, true);
                lockField(nomeMaterial, true);
                state.selectedMaterialFromList = true;
                materialSearch.value = item.display;
                materialSuggestions.classList.add("hidden");
                validateCurrentMaterialFields();
            });
        } catch (error) {
            materialSuggestions.classList.add("hidden");
        }
    }, 200);

    const handleCausaSearch = debounce(async () => {
        const query = causaSearch.value;
        if (!query.trim()) {
            causaSuggestions.classList.add("hidden");
            return;
        }

        try {
            const items = await fetchSuggestions("/api/causas", query);
            renderSuggestions(causaSuggestions, items, (item) => {
                causaSearch.value = item.value;
                causaSuggestions.classList.add("hidden");
                validateAtividadeFields();
            });
        } catch (error) {
            causaSuggestions.classList.add("hidden");
        }
    }, 200);

    tecnicoSearch.addEventListener("input", () => {
        state.selectedTechnicianFromList = false;
        lockField(idTecnico, false);
        lockField(nomeTecnico, false);
        lockField(eps, false);
        handleTecnicoSearch();
    });

    municipioSearch.addEventListener("input", () => {
        state.selectedMunicipioFromList = false;
        lockField(municipio, false);
        lockField(uf, false);
        handleMunicipioSearch();
    });

    materialSearch.addEventListener("input", () => {
        state.selectedMaterialFromList = false;
        lockField(codMaterial, false);
        lockField(nomeMaterial, false);
        handleMaterialSearch();
    });

    causaSearch.addEventListener("input", () => {
        handleCausaSearch();
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-wrap")) {
            tecnicoSuggestions.classList.add("hidden");
            municipioSuggestions.classList.add("hidden");
            materialSuggestions.classList.add("hidden");
            causaSuggestions.classList.add("hidden");
        }
    });
}

function setupManualUnlockBehavior() {
    tecnicoSearch.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            state.selectedTechnicianFromList = false;
            tecnicoSearch.value = "";
            idTecnico.value = "";
            nomeTecnico.value = "";
            eps.value = "";
            lockField(idTecnico, false);
            lockField(nomeTecnico, false);
            lockField(eps, false);
            tecnicoSuggestions.classList.add("hidden");
        }
    });

    municipioSearch.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            state.selectedMunicipioFromList = false;
            municipioSearch.value = "";
            municipio.value = "";
            uf.value = "";
            lockField(municipio, false);
            lockField(uf, false);
            municipioSuggestions.classList.add("hidden");
        }
    });

    materialSearch.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            clearMaterialInputs();
        }
    });

    causaSearch.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            causaSearch.value = "";
            causaSuggestions.classList.add("hidden");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !successModal.classList.contains("hidden")) {
            closeSuccessModal();
        }
    });

    closeSuccessModalBtn.addEventListener("click", closeSuccessModal);
    confirmSuccessModalBtn.addEventListener("click", closeSuccessModal);
    modalBackdrop.addEventListener("click", closeSuccessModal);
}

addMaterialBtn.addEventListener("click", () => {
    hideAlert();

    codMaterial.value = toUpperTrim(codMaterial.value);
    nomeMaterial.value = toUpperTrim(nomeMaterial.value);

    if (!validateCurrentMaterialFields()) {
        return;
    }

    const material = {
        cod_material: codMaterial.value,
        nome_material: nomeMaterial.value,
        quantidade: Number(quantidade.value)
    };

    state.materials.push(material);
    renderMaterials();
    clearMaterialInputs();
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    idTecnico.value = toUpperTrim(idTecnico.value);
    nomeTecnico.value = toUpperTrim(nomeTecnico.value);
    municipio.value = toUpperTrim(municipio.value);
    uf.value = toUpperTrim(uf.value);
    eps.value = toUpperTrim(eps.value);
    causaSearch.value = toUpperTrim(causaSearch.value);
    codMaterial.value = toUpperTrim(codMaterial.value);
    nomeMaterial.value = toUpperTrim(nomeMaterial.value);

    const ok1 = validateTecnicoFields();
    const ok2 = validateMunicipioFields();
    const ok3 = validateAtividadeFields();

    if (!state.materials.length) {
        materialsError.textContent = "Adicione pelo menos um material";
        materialsError.classList.remove("hidden");
    } else {
        materialsError.classList.add("hidden");
    }

    if (!(ok1 && ok2 && ok3 && state.materials.length > 0)) {
        showAlert("Verifique os campos obrigatórios antes de enviar.", "error");
        return;
    }

    const payload = {
        id_tecnico: idTecnico.value,
        nome_tecnico: nomeTecnico.value,
        municipio: municipio.value,
        uf: uf.value,
        eps: eps.value,
        referencia_atividade: document.getElementById("referencia_atividade").value,
        ttk: ttk.value,
        causa: causaSearch.value,
        materiais: state.materials
    };

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
        const response = await fetch("/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            const message = Array.isArray(result.errors)
                ? result.errors.join("<br>")
                : "Erro ao processar a solicitação.";
            showAlert(message, "error");
            return;
        }

        form.reset();
        state.materials = [];
        renderMaterials();

        state.selectedTechnicianFromList = false;
        state.selectedMunicipioFromList = false;
        state.selectedMaterialFromList = false;

        lockField(idTecnico, false);
        lockField(nomeTecnico, false);
        lockField(eps, false);
        lockField(municipio, false);
        lockField(uf, false);
        lockField(codMaterial, false);
        lockField(nomeMaterial, false);

        tecnicoSearch.value = "";
        municipioSearch.value = "";
        materialSearch.value = "";
        causaSearch.value = "";
        eps.value = "";

        openSuccessModal(result.generated_file || "");
    } catch (error) {
        showAlert("Erro de comunicação com o servidor local.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Gerar CSV e Enviar";
    }
});

setThemeToggle();
bindRealtimeValidation();
setupAutocomplete();
setupManualUnlockBehavior();
renderMaterials();