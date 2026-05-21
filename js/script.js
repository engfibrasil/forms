const FLOW_URL = "https://defaultdf1b464dc1054b6b95c1c07df632da.76.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/31529088d4724fd0919a0b87d43d4ac0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=To9ql2vU_1BYnUpsUKIHGE73ePXOxHvssWAW18KVtBc";

const state = {
  tecnicos: [],
  municipios: [],
  materiaisCatalogo: [],
  causas: [],
  materiaisSelecionados: [],
  payloadFinal: null,
  loaded: false
};

const REFERENCIAS_VALIDAS = [
  "Manutenção corretiva (TTK)",
  "Preventiva",
  "Implantação de prédios",
  "Alivio de Rede"
];

const currentYear = String(new Date().getFullYear());

const mainForm = document.getElementById("mainForm");
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
const sendBtn = document.getElementById("sendBtn");

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
  icon.textContent = theme === "dark" ? "☀" : "☾";
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

function closeSuccessModalAndResetScreen() {
  closeSuccessModal();
  resetEntireScreen();
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

function clearFieldValidation(field) {
  const wrapper = field.closest(".field");
  const errorText = wrapper ? wrapper.querySelector(".error-text") : null;

  wrapper?.classList.remove("invalid");

  if (errorText) {
    errorText.textContent = "";
  }
}

function validateField(field, isValid, message) {
  const wrapper = field.closest(".field");
  const errorText = wrapper ? wrapper.querySelector(".error-text") : null;

  if (!isValid) {
    wrapper?.classList.add("invalid");
    if (errorText) {
      errorText.textContent = message;
    }
  } else {
    wrapper?.classList.remove("invalid");
    if (errorText) {
      errorText.textContent = "";
    }
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

  if (!lines.length) {
    return [];
  }

  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const headers = rawHeaders
    .map(header => header.replace(/^\uFEFF/, "").trim())
    .filter(header => header !== "");

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
  } catch (error) {
    errors.push(error.message);
  }

  try {
    municipios = await loadCsv("./data/municipio.csv", "municipio.csv");
  } catch (error) {
    errors.push(error.message);
  }

  try {
    materiais = await loadCsv("./data/materiais.csv", "materiais.csv");
  } catch (error) {
    errors.push(error.message);
  }

  try {
    causas = await loadCsv("./data/causa.csv", "causa.csv");
  } catch (error) {
    errors.push(error.message);
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
    div.addEventListener("mousedown", event => {
      event.preventDefault();
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

  const afterPrefix = value.replace(/^TT_/, "");
  const onlyDigits = afterPrefix.replace(/\D/g, "").slice(0, 8);
  let finalValue = `TT_${onlyDigits}`;

  if (onlyDigits.length === 8) {
    finalValue += `/${currentYear}`;
  }

  ttk.value = finalValue.slice(0, 16);
}

function applyMaterialMask() {
  let value = toUpperTrim(codMaterial.value).replace(/[^A-Z0-9-]/g, "");
  const letters = value.replace(/[^A-Z]/g, "").slice(0, 3);
  const numbers = value.replace(/\D/g, "").slice(0, 11);

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
  const v1 = validateField(
    referenciaAtividade,
    REFERENCIAS_VALIDAS.includes(referenciaAtividade.value),
    "Referência da Atividade é obrigatória."
  );

  const v2 = validateField(
    ttk,
    new RegExp(`^TT_\\d{8}/${currentYear}$`).test(toUpperTrim(ttk.value)),
    `Use o formato TT_00000000/${currentYear}.`
  );

  const v3 = validateField(causaSearch, normalizeSpaces(causaSearch.value).length > 0, "Causa é obrigatória.");

  return v1 && v2 && v3;
}

function validateMaterialInputs() {
  const v1 = validateField(codMaterial, /^[A-Z]{3}-\d{11}$/.test(toUpperTrim(codMaterial.value)), "Use o formato AAA-00000000000.");
  const v2 = validateField(nomeMaterial, normalizeSpaces(nomeMaterial.value).length > 0, "Nome Material é obrigatório.");
  const v3 = validateField(
    quantidade,
    /^\d+$/.test(String(quantidade.value).trim()) && Number(quantidade.value) > 0,
    "Quantidade deve ser maior que zero."
  );

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
  clearFieldValidation(codMaterial);
  clearFieldValidation(nomeMaterial);
  clearFieldValidation(quantidade);
}

function renderMaterialsTable() {
  materialsTableBody.innerHTML = "";

  if (!state.materiaisSelecionados.length) {
    materialsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4">Nenhum material adicionado.</td>
      </tr>
    `;
    return;
  }

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

  const removeButtons = materialsTableBody.querySelectorAll(".remove-btn");
  removeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      state.materiaisSelecionados.splice(index, 1);
      renderMaterialsTable();
      validateAllSections();
    });
  });
}

function validateMaterialsCollection() {
  if (!state.materiaisSelecionados.length) {
    materialsError.classList.remove("hidden");
    materialsError.textContent = "Adicione pelo menos um material.";
    return false;
  }

  materialsError.classList.add("hidden");
  materialsError.textContent = "";
  return true;
}

function validateAllSections() {
  const tecnicoOk = validateTecnicoSection();
  const municipioOk = validateMunicipioSection();
  const atividadeOk = validateAtividadeSection();
  const materialsOk = validateMaterialsCollection();

  return tecnicoOk && municipioOk && atividadeOk && materialsOk;
}

function formatDateTimeForPayload(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  const dia = pad(date.getDate());
  const mes = pad(date.getMonth() + 1);
  const ano = date.getFullYear();
  const hora = pad(date.getHours());
  const minuto = pad(date.getMinutes());
  const segundo = pad(date.getSeconds());
  return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
}

function buildPayload() {
  const dataHoraEnvio = formatDateTimeForPayload(new Date());

  const baseData = {
    id_tecnico: toUpperTrim(idTecnico.value),
    nome_tecnico: toUpperTrim(nomeTecnico.value),
    municipio: toUpperTrim(municipio.value),
    uf: toUpperTrim(uf.value),
    eps: toUpperTrim(eps.value),
    referencia_atividade: referenciaAtividade.value,
    ttk: toUpperTrim(ttk.value),
    causa: toUpperTrim(causaSearch.value),
    datahoradoenvio: dataHoraEnvio
  };

  const csvHeader = [
    "id_tecnico",
    "nome_tecnico",
    "municipio",
    "uf",
    "eps",
    "referencia_atividade",
    "ttk",
    "causa",
    "cod_material",
    "nome_material",
    "quantidade"
  ];

  const csvRows = state.materiaisSelecionados.map(material => [
    baseData.id_tecnico,
    baseData.nome_tecnico,
    baseData.municipio,
    baseData.uf,
    baseData.eps,
    baseData.referencia_atividade,
    baseData.ttk,
    baseData.causa,
    material.cod_material,
    material.nome_material,
    material.quantidade
  ]);

  const csvText = [csvHeader.join(";"), ...csvRows.map(row => row.join(";"))].join("\n");
  const encodedCsv = btoa(unescape(encodeURIComponent(csvText)));

  const payload = {
    fileName: `BOOTPROTHEUS_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}.csv`,
    mimeType: "text/csv",
    contentText: csvText,
    contentBase64: encodedCsv,
    datahoradoenvio: dataHoraEnvio,
    dados: {
      ...baseData
    },
    materiais: state.materiaisSelecionados.map(material => ({
      cod_material: material.cod_material,
      nome_material: material.nome_material,
      quantidade: material.quantidade
    }))
  };

  state.payloadFinal = payload;
  return payload;
}

function unlockAllMainFields() {
  lockField(idTecnico, false);
  lockField(nomeTecnico, false);
  lockField(municipio, false);
  lockField(uf, false);
  lockField(codMaterial, false);
  lockField(nomeMaterial, false);
}

function clearAllSuggestions() {
  tecnicoSuggestions.classList.add("hidden");
  municipioSuggestions.classList.add("hidden");
  causaSuggestions.classList.add("hidden");
  materialSuggestions.classList.add("hidden");
}

function clearAllValidationStates() {
  const fields = [
    idTecnico,
    nomeTecnico,
    eps,
    municipio,
    uf,
    referenciaAtividade,
    ttk,
    causaSearch,
    codMaterial,
    nomeMaterial,
    quantidade
  ];

  fields.forEach(field => clearFieldValidation(field));
}

function resetStateData() {
  state.materiaisSelecionados = [];
  state.payloadFinal = null;
}

function resetSearchFields() {
  tecnicoSearch.value = "";
  municipioSearch.value = "";
  materialSearch.value = "";
}

function resetMainFields() {
  idTecnico.value = "";
  nomeTecnico.value = "";
  eps.value = "";
  municipio.value = "";
  uf.value = "";
  referenciaAtividade.value = "";
  ttk.value = "";
  causaSearch.value = "";
}

function resetEntireScreen() {
  hideAlert();
  resetSearchFields();
  resetMainFields();
  clearMaterialInputs();
  unlockAllMainFields();
  clearAllSuggestions();
  clearAllValidationStates();
  resetStateData();
  renderMaterialsTable();
  validateMaterialsCollection();
  materialsError.classList.add("hidden");
  mainForm.reset();
}

async function sendToPowerAutomate() {
  hideAlert();

  if (!state.loaded) {
    showAlert("Os arquivos CSV ainda não foram carregados.", "warning");
    return;
  }

  if (!validateAllSections()) {
    showAlert("Verifique os campos obrigatórios antes de enviar.", "error");
    return;
  }

  const payload = buildPayload();

  try {
    sendBtn.disabled = true;
    sendBtn.textContent = "Enviando...";

    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${responseText}`);
    }

    showAlert(`Envio realizado com sucesso.<br>Arquivo: ${payload.fileName}`, "success");
    openSuccessModal();
  } catch (error) {
    showAlert(`Erro ao enviar para o Power Automate.<br>${error.message}`, "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Enviar";
  }
}

function bindAutocomplete() {
  tecnicoSearch.addEventListener("input", () => {
    const query = toUpperTrim(tecnicoSearch.value);

    if (!query) {
      tecnicoSuggestions.classList.add("hidden");
      return;
    }

    const results = state.tecnicos
      .filter(item => item.cod.includes(query) || item.tecnico.includes(query))
      .slice(0, 20);

    renderSuggestions(
      tecnicoSuggestions,
      results,
      item => `${item.cod} - ${item.tecnico}`,
      item => {
        idTecnico.value = item.cod;
        nomeTecnico.value = item.tecnico;
        eps.value = item.eps;
        lockField(idTecnico, true);
        lockField(nomeTecnico, true);
        tecnicoSearch.value = `${item.cod} - ${item.tecnico}`;
        tecnicoSuggestions.classList.add("hidden");
        validateTecnicoSection();
      }
    );
  });

  municipioSearch.addEventListener("input", () => {
    const query = toUpperTrim(municipioSearch.value);

    if (!query) {
      municipioSuggestions.classList.add("hidden");
      return;
    }

    const results = state.municipios
      .filter(item => item.municipio.includes(query))
      .slice(0, 20);

    renderSuggestions(
      municipioSuggestions,
      results,
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
    const query = toUpperTrim(causaSearch.value);

    if (!query) {
      causaSuggestions.classList.add("hidden");
      return;
    }

    const results = state.causas
      .filter(item => item.causa.includes(query))
      .slice(0, 20);

    renderSuggestions(
      causaSuggestions,
      results,
      item => item.causa,
      item => {
        causaSearch.value = item.causa;
        causaSuggestions.classList.add("hidden");
        validateAtividadeSection();
      }
    );
  });

  materialSearch.addEventListener("input", () => {
    const query = toUpperTrim(materialSearch.value);

    if (!query) {
      materialSuggestions.classList.add("hidden");
      return;
    }

    const results = state.materiaisCatalogo
      .filter(item => item.cod_material.includes(query) || item.nome_material.includes(query))
      .slice(0, 20);

    renderSuggestions(
      materialSuggestions,
      results,
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

  document.addEventListener("click", event => {
    if (!event.target.closest(".autocomplete-wrap")) {
      clearAllSuggestions();
    }
  });

  tecnicoSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      tecnicoSearch.value = "";
      idTecnico.value = "";
      nomeTecnico.value = "";
      eps.value = "";
      lockField(idTecnico, false);
      lockField(nomeTecnico, false);
      validateTecnicoSection();
    }
  });

  municipioSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      municipioSearch.value = "";
      municipio.value = "";
      uf.value = "";
      lockField(municipio, false);
      lockField(uf, false);
      validateMunicipioSection();
    }
  });

  materialSearch.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      clearMaterialInputs();
    }
  });
}

function bindMasksAndValidation() {
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

  causaSearch.addEventListener("input", () => {
    causaSearch.value = toUpperTrim(causaSearch.value);
    validateAtividadeSection();
  });

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

function bindMaterialActions() {
  addMaterialBtn.addEventListener("click", () => {
    hideAlert();

    codMaterial.value = toUpperTrim(codMaterial.value);
    nomeMaterial.value = toUpperTrim(nomeMaterial.value);

    const valid = validateMaterialInputs();
    if (!valid) return;

    const material = {
      cod_material: codMaterial.value,
      nome_material: nomeMaterial.value,
      quantidade: Number(quantidade.value)
    };

    state.materiaisSelecionados.push(material);
    renderMaterialsTable();
    clearMaterialInputs();
    validateMaterialsCollection();
  });
}

function bindActionButtons() {
  mainForm.addEventListener("submit", async event => {
    event.preventDefault();
    await sendToPowerAutomate();
  });

  closeSuccessModalBtn.addEventListener("click", closeSuccessModalAndResetScreen);
  confirmSuccessModalBtn.addEventListener("click", closeSuccessModalAndResetScreen);
  modalBackdrop.addEventListener("click", closeSuccessModalAndResetScreen);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !successModal.classList.contains("hidden")) {
      closeSuccessModalAndResetScreen();
    }
  });
}

async function init() {
  try {
    setThemeToggle();
    bindMasksAndValidation();
    bindAutocomplete();
    bindMaterialActions();
    bindActionButtons();
    renderMaterialsTable();
    await loadData();
  } catch (error) {
    showAlert(`Erro ao carregar os dados iniciais.<br>${error.message}`, "error");
  }
}

init();
