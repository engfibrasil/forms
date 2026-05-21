const state = {
    tecnicos: [],
    municipios: [],
    materiaisCatalogo: [],
    causas: [],
    materiaisSelecionados: [],
    payloadFinal: null,
    loaded: false
};

const currentYear = String(new Date().getFullYear());

const alertBox = document.getElementById("alertBox");
const materialsError = document.getElementById("materialsError");
const materialsTableBody = document.getElementById("materialsTableBody");

const tecnicoSearch = document.getElementById("tecnico_search");
const tecnicoSuggestions = document.getElementById("tecnico_suggestions");
const idTecnico = document.getElementById("id_tecnico");
const nomeTecnico = document.getElementById("nome_tecnico");
const eps = document.getElementById("eps");

const municipioSearch = document.getElementById("municipio_search");
const municipioSuggestions = document.getElementById("municipio_suggestions");
const municipio = document.getElementById("municipio");
const uf = document.getElementById("uf");

const referenciaAtividade = document.getElementById("referencia_atividade");
const ttk = document.getElementById("ttk");

const causaSearch = document.getElementById("causa_search");
const causaSuggestions = document.getElementById("causa_suggestions");

const materialSearch = document.getElementById("material_search");
const materialSuggestions = document.getElementById("material_suggestions");
const codMaterial = document.getElementById("cod_material");
const nomeMaterial = document.getElementById("nome_material");
const quantidade = document.getElementById("quantidade");

const addMaterialBtn = document.getElementById("addMaterialBtn");
const generateJsonBtn = document.getElementById("generateJsonBtn");

const successModal = document.getElementById("successModal");
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

function openSuccessModal() {
    successModal.classList.remove("hidden");
    successModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeSuccessModal() {
    successModal.classList.add("hidden");
    successModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function toUpperTrim(value) {
    return (value || "").toString().trim().toUpperCase();
}

function normalizeSpaces(value) {
    return (value || "").toString().trim().replace(/\s+/g, " ");
}

function lockField(field, locked) {
    field.readOnly = locked;
    field.classList.toggle("locked", locked);
}

function validateField(field, isValid, message) {
    const wrapper = field.closest(".field");
    const errorText = wrapper ? wrapper.querySelector(".error-text") : null;

    if (!isValid) {
        wrapper?.classList.add("invalid");
        if (errorText) errorText.textContent = message;
    } else {
        wrapper?.classList.remove("invalid");
        if (errorText) errorText.textContent = "";
    }

    return isValid;
}

function parseCsvLine(line, delimiter = ";") {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
            if (insideQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === delimiter && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function csvToObjects(csvText, delimiter = ";") {
    const lines = csvText
        .replace(/\r/g, "")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

    if (!lines.length) return [];

    const rawHeaders = parseCsvLine(lines[0], delimiter);
    const headers = rawHeaders
        .map(h => h.replace(/^\uFEFF/, "").trim())
        .filter(h => h !== "");

    return lines.slice(1).map(line => {
        const values = parseCsvLine(line, delimiter);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = (values[index] || "").trim();
        });
        return row;
    });
}

async function loadCsv(path, label) {
    try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`${label}: HTTP ${response.status}`);
        }
        const text = await response.text();
        return csvToObjects(text, ";");
    } catch (error) {
        throw new Error(`${label}: ${error.message}`);
    }
}

async function loadData() {
    const errors = [];
    let tecnicos = [];
    let municipios = [];
    let materiais = [];
    let causas = [];

    try {
        tecnicos = await loadCsv("./data/lista_tecnicos.csv", "lista_tecnicos.csv");
    } catch (e) {
        errors.push(e.message);
    }

    try {
        municipios = await loadCsv("./data/municipio.csv", "municipio.csv");
    } catch (e) {
        errors.push(e.message);
    }

    try {
        materiais = await loadCsv("./data/materiais.csv", "materiais.csv");
    } catch (e) {
        errors.push(e.message);
    }

    try {
        causas = await loadCsv("./data/causa.csv", "causa.csv");
    } catch (e) {
        errors.push(e.message);
    }

    if (errors.length) {
        throw new Error(errors.join("<br>"));
    }

    state.tecnicos = tecnicos
        .filter(item => item.cod || item.tecnico || item.eps)
        .map(item => ({
            cod: toUpperTrim(item.cod),
            tecnico: toUpperTrim(item.tecnico),
            eps: toUpperTrim(item.eps)
        }));

    state.municipios = municipios
        .filter(item => item.municipio || item.uf)
        .map(item => ({
            municipio: toUpperTrim(item.municipio),
            uf: toUpperTrim(item.uf)
        }));

    state.materiaisCatalogo = materiais
        .filter(item => item.cod_material || item.nome_material)
        .map(item => ({
            cod_material: toUpperTrim(item.cod_material),
            nome_material: toUpperTrim(item.nome_material)
        }));

    state.causas = causas
        .filter(item => item.causa)
        .map(item => ({
            causa: toUpperTrim(item.causa)
        }));

    state.loaded = true;
}

function renderSuggestions(container, items, formatter, onSelect) {
    container.innerHTML = "";

    if (!items.length) {
        container.classList.add("hidden");
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = formatter(item);
        div.addEventListener("mousedown", (e) => {
            e.preventDefault();
            onSelect(item);
        });
        container.appendChild(div);
    });

    container.classList.remove("hidden");
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

function validateTecnicoSection() {
    const v1 = validateField(idTecnico, /^FB\d{7}$/.test(toUpperTrim(idTecnico.value)), "Use o formato FB0000000.");
    const v2 = validateField(nomeTecnico, normalizeSpaces(nomeTecnico.value).length > 0, "Nome Técnico é obrigatório.");
    const v3 = validateField(eps, normalizeSpaces(eps.value).length > 0, "EPS é obrigatório.");
    return v1 && v2 && v3;
}

function validateMunicipioSection() {
    const v1 = validateField(municipio, normalizeSpaces(municipio.value).length > 0, "Município é obrigatório.");
    const v2 = validateField(uf, /^[A-Z]{2}$/.test(toUpperTrim(uf.value)), "UF deve conter 2 letras.");
    return v1 && v2;
}

function validateAtividadeSection() {
    const v1 = validateField(referenciaAtividade, normalizeSpaces(referenciaAtividade.value).length > 0, "Referência da Atividade é obrigatória.");
    const v2 = validateField(ttk, new RegExp(`^TT_\\d{8}/${currentYear}$`).test(toUpperTrim(ttk.value)), `Use o formato TT_00000000/${currentYear}.`);
    const v3 = validateField(causaSearch, normalizeSpaces(causaSearch.value).length > 0, "Causa é obrigatória.");
    return v1 && v2 && v3;
}

function validateMaterialInputs() {
    const v1 = validateField(codMaterial, /^[A-Z]{3}-\d{11}$/.test(toUpperTrim(codMaterial.value)), "Use o formato AAA-00000000000.");
    const v2 = validateField(nomeMaterial, normalizeSpaces(nomeMaterial.value).length > 0, "Nome Material é obrigatório.");
    const v3 = validateField(quantidade, /^\d+$/.test(String(quantidade.value).trim()) && Number(quantidade.value) > 0, "Quantidade deve ser maior que zero.");
    return v1 && v2 && v3;
}

function clearMaterialInputs() {
    materialSearch.value = "";
    codMaterial.value = "";
    nomeMaterial.value = "";
    quantidade.value = "";
    lockField(codMaterial, false);
    lockField(nomeMaterial, false);
    materialSuggestions.classList.add("hidden");
}

function renderMaterialsTable() {
    materialsTableBody.innerHTML = "";

    if (!state.materiaisSelecionados.length) {
        materialsTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">Nenhum material adicionado.</td>
            </tr>
        `;
        materialsError.classList.remove("hidden");
        return;
    }

    materialsError.classList.add("hidden");

    state.materiaisSelecionados.forEach((item, index) => {
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
            state.materiaisSelecionados.splice(idx, 1);
            renderMaterialsTable();
        });
    });
}

function buildCsvContent(payload) {
    const lines = [];
    lines.push("id_tecnico;nome_tecnico;municipio;uf;eps;referencia_atividade;ttk;causa;cod_material;nome_material;quantidade");

    payload.materiais.forEach(material => {
        lines.push([
            payload.id_tecnico,
            payload.nome_tecnico,
            payload.municipio,
            payload.uf,
            payload.eps,
            payload.referencia_atividade,
            payload.ttk,
            payload.causa,
            material.cod_material,
            material.nome_material,
            material.quantidade
        ].join(";"));
    });

    return lines.join("\n");
}

function buildPayload() {
    return {
        id_tecnico: toUpperTrim(idTecnico.value),
        nome_tecnico: toUpperTrim(nomeTecnico.value),
        municipio: toUpperTrim(municipio.value),
        uf: toUpperTrim(uf.value),
        eps: toUpperTrim(eps.value),
        referencia_atividade: referenciaAtividade.value,
        ttk: toUpperTrim(ttk.value),
        causa: toUpperTrim(causaSearch.value),
        materiais: state.materiaisSelecionados.map(item => ({
            cod_material: item.cod_material,
            nome_material: item.nome_material,
            quantidade: item.quantidade
        }))
    };
}

function generateFileName() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `BOOT_PROTHEUS_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
}

function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function bindAutocomplete() {
    tecnicoSearch.addEventListener("input", () => {
        if (!state.loaded) return;
        const q = toUpperTrim(tecnicoSearch.value);
        if (!q) {
            tecnicoSuggestions.classList.add("hidden");
            return;
        }

        const filtered = state.tecnicos.filter(item =>
            item.cod.includes(q) || item.tecnico.includes(q)
        ).slice(0, 20);

        renderSuggestions(
            tecnicoSuggestions,
            filtered,
            item => `${item.cod} - ${item.tecnico}`,
            item => {
                idTecnico.value = item.cod;
                nomeTecnico.value = item.tecnico;
                eps.value = item.eps;
                lockField(idTecnico, true);
                lockField(nomeTecnico, true);
                lockField(eps, true);
                tecnicoSearch.value = `${item.cod} - ${item.tecnico}`;
                tecnicoSuggestions.classList.add("hidden");
                validateTecnicoSection();
            }
        );
    });

    municipioSearch.addEventListener("input", () => {
        if (!state.loaded) return;
        const q = toUpperTrim(municipioSearch.value);
        if (!q) {
            municipioSuggestions.classList.add("hidden");
            return;
        }

        const filtered = state.municipios.filter(item =>
            item.municipio.includes(q) || item.uf.includes(q)
        ).slice(0, 20);

        renderSuggestions(
            municipioSuggestions,
            filtered,
            item => `${item.municipio} - ${item.uf}`,
            item => {
                municipio.value = item.municipio;
                uf.value = item.uf;
                lockField(municipio, true);
                lockField(uf, true);
                municipioSearch.value = `${item.municipio} - ${item.uf}`;
                municipioSuggestions.classList.add("hidden");
                validateMunicipioSection();
            }
        );
    });

    causaSearch.addEventListener("input", () => {
        if (!state.loaded) return;
        causaSearch.value = toUpperTrim(causaSearch.value);
        const q = toUpperTrim(causaSearch.value);
        if (!q) {
            causaSuggestions.classList.add("hidden");
            return;
        }

        const filtered = state.causas.filter(item =>
            item.causa.includes(q)
        ).slice(0, 20);

        renderSuggestions(
            causaSuggestions,
            filtered,
            item => item.causa,
            item => {
                causaSearch.value = item.causa;
                causaSuggestions.classList.add("hidden");
                validateAtividadeSection();
            }
        );
    });

    materialSearch.addEventListener("input", () => {
        if (!state.loaded) return;
        const q = toUpperTrim(materialSearch.value);
        if (!q) {
            materialSuggestions.classList.add("hidden");
            return;
        }

        const filtered = state.materiaisCatalogo.filter(item =>
            item.cod_material.includes(q) || item.nome_material.includes(q)
        ).slice(0, 20);

        renderSuggestions(
            materialSuggestions,
            filtered,
            item => `${item.cod_material} - ${item.nome_material}`,
            item => {
                codMaterial.value = item.cod_material;
                nomeMaterial.value = item.nome_material;
                lockField(codMaterial, true);
                lockField(nomeMaterial, true);
                materialSearch.value = `${item.cod_material} - ${item.nome_material}`;
                materialSuggestions.classList.add("hidden");
                validateMaterialInputs();
            }
        );
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".autocomplete-wrap")) {
            tecnicoSuggestions.classList.add("hidden");
            municipioSuggestions.classList.add("hidden");
            causaSuggestions.classList.add("hidden");
            materialSuggestions.classList.add("hidden");
        }
    });
}

function bindValidationEvents() {
    idTecnico.addEventListener("input", () => {
        applyTecnicoMask();
        validateTecnicoSection();
    });

    nomeTecnico.addEventListener("input", () => {
        nomeTecnico.value = toUpperTrim(nomeTecnico.value);
        validateTecnicoSection();
    });

    eps.addEventListener("input", () => {
        eps.value = toUpperTrim(eps.value);
        validateTecnicoSection();
    });

    municipio.addEventListener("input", () => {
        municipio.value = toUpperTrim(municipio.value);
        validateMunicipioSection();
    });

    uf.addEventListener("input", () => {
        uf.value = toUpperTrim(uf.value).slice(0, 2);
        validateMunicipioSection();
    });

    ttk.addEventListener("input", () => {
        applyTTKMask();
        validateAtividadeSection();
    });

    referenciaAtividade.addEventListener("change", validateAtividadeSection);

    codMaterial.addEventListener("input", () => {
        applyMaterialMask();
        validateMaterialInputs();
    });

    nomeMaterial.addEventListener("input", () => {
        nomeMaterial.value = toUpperTrim(nomeMaterial.value);
        validateMaterialInputs();
    });

    quantidade.addEventListener("input", validateMaterialInputs);
}

function bindButtons() {
    addMaterialBtn.addEventListener("click", () => {
        hideAlert();

        codMaterial.value = toUpperTrim(codMaterial.value);
        nomeMaterial.value = toUpperTrim(nomeMaterial.value);

        if (!validateMaterialInputs()) return;

        state.materiaisSelecionados.push({
            cod_material: codMaterial.value,
            nome_material: nomeMaterial.value,
            quantidade: Number(quantidade.value)
        });

        renderMaterialsTable();
        clearMaterialInputs();
    });

    generateJsonBtn.addEventListener("click", () => {
        hideAlert();

        const ok1 = validateTecnicoSection();
        const ok2 = validateMunicipioSection();
        const ok3 = validateAtividadeSection();

        if (!state.materiaisSelecionados.length) {
            materialsError.textContent = "Adicione pelo menos um material";
            materialsError.classList.remove("hidden");
        } else {
            materialsError.classList.add("hidden");
        }

        if (!(ok1 && ok2 && ok3 && state.materiaisSelecionados.length > 0)) {
            showAlert("Verifique os campos obrigatórios antes de continuar.", "error");
            return;
        }

        const payload = buildPayload();
        const csvContent = buildCsvContent(payload);
        const fileName = generateFileName();

        state.payloadFinal = {
            fileName,
            contentBase64: toBase64(csvContent),
            contentText: csvContent,
            mimeType: "text/csv",
            data: payload
        };

        console.log("Payload final para Power Automate:", state.payloadFinal);
        openSuccessModal();
    });

    closeSuccessModalBtn.addEventListener("click", closeSuccessModal);
    confirmSuccessModalBtn.addEventListener("click", closeSuccessModal);
    modalBackdrop.addEventListener("click", closeSuccessModal);
}

async function init() {
    setThemeToggle();
    bindValidationEvents();
    bindButtons();
    bindAutocomplete();
    renderMaterialsTable();

    try {
        await loadData();
        hideAlert();
    } catch (error) {
        showAlert(
            `Erro ao carregar dados locais:<br>${error.message}<br><br>Se estiver abrindo o arquivo direto no navegador por file:///..., publique no GitHub Pages ou rode um servidor local.`,
            "error"
        );
    }
}

init();