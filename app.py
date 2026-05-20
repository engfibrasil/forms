import csv
import io
import os
import re
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static")
)

TECNICOS_CSV = BASE_DIR / "lista_tecnicos.csv"
MUNICIPIOS_CSV = BASE_DIR / "municipio.csv"
MATERIAIS_CSV = BASE_DIR / "materiais.csv"
CAUSAS_CSV = BASE_DIR / "causa.csv"

REFERENCIAS_ATIVIDADE = [
    "Manutenção corretiva (TTK)",
    "Preventiva",
    "Implantação de prédios",
    "Alivio de Rede",
]

ID_TECNICO_REGEX = re.compile(r"^FB\d{7}$")
TTK_REGEX = re.compile(r"^TT_\d{8}/\d{4}$")
COD_MATERIAL_REGEX = re.compile(r"^[A-Z]{3}-\d{11}$")


def normalize_dict(row):
    cleaned = {}
    for k, v in row.items():
        if k is None:
            continue
        key = str(k).strip()
        value = "" if v is None else str(v).strip()
        cleaned[key] = value
    return cleaned


def normalize_upper(value):
    return str(value or "").strip().upper()


def normalize_spaces(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def read_csv_dicts(file_path):
    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = []
        for row in reader:
            normalized = normalize_dict(row)
            normalized.pop("", None)
            rows.append(normalized)
        return rows


def read_csv_single_column(file_path):
    values = []
    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f, delimiter=";")
        rows = list(reader)
        for i, row in enumerate(rows):
            if not row:
                continue
            first_col = str(row[0]).strip()
            if i == 0 and first_col.lower() == "causa":
                continue
            if first_col:
                values.append(first_col)
    return values


def validate_required_text(field_name, value, errors):
    if not normalize_spaces(value):
        errors.append(f"O campo '{field_name}' é obrigatório.")


def load_tecnicos():
    return read_csv_dicts(TECNICOS_CSV)


def load_municipios():
    return read_csv_dicts(MUNICIPIOS_CSV)


def load_materiais():
    return read_csv_dicts(MATERIAIS_CSV)


def load_causas():
    return read_csv_single_column(CAUSAS_CSV)


def find_tecnico_by_cod(cod):
    cod = normalize_upper(cod)
    for item in load_tecnicos():
        if normalize_upper(item.get("cod")) == cod:
            return item
    return None


def find_municipio(municipio, uf):
    municipio = normalize_upper(municipio)
    uf = normalize_upper(uf)

    for item in load_municipios():
        if (
            normalize_upper(item.get("municipio")) == municipio
            and normalize_upper(item.get("uf")) == uf
        ):
            return item
    return None


def find_material_by_cod(cod):
    cod = normalize_upper(cod)
    for item in load_materiais():
        if normalize_upper(item.get("cod_material")) == cod:
            return item
    return None


def validate_id_tecnico(id_tecnico, errors):
    id_tecnico = normalize_upper(id_tecnico)
    if not ID_TECNICO_REGEX.fullmatch(id_tecnico):
        errors.append("ID Técnico inválido. Use o formato FB0000000.")


def validate_ttk(ttk, errors):
    ttk = normalize_upper(ttk)
    if not TTK_REGEX.fullmatch(ttk):
        errors.append("TTK da Atividade inválido. Use o formato TT_00000000/2026.")
        return

    ano = ttk.split("/")[-1]
    ano_atual = str(datetime.now().year)
    if ano != ano_atual:
        errors.append(f"TTK da Atividade deve terminar com /{ano_atual}.")


def validate_referencia(referencia, errors):
    if referencia not in REFERENCIAS_ATIVIDADE:
        errors.append("Referência da Atividade inválida.")


def validate_causa(causa, errors):
    causas = [normalize_spaces(item).upper() for item in load_causas()]
    if normalize_spaces(causa).upper() not in causas:
        errors.append("Causa inválida.")


def validate_materials(materials, errors):
    if not isinstance(materials, list) or len(materials) == 0:
        errors.append("Adicione pelo menos um material")
        return

    for idx, material in enumerate(materials, start=1):
        cod_material = normalize_upper(material.get("cod_material"))
        nome_material = normalize_spaces(material.get("nome_material"))
        quantidade_raw = str(material.get("quantidade", "")).strip()

        if not cod_material or not nome_material or not quantidade_raw:
            errors.append(f"Material {idx}: código, nome e quantidade são obrigatórios.")
            continue

        if not COD_MATERIAL_REGEX.fullmatch(cod_material):
            errors.append(
                f"Material {idx}: código inválido. Use o formato AAA-00000000000."
            )

        if not quantidade_raw.isdigit():
            errors.append(f"Material {idx}: quantidade deve ser numérica.")
            continue

        quantidade = int(quantidade_raw)
        if quantidade <= 0:
            errors.append(f"Material {idx}: quantidade deve ser maior que zero.")

        item_csv = find_material_by_cod(cod_material)
        if item_csv:
            nome_csv = normalize_spaces(item_csv.get("nome_material"))
            if normalize_spaces(nome_material).upper() != nome_csv.upper():
                errors.append(
                    f"Material {idx}: nome do material não confere com o código informado."
                )


def build_csv_content(payload):
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", lineterminator="\n")
    writer.writerow(
        [
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
            "quantidade",
        ]
    )

    for material in payload["materiais"]:
        writer.writerow(
            [
                payload["id_tecnico"],
                payload["nome_tecnico"],
                payload["municipio"],
                payload["uf"],
                payload["eps"],
                payload["referencia_atividade"],
                payload["ttk"],
                payload["causa"],
                material["cod_material"],
                material["nome_material"],
                material["quantidade"],
            ]
        )

    return output.getvalue()


def send_email_with_attachment(csv_content, filename):
    email_remetente = os.getenv("EMAIL", "").strip()
    senha = os.getenv("SENHA", "").strip()
    destinatario = "marcos.oliveira@fibrasil.com.br"

    if not email_remetente or not senha:
        raise ValueError("Variáveis EMAIL e SENHA devem estar definidas no arquivo .env.")

    msg = EmailMessage()
    msg["Subject"] = "BOOT_PROTHEUS ENVIO"
    msg["From"] = email_remetente
    msg["To"] = destinatario
    msg.set_content("Segue em anexo o arquivo CSV gerado pelo sistema local.")

    msg.add_attachment(
        csv_content.encode("utf-8-sig"),
        maintype="text",
        subtype="csv",
        filename=filename,
    )

    with smtplib.SMTP("smtp.zoho.com", 587) as server:
        server.starttls()
        server.login(email_remetente, senha)
        server.send_message(msg)


@app.route("/", methods=["GET"])
def index():
    return render_template(
        "index.html",
        referencias=REFERENCIAS_ATIVIDADE,
        current_year=datetime.now().year,
    )


@app.route("/api/tecnicos", methods=["GET"])
def api_tecnicos():
    q = normalize_upper(request.args.get("q", ""))
    data = load_tecnicos()

    if q:
        data = [
            item for item in data
            if q in normalize_upper(item.get("cod"))
            or q in normalize_upper(item.get("tecnico"))
            or q in normalize_upper(item.get("eps"))
        ]

    results = [
        {
            "cod": normalize_upper(item.get("cod")),
            "tecnico": normalize_spaces(item.get("tecnico")).upper(),
            "eps": normalize_spaces(item.get("eps")).upper(),
            "display": f"{normalize_upper(item.get('cod'))} - {normalize_spaces(item.get('tecnico')).upper()}",
        }
        for item in data[:20]
    ]
    return jsonify(results)


@app.route("/api/municipios", methods=["GET"])
def api_municipios():
    q = normalize_upper(request.args.get("q", ""))
    data = load_municipios()

    if q:
        data = [
            item for item in data
            if q in normalize_upper(item.get("municipio"))
            or q in normalize_upper(item.get("uf"))
        ]

    results = [
        {
            "municipio": normalize_upper(item.get("municipio")),
            "uf": normalize_upper(item.get("uf")),
            "display": f"{normalize_upper(item.get('municipio'))} - {normalize_upper(item.get('uf'))}",
        }
        for item in data[:20]
    ]
    return jsonify(results)


@app.route("/api/materiais", methods=["GET"])
def api_materiais():
    q = normalize_upper(request.args.get("q", ""))
    data = load_materiais()

    if q:
        data = [
            item for item in data
            if q in normalize_upper(item.get("cod_material"))
            or q in normalize_upper(item.get("nome_material"))
        ]

    results = [
        {
            "cod_material": normalize_upper(item.get("cod_material")),
            "nome_material": normalize_spaces(item.get("nome_material")).upper(),
            "display": f"{normalize_upper(item.get('cod_material'))} - {normalize_spaces(item.get('nome_material')).upper()}",
        }
        for item in data[:20]
    ]
    return jsonify(results)


@app.route("/api/causas", methods=["GET"])
def api_causas():
    q = normalize_upper(request.args.get("q", ""))
    data = load_causas()

    if q:
        data = [item for item in data if q in normalize_upper(item)]

    results = [
        {
            "value": normalize_spaces(item).upper(),
            "display": normalize_spaces(item).upper(),
        }
        for item in data[:20]
    ]
    return jsonify(results)


@app.route("/submit", methods=["POST"])
def submit():
    data = request.get_json(silent=True) or {}
    errors = []

    id_tecnico = normalize_upper(data.get("id_tecnico"))
    nome_tecnico = normalize_spaces(data.get("nome_tecnico")).upper()
    municipio = normalize_spaces(data.get("municipio")).upper()
    uf = normalize_upper(data.get("uf"))
    eps = normalize_spaces(data.get("eps")).upper()
    referencia_atividade = normalize_spaces(data.get("referencia_atividade"))
    ttk = normalize_upper(data.get("ttk"))
    causa = normalize_spaces(data.get("causa")).upper()
    materiais = data.get("materiais", [])

    validate_required_text("ID Técnico", id_tecnico, errors)
    validate_required_text("Nome Técnico", nome_tecnico, errors)
    validate_required_text("Município", municipio, errors)
    validate_required_text("UF", uf, errors)
    validate_required_text("EPS", eps, errors)
    validate_required_text("Referência da Atividade", referencia_atividade, errors)
    validate_required_text("TTK da Atividade", ttk, errors)
    validate_required_text("Causa", causa, errors)

    validate_id_tecnico(id_tecnico, errors)
    validate_ttk(ttk, errors)
    validate_referencia(referencia_atividade, errors)
    validate_causa(causa, errors)
    validate_materials(materiais, errors)

    tecnico_csv = find_tecnico_by_cod(id_tecnico)
    if tecnico_csv:
        nome_csv = normalize_spaces(tecnico_csv.get("tecnico")).upper()
        eps_csv = normalize_spaces(tecnico_csv.get("eps")).upper()

        if nome_tecnico != nome_csv:
            errors.append("Nome Técnico não confere com o ID Técnico selecionado.")

        if eps != eps_csv:
            errors.append("EPS não confere com o técnico selecionado.")

    municipio_csv = find_municipio(municipio, uf)
    if not municipio_csv:
        errors.append("Município e UF não conferem com um registro válido do CSV.")

    if errors:
        return jsonify({"success": False, "errors": errors}), 400

    payload = {
        "id_tecnico": id_tecnico,
        "nome_tecnico": nome_tecnico,
        "municipio": municipio,
        "uf": uf,
        "eps": eps,
        "referencia_atividade": referencia_atividade,
        "ttk": ttk,
        "causa": causa,
        "materiais": [
            {
                "cod_material": normalize_upper(m.get("cod_material")),
                "nome_material": normalize_spaces(m.get("nome_material")).upper(),
                "quantidade": int(str(m.get("quantidade")).strip()),
            }
            for m in materiais
        ],
    }

    csv_content = build_csv_content(payload)
    filename = f"BOOT_PROTHEUS_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    output_path = BASE_DIR / filename
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        f.write(csv_content)

    try:
        send_email_with_attachment(csv_content, filename)
    except Exception as e:
        return jsonify(
            {
                "success": False,
                "errors": [f"CSV gerado com sucesso, mas houve erro ao enviar e-mail: {str(e)}"],
                "generated_file": filename,
            }
        ), 500

    return jsonify(
        {
            "success": True,
            "message": "CSV gerado e enviado por e-mail com sucesso.",
            "generated_file": filename,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)