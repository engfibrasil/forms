const FLOW_URL = "https://defaultdf1b464dc1054b6b95c1c07df632da.76.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/31529088d4724fd0919a0b87d43d4ac0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=To9ql2vU_1BYnUpsUKIHGE73ePXOxHvssWAW18KVtBc";

const REFERENCIAS = [
  "Manutenção corretiva (TTK)",
  "Preventiva",
  "Implantação de prédios",
  "Alivio de Rede"
];

const state = {
  tecnicos: [],
  municipios: [],
  materiaisCatalogo: [],
  causas: [],
  materiaisSelecionados: [],
  payloadFinal: null
};

const $ = (id) => document.getElementById(id);

const el = {
  form: $("formPrincipal"),
  alertBox: $("alertBox"),
  jsonOutput: $("jsonOutput"),

  buscaTecnico: $("buscaTecnico"),
  listaTecnicos: $("listaTecnicos"),
  idTecnico: $("id_tecnico"),
  nomeTecnico: $("nome_tecnico"),

  buscaMunicipio: $("buscaMunicipio"),
  listaMunicipios: $("listaMunicipios"),
  municipio: $("municipio"),
  uf: $("uf"),
  eps: $("eps"),

  referencia: $("referencia_atividade"),
  ttk: $("ttk"),
  causa: $("causa"),

  buscaMaterial: $("buscaMaterial"),
  listaMateriais: $("listaMateriais"),
  codMaterial: $("cod_material"),
  nomeMaterial: $("nome_material"),
  quantidade: $("quantidade"),
  btnAdicionarMaterial: $("btnAdicionarMaterial"),
  tbodyMateriais: $("tbodyMateriais"),
  erroMateriais: $("erroMateriais"),

  btnGerarJson: $("btnGerarJson"),
  btnEnviarPowerAutomate: $("btnEnviarPowerAutomate")
};

function showAlert(message, type = "error") {
  el.alertBox.className = `alert ${type}`;
  el.alertBox.innerHTML = message;
  el.alertBox.classList.remove("hidden");
}

function hideAlert() {
  el.alertBox.className = "alert hidden";
  el.alertBox.innerHTML = "";
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function clean(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).filter(Boolean).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] || "");
    return obj;
  });
}

async function loadData() {
  const [tecnicosTxt, municipiosTxt, materiaisTxt, causasTxt] = await Promise.all([
    fetch("./data/lista_tecnicos.csv").then(r => r.text()),
    fetch("./data/municipio.csv").then(r => r.text()),
    fetch("./data/materiais.csv").then(r => r.text()),
    fetch("./data/causa.csv").then(r => r.text())
  ]);

  state.tecnicos = parseCSV(tecnicosTxt).map(x => ({
    cod: upper(x.cod),
    tecnico: upper(x.tecnico)
  }));

  state.municipios = parseCSV(municipiosTxt).map(x => ({
    municipio: upper(x.municipio),
    uf: upper(x.uf),
    eps: upper(x.eps)
  }));

  state.materiaisCatalogo = parseCSV(materiaisTxt).map(x => ({
    cod_material: upper(x.cod_material),
    nome_material: upper(x.nome_material)
  }));

  const causasRaw = causasTxt.replace(/\r/g, "").trim().split("\n").map(x => x.trim()).filter(Boolean);
  state.causas = causasRaw[0].toLowerCase() === "causa" ? causasRaw.slice(1) : causasRaw;
  state.causas = state.causas.map(x => clean(x));

  preencherCausas();
}

function preencherCausas() {
  el.causa.innerHTML = `<option value="">Selecione</option>`;
  state.causas.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    el.causa.appendChild(option);
  });
}

function setFieldError(input, valid, message) {
  const field = input.closest(".field");
  const errorText = field ? field.querySelector(".error-text") : null;

  if (!valid) {
    field?.classList.add("invalid");
    if (errorText) errorText.textContent = message;
  } else {
    field?.classList.remove("invalid");
    if (errorText) errorText.textContent = "";
  }

  return valid;
}

function maskIdTecnico() {
  let value = upper(el.idTecnico.value).replace(/[^A-Z0-9]/g, "");
  if (!value.startsWith("FB")) {
    value = "FB" + value.replace(/^FB/, "");
  }
  value = "FB" + value.replace(/^FB/, "").replace(/\D/g, "").slice(0, 7);
  el.idTecnico.value = value.slice(0, 9);
}

function maskTTK() {
  const year = new Date().getFullYear();
  let raw = upper(el.ttk.value).replace(/[^A-Z0-9/]/g, "");
  if (!raw.startsWith("TT_")) {
    raw = "TT_" + raw.replace(/^TT_?/, "");
  }
  const digits = raw.replace(/^TT_/, "").replace(/\D/g, "").slice(0, 8);
  el.ttk.value = digits.length === 8 ? `TT_${digits}/${year}` : `TT_${digits}`;
}

function maskCodMaterial() {
  let raw = upper(el.codMaterial.value).replace(/[^A-Z0-9-]/g, "");
  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  el.codMaterial.value = letters + (letters.length === 3 ? "-" : "") + digits;
}

function validateMainFields() {
  const year = new Date().getFullYear();

  const ok1 = setFieldError(el.idTecnico, /^FB\d{7}$/.test(upper(el.idTecnico.value)), "Use o formato FB0000000.");
  const ok2 = setFieldError(el.nomeTecnico, clean(el.nomeTecnico.value).length > 0, "Nome Técnico é obrigatório.");
  const ok3 = setFieldError(el.municipio, clean(el.municipio.value).length > 0, "Município é obrigatório.");
  const ok4 = setFieldError(el.uf, /^[A-Z]{2}$/.test(upper(el.uf.value)), "UF deve conter 2 letras.");
  const ok5 = setFieldError(el.eps, clean(el.eps.value).length > 0, "EPS é obrigatório.");
  const ok6 = setFieldError(el.referencia, REFERENCIAS.includes(el.referencia.value), "Selecione a referência.");
  const ok7 = setFieldError(el.ttk, new RegExp(`^TT_\\d{8}/${year}$`).test(upper(el.ttk.value)), `Use o formato TT_00000000/${year}.`);
  const ok8 = setFieldError(el.causa, clean(el.causa.value).length > 0, "Selecione a causa.");

  if (!state.materiaisSelecionados.length) {
    el.erroMateriais.classList.remove("hidden");
    el.erroMateriais.textContent = "Adicione pelo menos um material";
  } else {
    el.erroMateriais.classList.add("hidden");
  }

  return ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8 && state.materiaisSelecionados.length > 0;
}

function validateMaterialInput() {
  const ok1 = setFieldError(el.codMaterial, /^[A-Z]{3}-\d{15}$/.test(upper(el.codMaterial.value)), "Use o formato AAA-000000000000000.");
  const ok2 = setFieldError(el.nomeMaterial, clean(el.nomeMaterial.value).length > 0, "Nome Material é obrigatório.");
  const ok3 = setFieldError(el.quantidade, /^\d+$/.test(String(el.quantidade.value).trim()) && Number(el.quantidade.value) > 0, "Quantidade deve ser maior que zero.");
  return ok1 && ok2 && ok3;
}

function renderSuggestions(container, items, onSelect, formatText) {
  container.innerHTML = "";
  if (!items.length) {
    container.classList.add("hidden");
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = formatText(item);
    div.addEventListener("click", () => {
      onSelect(item);
      container.classList.add("hidden");
    });
    container.appendChild(div);
  });

  container.classList.remove("hidden");
}

function setupAutocomplete() {
  el.buscaTecnico.addEventListener("input", () => {
    const q = upper(el.buscaTecnico.value);
    if (!q) return el.listaTecnicos.classList.add("hidden");

    const filtered = state.tecnicos.filter(x => x.cod.includes(q) || x.tecnico.includes(q)).slice(0, 20);
    renderSuggestions(
      el.listaTecnicos,
      filtered,
      item => {
        el.idTecnico.value = item.cod;
        el.nomeTecnico.value = item.tecnico;
      },
      item => `${item.cod} - ${item.tecnico}`
    );
  });

  el.buscaMunicipio.addEventListener("input", () => {
    const q = upper(el.buscaMunicipio.value);
    if (!q) return el.listaMunicipios.classList.add("hidden");

    const filtered = state.municipios.filter(x =>
      x.municipio.includes(q) || x.uf.includes(q) || x.eps.includes(q)
    ).slice(0, 20);

    renderSuggestions(
      el.listaMunicipios,
      filtered,
      item => {
        el.municipio.value = item.municipio;
        el.uf.value = item.uf;
        el.eps.value = item.eps;
      },
      item => `${item.municipio} - ${item.uf} - ${item.eps}`
    );
  });

  el.buscaMaterial.addEventListener("input", () => {
    const q = upper(el.buscaMaterial.value);
    if (!q) return el.listaMateriais.classList.add("hidden");

    const filtered = state.materiaisCatalogo.filter(x =>
      x.cod_material.includes(q) || x.nome_material.includes(q)
    ).slice(0, 20);

    renderSuggestions(
      el.listaMateriais,
      filtered,
      item => {
        el.codMaterial.value = item.cod_material;
        el.nomeMaterial.value = item.nome_material;
      },
      item => `${item.cod_material} - ${item.nome_material}`
    );
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".autocomplete")) {
      el.listaTecnicos.classList.add("hidden");
      el.listaMunicipios.classList.add("hidden");
      el.listaMateriais.classList.add("hidden");
    }
  });
}

function renderMateriais() {
  el.tbodyMateriais.innerHTML = "";

  if (!state.materiaisSelecionados.length) {
    el.tbodyMateriais.innerHTML = `
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
    el.tbodyMateriais.appendChild(tr);
  });

  el.tbodyMateriais.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      state.materiaisSelecionados.splice(idx, 1);
      renderMateriais();
    });
  });
}

function clearMaterialInput() {
  el.buscaMaterial.value = "";
  el.codMaterial.value = "";
  el.nomeMaterial.value = "";
  el.quantidade.value = "";
}

function buildCSVAndPayload() {
  const header = "id_tecnico;nome_tecnico;municipio;uf;eps;referencia_atividade;ttk;causa;cod_material;nome_material;quantidade";

  const baseData = {
    id_tecnico: upper(el.idTecnico.value),
    nome_tecnico: upper(el.nomeTecnico.value),
    municipio: upper(el.municipio.value),
    uf: upper(el.uf.value),
    eps: upper(el.eps.value),
    referencia_atividade: el.referencia.value,
    ttk: upper(el.ttk.value),
    causa: el.causa.value
  };

  const linhas = state.materiaisSelecionados.map(item => [
    baseData.id_tecnico,
    baseData.nome_tecnico,
    baseData.municipio,
    baseData.uf,
    baseData.eps,
    baseData.referencia_atividade,
    baseData.ttk,
    baseData.causa,
    item.cod_material,
    item.nome_material,
    item.quantidade
  ].join(";"));

  const contentText = [header, ...linhas].join("\n");
  const contentBase64 = btoa(unescape(encodeURIComponent(contentText)));
  const fileName = `BOOT_PROTHEUS_${new Date().toISOString().slice(0,19).replace(/[-:T]/g, "")}.csv`;

  state.payloadFinal = {
    fileName,
    contentBase64,
    contentText,
    mimeType: "text/csv",
    dados: {
      ...baseData,
      materiais: state.materiaisSelecionados.map(item => ({
        cod_material: item.cod_material,
        nome_material: item.nome_material,
        quantidade: item.quantidade
      }))
    }
  };

  return state.payloadFinal;
}

function exibirJSON() {
  const payload = buildCSVAndPayload();
  el.jsonOutput.textContent = JSON.stringify(payload, null, 2);
  console.log("Payload final para Power Automate:", payload);
  return payload;
}

async function enviarParaPowerAutomate() {
  hideAlert();

  if (!validateMainFields()) {
    showAlert("Verifique os campos obrigatórios antes de enviar.", "error");
    return;
  }

  const payload = exibirJSON();

  try {
    el.btnEnviarPowerAutomate.disabled = true;
    el.btnEnviarPowerAutomate.textContent = "Enviando...";

    const response = await fetch(FLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let resultText = "";
    try {
      resultText = await response.text();
    } catch {
      resultText = "";
    }

    if (!response.ok) {
      showAlert(`Erro ao enviar para o Power Automate. Status: ${response.status}<br>${resultText || ""}`, "error");
      return;
    }

    showAlert(`Enviado com sucesso para o Power Automate.<br>Status: ${response.status}<br>${resultText || ""}`, "success");
  } catch (error) {
    showAlert(`Falha ao chamar o Power Automate.<br>${error.message}`, "error");
  } finally {
    el.btnEnviarPowerAutomate.disabled = false;
    el.btnEnviarPowerAutomate.textContent = "Enviar para Power Automate";
  }
}

function bindEvents() {
  el.idTecnico.addEventListener("input", () => {
    maskIdTecnico();
    validateMainFields();
  });

  el.nomeTecnico.addEventListener("input", () => {
    el.nomeTecnico.value = upper(el.nomeTecnico.value);
    validateMainFields();
  });

  el.municipio.addEventListener("input", () => {
    el.municipio.value = upper(el.municipio.value);
    validateMainFields();
  });

  el.uf.addEventListener("input", () => {
    el.uf.value = upper(el.uf.value).slice(0, 2);
    validateMainFields();
  });

  el.eps.addEventListener("input", () => {
    el.eps.value = upper(el.eps.value);
    validateMainFields();
  });

  el.ttk.addEventListener("input", () => {
    maskTTK();
    validateMainFields();
  });

  el.referencia.addEventListener("change", validateMainFields);
  el.causa.addEventListener("change", validateMainFields);

  el.codMaterial.addEventListener("input", () => {
    maskCodMaterial();
    validateMaterialInput();
  });

  el.nomeMaterial.addEventListener("input", () => {
    el.nomeMaterial.value = upper(el.nomeMaterial.value);
    validateMaterialInput();
  });

  el.quantidade.addEventListener("input", validateMaterialInput);

  el.btnAdicionarMaterial.addEventListener("click", () => {
    hideAlert();

    el.codMaterial.value = upper(el.codMaterial.value);
    el.nomeMaterial.value = upper(el.nomeMaterial.value);

    if (!validateMaterialInput()) return;

    state.materiaisSelecionados.push({
      cod_material: el.codMaterial.value,
      nome_material: el.nomeMaterial.value,
      quantidade: Number(el.quantidade.value)
    });

    clearMaterialInput();
    renderMateriais();
    validateMainFields();
  });

  el.btnGerarJson.addEventListener("click", () => {
    hideAlert();
    if (!validateMainFields()) {
      showAlert("Preencha corretamente os campos obrigatórios para gerar o JSON.", "warning");
      return;
    }
    exibirJSON();
    showAlert("JSON gerado com sucesso.", "success");
  });

  el.btnEnviarPowerAutomate.addEventListener("click", enviarParaPowerAutomate);
}

(async function init() {
  try {
    await loadData();
    setupAutocomplete();
    bindEvents();
    renderMateriais();
  } catch (error) {
    showAlert("Erro ao carregar os arquivos CSV. Verifique se a pasta /data foi publicada corretamente no GitHub Pages.", "error");
    console.error(error);
  }
})();
