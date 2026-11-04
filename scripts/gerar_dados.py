#!/usr/bin/env python3
"""Gera os artefatos de dados do portal a partir dos CSVs em dados/.

Saída (em public/ por padrão, ou no caminho passado em --destino):
  data.js                     -> dados embutidos consumidos pelo site em runtime
  dados/*.csv|*.json          -> cópias abertas dos conjuntos (download)
  dados/condominio.sqlite     -> banco SQLite para quem quer consultas SQL
  dados/datapackage.json      -> metadados no estilo Frictionless/CKAN
  documentos/**               -> PDFs e fotos organizados por categoria

Perfis (--perfil publico|completo, padrão publico):
  publico     -> EXCLUI tudo com visibilidade=administrativo (é o que sobe pro gh-pages)
  completo    -> mantém tudo; usado para a cópia local da síndica (dist-local/)

Uso: python3 scripts/gerar_dados.py [--destino public] [--perfil publico]
"""
from __future__ import annotations

import argparse
import calendar
import csv
import json
import shutil
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_DADOS = RAIZ / "dados"
DIR_DOCS = RAIZ / "documentos"

CATEGORIAS = ["hidraulica", "eletrica", "mecanica", "estrutural", "servicos"]
TIPOS_MANUTENCAO = ["preventiva", "corretiva", "inspecao"]
CRITICIDADES = ["alta", "media", "baixa"]
TIPOS_CRONOGRAMA = ["preventiva", "inspecao"]
TIPOS_DOCUMENTO = ["relatorio", "ordem_servico", "nota_fiscal", "contrato", "certificado",
                   "relatorio_fotografico", "laudo", "parecer", "art"]
VISIBILIDADES = ["publico", "administrativo"]
STATUS_CONTRATO = ["ativo", "encerrado"]
STATUS_ORCAMENTO = ["aguardando", "aprovado", "rejeitado"]
DIAS_VENCE_BREVE = 30
DIAS_VENCE_DOC = 90

CONDOMINIO = "Edifício Exemplo"
AVISO = "Dados fictícios de demonstração — substitua pelos dados reais do condomínio."


# --------------------------------------------------------------------------- IO
def ler_csv(nome: str) -> list[dict]:
    caminho = DIR_DADOS / nome
    if not caminho.exists():
        erro(f"Arquivo obrigatório não encontrado: dados/{nome}")
    with open(caminho, encoding="utf-8-sig", newline="") as fh:
        amostra = fh.read(4096)
        fh.seek(0)
        delimitador = csv.Sniffer().sniff(amostra, delimiters=";,").delimiter if amostra else ";"
        linhas = list(csv.DictReader(fh, delimiter=delimitador))
    return [{(k or "").strip(): (v or "").strip() for k, v in linha.items()} for linha in linhas]


def parse_valor(texto: str, contexto: str, erros: list[str]) -> float | None:
    """Aceita 3200 / 3200.50 / 3.200,50 / R$ 3.200,50. Vazio -> None."""
    texto = (texto or "").replace("R$", "").replace(" ", "")
    if not texto:
        return None
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        valor = float(texto)
    except ValueError:
        erros.append(f"{contexto}: valor inválido '{texto}' (use 3200.50 ou 3200,50, sem separador de milhar)")
        return None
    if valor < 0:
        erros.append(f"{contexto}: valor negativo não faz sentido ({texto})")
    return valor


def parse_data(texto: str, contexto: str, erros: list[str]) -> date | None:
    texto = (texto or "").strip()
    if not texto:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(texto, fmt).date()
        except ValueError:
            continue
    erros.append(f"{contexto}: data inválida '{texto}' (use AAAA-MM-DD ou DD/MM/AAAA)")
    return None


def fmt_data(d: date | None) -> str | None:
    return d.isoformat() if d else None


def add_meses(d: date, meses: int) -> date:
    mes_total = d.month - 1 + meses
    ano = d.year + mes_total // 12
    mes = mes_total % 12 + 1
    dia = min(d.day, calendar.monthrange(ano, mes)[1])
    return date(ano, mes, dia)


def erro(msg: str) -> None:
    print(f"ERRO: {msg}", file=sys.stderr)
    sys.exit(1)


# --------------------------------------------------------------------- validação
def validar(hoje, ativos, prestadores, cronograma, manutencoes, documentos, contratos, orcamentos):
    erros: list[str] = []
    avisos: list[str] = []
    ids_ativos = {a["id"] for a in ativos}
    ids_prestadores = {p["id"] for p in prestadores}
    ids_manutencoes = {m["id"] for m in manutencoes}
    ids_cronograma: set[str] = set()
    ids_orcamentos = {o["id"] for o in orcamentos}

    for i, a in enumerate(ativos, start=2):
        ctx = f"ativos.csv linha {i}"
        if not a["id"]:
            erros.append(f"{ctx}: id vazio")
        if a["categoria"] not in CATEGORIAS:
            erros.append(f"{ctx}: categoria '{a['categoria']}' inválida (use: {', '.join(CATEGORIAS)})")
        if a["criticidade"] not in CRITICIDADES:
            erros.append(f"{ctx}: criticidade '{a['criticidade']}' inválida (use: {', '.join(CRITICIDADES)})")

    for i, p in enumerate(prestadores, start=2):
        if not p["id"]:
            erros.append(f"prestadores.csv linha {i}: id vazio")

    for i, c in enumerate(cronograma, start=2):
        ctx = f"cronograma.csv linha {i} ({c['id'] or 'sem id'})"
        if not c["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if c["id"] in ids_cronograma:
            erros.append(f"{ctx}: id duplicado")
        ids_cronograma.add(c["id"])
        if c["ativo_id"] not in ids_ativos:
            erros.append(f"{ctx}: ativo_id '{c['ativo_id']}' não existe em ativos.csv")
        if c["prestador_id"] and c["prestador_id"] not in ids_prestadores:
            erros.append(f"{ctx}: prestador_id '{c['prestador_id']}' não existe em prestadores.csv")
        if c["tipo"] not in TIPOS_CRONOGRAMA:
            erros.append(f"{ctx}: tipo '{c['tipo']}' inválido (use: {', '.join(TIPOS_CRONOGRAMA)})")
        try:
            per = int(c["periodicidade_meses"])
            if per < 1:
                raise ValueError
        except ValueError:
            erros.append(f"{ctx}: periodicidade_meses '{c['periodicidade_meses']}' inválida (número inteiro >= 1)")
        parse_valor(c["valor_referencia"], ctx, erros)
        parse_data(c["ultima_execucao"], ctx, erros)

    ids_manu = set()
    for i, m in enumerate(manutencoes, start=2):
        ctx = f"manutencoes.csv linha {i} ({m['id'] or 'sem id'})"
        if not m["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if m["id"] in ids_manu:
            erros.append(f"{ctx}: id duplicado")
        ids_manu.add(m["id"])
        parse_data(m["data"], ctx, erros)
        if m["ativo_id"] not in ids_ativos:
            erros.append(f"{ctx}: ativo_id '{m['ativo_id']}' não existe em ativos.csv")
        if m["cronograma_id"] and m["cronograma_id"] not in ids_cronograma:
            erros.append(f"{ctx}: cronograma_id '{m['cronograma_id']}' não existe em cronograma.csv")
        if m["prestador_id"] and m["prestador_id"] not in ids_prestadores:
            erros.append(f"{ctx}: prestador_id '{m['prestador_id']}' não existe em prestadores.csv")
        if m["tipo"] not in TIPOS_MANUTENCAO:
            erros.append(f"{ctx}: tipo '{m['tipo']}' inválido (use: {', '.join(TIPOS_MANUTENCAO)})")
        parse_valor(m["valor"], ctx, erros)
        if m["documento"] and not (RAIZ / m["documento"]).exists():
            erros.append(f"{ctx}: documento '{m['documento']}' não existe")
        if m["orcamento_id"] and m["orcamento_id"] not in ids_orcamentos:
            erros.append(f"{ctx}: orcamento_id '{m['orcamento_id']}' não existe em orcamentos.csv")

    arquivos_manifesto = set()
    ids_docs = set()
    for i, d in enumerate(documentos, start=2):
        ctx = f"documentos.csv linha {i} ({d['id'] or 'sem id'})"
        if not d["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if d["id"] in ids_docs:
            erros.append(f"{ctx}: id duplicado")
        ids_docs.add(d["id"])
        if d["categoria"] not in CATEGORIAS:
            erros.append(f"{ctx}: categoria '{d['categoria']}' inválida")
        if not d["arquivo"]:
            erros.append(f"{ctx}: arquivo é obrigatório")
        elif not (RAIZ / d["arquivo"]).exists():
            erros.append(f"{ctx}: arquivo '{d['arquivo']}' não existe em documentos/")
        else:
            arquivos_manifesto.add(d["arquivo"])
        if d["tipo"] not in TIPOS_DOCUMENTO:
            erros.append(f"{ctx}: tipo '{d['tipo']}' inválido (use: {', '.join(TIPOS_DOCUMENTO)})")
        emissao = parse_data(d["data_emissao"], ctx, erros)
        validade = parse_data(d["validade"], ctx, erros)
        if emissao and validade and validade < emissao:
            erros.append(f"{ctx}: validade ({validade}) é anterior à emissão ({emissao})")
        if d["prestador_id"] and d["prestador_id"] not in ids_prestadores:
            erros.append(f"{ctx}: prestador_id '{d['prestador_id']}' não existe em prestadores.csv")
        if d["manutencao_id"] and d["manutencao_id"] not in ids_manutencoes:
            erros.append(f"{ctx}: manutencao_id '{d['manutencao_id']}' não existe em manutencoes.csv")
        if d["visibilidade"] not in VISIBILIDADES:
            erros.append(f"{ctx}: visibilidade '{d['visibilidade']}' inválida (use: publico ou administrativo)")

    for i, ct in enumerate(contratos, start=2):
        ctx = f"contratos.csv linha {i} ({ct['id'] or 'sem id'})"
        if not ct["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if ct["prestador_id"] not in ids_prestadores:
            erros.append(f"{ctx}: prestador_id '{ct['prestador_id']}' não existe em prestadores.csv")
        if ct["categoria"] not in CATEGORIAS:
            erros.append(f"{ctx}: categoria '{ct['categoria']}' inválida")
        inicio = parse_data(ct["inicio"], ctx, erros)
        fim = parse_data(ct["fim"], ctx, erros)
        if inicio and fim and fim < inicio:
            erros.append(f"{ctx}: fim ({fim}) é anterior ao início ({inicio})")
        if ct["status"] not in STATUS_CONTRATO:
            erros.append(f"{ctx}: status '{ct['status']}' inválido (use: {', '.join(STATUS_CONTRATO)})")
        parse_valor(ct["valor_mensal"], ctx, erros)
        if ct["documento"] and not (RAIZ / ct["documento"]).exists():
            erros.append(f"{ctx}: documento '{ct['documento']}' não existe")

    ids_orc = set()
    for i, o in enumerate(orcamentos, start=2):
        ctx = f"orcamentos.csv linha {i} ({o['id'] or 'sem id'})"
        if not o["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if o["id"] in ids_orc:
            erros.append(f"{ctx}: id duplicado")
        ids_orc.add(o["id"])
        parse_data(o["data"], ctx, erros)
        if o["ativo_id"] and o["ativo_id"] not in ids_ativos:
            erros.append(f"{ctx}: ativo_id '{o['ativo_id']}' não existe em ativos.csv")
        if o["cronograma_id"] and o["cronograma_id"] not in ids_cronograma:
            erros.append(f"{ctx}: cronograma_id '{o['cronograma_id']}' não existe em cronograma.csv")
        if o["prestador_id"] and o["prestador_id"] not in ids_prestadores:
            erros.append(f"{ctx}: prestador_id '{o['prestador_id']}' não existe em prestadores.csv")
        if o["status"] not in STATUS_ORCAMENTO:
            erros.append(f"{ctx}: status '{o['status']}' inválido (use: {', '.join(STATUS_ORCAMENTO)})")
        if parse_valor(o["valor"], ctx, erros) is None:
            erros.append(f"{ctx}: valor é obrigatório em orçamento")
        if o["documento"] and not (RAIZ / o["documento"]).exists():
            erros.append(f"{ctx}: documento '{o['documento']}' não existe")

    # arquivos em documentos/ sem registro no manifesto (aviso, não erro)
    if DIR_DOCS.exists():
        catalogados = {d["arquivo"] for d in documentos if d["arquivo"]}
        for arq in sorted(DIR_DOCS.rglob("*")):
            if arq.suffix.lower() in (".pdf", ".png", ".jpg", ".jpeg"):
                rel = arq.relative_to(RAIZ).as_posix()
                if rel not in catalogados:
                    avisos.append(f"arquivo presente em documentos/ mas sem registro em dados/documentos.csv: {rel}")

    return erros, avisos


# --------------------------------------------------------------------- derivados
def calcular_cronograma(hoje: date, ativos, prestadores, cronograma, manutencoes):
    ativo_por_id = {a["id"]: a for a in ativos}
    prest_por_id = {p["id"]: p for p in prestadores}
    execs_por_crono: dict[str, list[dict]] = {}
    for m in manutencoes:
        if m["cronograma_id"]:
            execs_por_crono.setdefault(m["cronograma_id"], []).append(m)

    resultado = []
    for c in cronograma:
        execs = sorted(execs_por_crono.get(c["id"], []), key=lambda m: m["_data"])
        datas_exec = [m["_data"] for m in execs]
        manual = parse_data(c["ultima_execucao"], f"cronograma {c['id']}", [])
        if manual:
            datas_exec.append(manual)
        ultima = max(datas_exec) if datas_exec else None
        proxima = add_meses(ultima, int(c["periodicidade_meses"])) if ultima else None
        dias = (proxima - hoje).days if proxima else None
        if proxima is None:
            status = "a_programar"
        elif dias < 0:
            status = "atrasado"
        elif dias <= DIAS_VENCE_BREVE:
            status = "vence_breve"
        else:
            status = "em_dia"

        valores = [m["_valor"] for m in execs if m["_valor"] is not None]
        valor_referencia = parse_valor(c["valor_referencia"], f"cronograma {c['id']}", [])
        valor_estimado = round(sum(valores) / len(valores), 2) if valores else valor_referencia
        custo_anual = round(valor_estimado * 12 / int(c["periodicidade_meses"]), 2) if valor_estimado else None

        resultado.append({
            **c,
            "ativo_nome": ativo_por_id.get(c["ativo_id"], {}).get("nome", "?"),
            "categoria": ativo_por_id.get(c["ativo_id"], {}).get("categoria", "?"),
            "prestador_nome": prest_por_id.get(c["prestador_id"], {}).get("nome") if c["prestador_id"] else None,
            "n_execucoes": len(execs),
            "ultima_execucao": fmt_data(ultima),
            "ultima_origem": "manual" if manual and ultima == manual else "historico",
            "ultimo_valor": execs[-1]["_valor"] if execs else None,
            "valor_estimado": valor_estimado,
            "custo_anual_estimado": custo_anual,
            "proxima_execucao": fmt_data(proxima),
            "dias_restantes": dias,
            "status": status,
        })
    return resultado


def calcular_documentos(hoje: date, documentos, prestadores, manutencoes):
    prest_por_id = {p["id"]: p for p in prestadores}
    manu_por_id = {m["id"]: m for m in manutencoes}
    resultado = []
    for d in documentos:
        validade = parse_data(d["validade"], f"documento {d['id']}", [])
        if not validade:
            status_val = "sem_validade"
        elif validade < hoje:
            status_val = "vencido"
        elif (validade - hoje).days <= DIAS_VENCE_DOC:
            status_val = "vence_breve"
        else:
            status_val = "valido"
        resultado.append({
            **d,
            "status_validade": status_val,
            "prestador_nome": prest_por_id.get(d["prestador_id"], {}).get("nome") if d["prestador_id"] else None,
            "manutencao_descricao": manu_por_id.get(d["manutencao_id"], {}).get("descricao") if d["manutencao_id"] else None,
            "administrativo": d["visibilidade"] == "administrativo",
            "tamanho": (RAIZ / d["arquivo"]).stat().st_size if (RAIZ / d["arquivo"]).exists() else None,
            "extensao": Path(d["arquivo"]).suffix.lower().lstrip("."),
        })
    return resultado


def calcular_contratos(hoje: date, contratos, prestadores, manutencoes):
    prest_por_id = {p["id"]: p for p in prestadores}
    gasto_12m: dict[str, float] = {}
    inicio_12m = add_meses(hoje, -11)
    for m in manutencoes:
        if m["prestador_id"] and m["_data"] >= date(inicio_12m.year, inicio_12m.month, 1) and m["_valor"]:
            gasto_12m[m["prestador_id"]] = gasto_12m.get(m["prestador_id"], 0) + m["_valor"]

    ativo_por_id = {a["id"]: a for a in ATIVOS}
    resultado = []
    for ct in contratos:
        fim = parse_data(ct["fim"], f"contrato {ct['id']}", [])
        vigente = ct["status"] == "ativo" and fim and fim >= hoje
        resultado.append({
            **ct,
            "prestador_nome": prest_por_id.get(ct["prestador_id"], {}).get("nome", "?"),
            "vigente": vigente,
            "dias_para_fim": (fim - hoje).days if fim else None,
            "gasto_12m_prestador": round(gasto_12m.get(ct["prestador_id"], 0), 2),
        })
    return resultado, ativo_por_id


def calcular_orcamentos(orcamentos, prestadores, cronograma_calc):
    prest_por_id = {p["id"]: p for p in prestadores}
    crono_por_id = {c["id"]: c for c in cronograma_calc}
    ativo_por_id = {a["id"]: a for a in ATIVOS}
    resultado = []
    for o in orcamentos:
        resultado.append({
            **o,
            "prestador_nome": prest_por_id.get(o["prestador_id"], {}).get("nome") if o["prestador_id"] else None,
            "ativo_nome": ativo_por_id.get(o["ativo_id"], {}).get("nome") if o["ativo_id"] else None,
            "cronograma_atividade": crono_por_id.get(o["cronograma_id"], {}).get("atividade") if o["cronograma_id"] else None,
        })
    return resultado


def agregar(hoje: date, manutencoes, cronograma_calc, ativos, documentos_calc, contratos_calc, orcamentos_calc):
    ano_atual = hoje.year
    inicio_12m = add_meses(hoje, -11)
    inicio_12m = date(inicio_12m.year, inicio_12m.month, 1)

    com_valor = [m for m in manutencoes if m["_valor"] is not None]
    cat_por_ativo = {a["id"]: a["categoria"] for a in ativos}

    def total_ms(ms):
        return round(sum(m["_valor"] for m in ms), 2)

    por_categoria_12m = [
        {"categoria": cat, "total": total_ms(
            [m for m in com_valor if cat_por_ativo.get(m["ativo_id"]) == cat and m["_data"] >= inicio_12m])}
        for cat in CATEGORIAS
    ]

    por_mes = []
    cursor = inicio_12m
    while cursor <= hoje:
        proximo = add_meses(cursor, 1)
        por_mes.append({
            "mes": cursor.isoformat()[:7],
            "total": total_ms([m for m in com_valor if cursor <= m["_data"] < proximo]),
            "corretivas": sum(1 for m in manutencoes if m["tipo"] == "corretiva" and cursor <= m["_data"] < proximo),
        })
        cursor = proximo

    atrasadas = [c for c in cronograma_calc if c["status"] == "atrasado"]
    vencendo = [c for c in cronograma_calc if c["status"] == "vence_breve"]
    custo_anual = round(sum(c["custo_anual_estimado"] or 0 for c in cronograma_calc), 2)

    docs_vencidos = [d for d in documentos_calc if d["status_validade"] == "vencido"]
    docs_vencendo = [d for d in documentos_calc if d["status_validade"] == "vence_breve"]
    contratos_ativos = [c for c in contratos_calc if c["vigente"]]
    orc_aguardando = [o for o in orcamentos_calc if o["status"] == "aguardando"]

    return {
        "por_categoria_12m": por_categoria_12m,
        "por_mes": por_mes,
        "totais": {
            "gasto_12m": total_ms([m for m in com_valor if m["_data"] >= inicio_12m]),
            "gasto_ano_atual": total_ms([m for m in com_valor if m["_data"].year == ano_atual]),
            "gasto_total": total_ms(com_valor),
            "n_manutencoes": len(manutencoes),
            "n_manutencoes_12m": sum(1 for m in manutencoes if m["_data"] >= inicio_12m),
            "corretivas_12m": sum(1 for m in manutencoes if m["tipo"] == "corretiva" and m["_data"] >= inicio_12m),
            "atrasadas": len(atrasadas),
            "vencendo_30d": len(vencendo),
            "custo_anual_estimado": custo_anual,
            "n_ativos": len(ativos),
            "n_documentos": len(documentos_calc),
            "docs_vencidos": len(docs_vencidos),
            "docs_vencendo": len(docs_vencendo),
            "contratos_ativos": len(contratos_ativos),
            "contratos_mensal_total": round(sum(c["_valor_mensal"] for c in contratos_ativos), 2),
            "orcamentos_aguardando": len(orc_aguardando),
            "orcamentos_aguardando_total": round(sum(o["_valor"] for o in orc_aguardando), 2),
        },
    }


# ---------------------------------------------------------------------- exportações
def exportar_sqlite(destino: Path, ativos, prestadores, cronograma_calc, manutencoes_calc,
                     documentos_calc, contratos_calc, orcamentos_calc) -> None:
    arq = destino / "dados" / "condominio.sqlite"
    if arq.exists():
        arq.unlink()
    con = sqlite3.connect(arq)
    con.executescript("""
        CREATE TABLE ativos (id TEXT PRIMARY KEY, categoria TEXT, nome TEXT, local TEXT,
                             descricao TEXT, criticidade TEXT);
        CREATE TABLE prestadores (id TEXT PRIMARY KEY, nome TEXT, cnpj TEXT, contato TEXT,
                                  especialidades TEXT, categoria TEXT);
        CREATE TABLE cronograma (id TEXT PRIMARY KEY, ativo_id TEXT, atividade TEXT, tipo TEXT,
                                 periodicidade_meses INTEGER, prestador_id TEXT,
                                 valor_referencia REAL, ultima_execucao TEXT, observacoes TEXT,
                                 valor_estimado REAL, proxima_execucao TEXT, dias_restantes INTEGER,
                                 status TEXT, custo_anual_estimado REAL);
        CREATE TABLE manutencoes (id TEXT PRIMARY KEY, data TEXT, ativo_id TEXT, cronograma_id TEXT,
                                  tipo TEXT, descricao TEXT, prestador_id TEXT, valor REAL,
                                  documento TEXT, orcamento_id TEXT, responsavel TEXT);
        CREATE TABLE documentos (id TEXT PRIMARY KEY, titulo TEXT, categoria TEXT, arquivo TEXT,
                                 tipo TEXT, data_emissao TEXT, validade TEXT, prestador_id TEXT,
                                 art_rrt TEXT, manutencao_id TEXT, visibilidade TEXT,
                                 status_validade TEXT, observacoes TEXT);
        CREATE TABLE contratos (id TEXT PRIMARY KEY, prestador_id TEXT, objeto TEXT, categoria TEXT,
                                inicio TEXT, fim TEXT, valor_mensal REAL, status TEXT,
                                documento TEXT, observacoes TEXT);
        CREATE TABLE orcamentos (id TEXT PRIMARY KEY, data TEXT, descricao TEXT, ativo_id TEXT,
                                 cronograma_id TEXT, prestador_id TEXT, valor REAL, status TEXT,
                                 documento TEXT, observacoes TEXT);
        CREATE INDEX idx_manut_data ON manutencoes (data);
        CREATE INDEX idx_manut_ativo ON manutencoes (ativo_id);
        CREATE INDEX idx_doc_categoria ON documentos (categoria);
    """)
    con.executemany("INSERT INTO ativos VALUES (?,?,?,?,?,?)",
                    [(a["id"], a["categoria"], a["nome"], a["local"], a["descricao"], a["criticidade"]) for a in ativos])
    con.executemany("INSERT INTO prestadores VALUES (?,?,?,?,?,?)",
                    [(p["id"], p["nome"], p["cnpj"], p["contato"], p["especialidades"], p["categoria"]) for p in prestadores])
    con.executemany("INSERT INTO cronograma VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [(c["id"], c["ativo_id"], c["atividade"], c["tipo"], int(c["periodicidade_meses"]),
                      c["prestador_id"] or None, parse_valor(c["valor_referencia"], "sqlite", []),
                      c["ultima_execucao"] or None, c["observacoes"] or None, c["valor_estimado"],
                      c["proxima_execucao"], c["dias_restantes"], c["status"], c["custo_anual_estimado"])
                     for c in cronograma_calc])
    con.executemany("INSERT INTO manutencoes VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [(m["id"], m["data"], m["ativo_id"], m["cronograma_id"] or None, m["tipo"], m["descricao"],
                      m["prestador_id"] or None, parse_valor(m["valor"], f"sqlite {m['id']}", []),
                      m["documento"] or None, m["orcamento_id"] or None, m["responsavel"] or None)
                     for m in manutencoes_calc])
    con.executemany("INSERT INTO documentos VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [(d["id"], d["titulo"], d["categoria"], d["arquivo"], d["tipo"], d["data_emissao"],
                      d["validade"] or None, d["prestador_id"] or None, d["art_rrt"] or None,
                      d["manutencao_id"] or None, d["visibilidade"], d["status_validade"],
                      d["observacoes"] or None)
                     for d in documentos_calc])
    con.executemany("INSERT INTO contratos VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [(c["id"], c["prestador_id"], c["objeto"], c["categoria"], c["inicio"], c["fim"],
                      c["_valor_mensal"], c["status"], c["documento"] or None, c["observacoes"] or None)
                     for c in contratos_calc])
    con.executemany("INSERT INTO orcamentos VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [(o["id"], o["data"], o["descricao"], o["ativo_id"] or None, o["cronograma_id"] or None,
                      o["prestador_id"] or None, o["_valor"], o["status"], o["documento"] or None,
                      o["observacoes"] or None)
                     for o in orcamentos_calc])
    con.commit()
    con.close()


CAMPOS = {
    "ativos": [("id", "string"), ("categoria", "string"), ("nome", "string"), ("local", "string"),
               ("descricao", "string"), ("criticidade", "string")],
    "prestadores": [("id", "string"), ("nome", "string"), ("cnpj", "string"), ("contato", "string"),
                    ("especialidades", "string"), ("categoria", "string")],
    "cronograma": [("id", "string"), ("ativo_id", "string"), ("atividade", "string"), ("tipo", "string"),
                   ("periodicidade_meses", "integer"), ("prestador_id", "string"), ("valor_referencia", "number"),
                   ("ultima_execucao", "date"), ("observacoes", "string")],
    "manutencoes": [("id", "string"), ("data", "date"), ("ativo_id", "string"), ("cronograma_id", "string"),
                    ("tipo", "string"), ("descricao", "string"), ("prestador_id", "string"), ("valor", "number"),
                    ("documento", "string"), ("orcamento_id", "string"), ("responsavel", "string")],
    "documentos": [("id", "string"), ("titulo", "string"), ("categoria", "string"), ("arquivo", "string"),
                   ("tipo", "string"), ("data_emissao", "date"), ("validade", "date"), ("prestador_id", "string"),
                   ("art_rrt", "string"), ("manutencao_id", "string"), ("visibilidade", "string"),
                   ("observacoes", "string")],
    "contratos": [("id", "string"), ("prestador_id", "string"), ("objeto", "string"), ("categoria", "string"),
                  ("inicio", "date"), ("fim", "date"), ("valor_mensal", "number"), ("status", "string"),
                  ("documento", "string"), ("observacoes", "string")],
    "orcamentos": [("id", "string"), ("data", "date"), ("descricao", "string"), ("ativo_id", "string"),
                   ("cronograma_id", "string"), ("prestador_id", "string"), ("valor", "number"),
                   ("status", "string"), ("documento", "string"), ("observacoes", "string")],
}

TITULOS_RECURSOS = {
    "ativos": "Ativos e sistemas do edifício",
    "prestadores": "Prestadores de serviços",
    "cronograma": "Cronograma de manutenção preventiva",
    "manutencoes": "Histórico de manutenções",
    "documentos": "Repositório documental (metadados)",
    "contratos": "Contratos de prestação de serviços",
    "orcamentos": "Orçamentos",
}


def exportar_datapackage(destino: Path, gerado_em: str, perfil: str) -> None:
    pkg = {
        "name": "condominio-dados-abertos",
        "title": f"Dados abertos do {CONDOMINIO}",
        "description": "Manutenção predial, cronograma preventivo, prestadores, documentos, "
                       "contratos e orçamentos do condomínio. " + AVISO,
        "version": gerado_em[:10],
        "gerado_em": gerado_em,
        "perfil": perfil,
        "licenses": [{
            "name": "CC-BY-4.0",
            "title": "Atribuição 4.0 Internacional (CC BY 4.0)",
            "path": "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
        }],
        "conformidade": "O cronograma segue os conceitos da ABNT NBR 5674 (sistema de gestão de manutenção "
                        "de edificações); inspeções conforme NBR 16747; intervenções estruturais e reformas "
                        "conforme NBR 16280.",
        "resources": [
            {
                "name": nome,
                "path": f"dados/{nome}.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "dialect": {"delimiter": ";", "encoding": "utf-8-sig"},
                "title": TITULOS_RECURSOS[nome],
                "schema": {"fields": [{"name": n, "type": t} for n, t in CAMPOS[nome]]},
            }
            for nome in CAMPOS
        ] + [{
            "name": "condominio-sqlite",
            "path": "dados/condominio.sqlite",
            "format": "sqlite",
            "title": "Base completa em SQLite (inclui colunas calculadas)",
            "schema": {"fields": [{"name": n, "type": t} for n, t in CAMPOS["cronograma"]]
                       + [{"name": "valor_estimado", "type": "number"},
                          {"name": "proxima_execucao", "type": "date"},
                          {"name": "dias_restantes", "type": "integer"},
                          {"name": "status", "type": "string"},
                          {"name": "custo_anual_estimado", "type": "number"}]},
        }],
    }
    (destino / "dados" / "datapackage.json").write_text(
        json.dumps(pkg, ensure_ascii=False, indent=2), encoding="utf-8")


def exportar_csv(destino: Path, nome: str, linhas: list[dict]) -> None:
    """Grava a cópia CSV do conjunto (já filtrada pelo perfil quando aplicável)."""
    campos = [c for c, _ in CAMPOS[nome]]
    arq = destino / "dados" / f"{nome}.csv"
    with open(arq, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=campos, delimiter=";", extrasaction="ignore")
        w.writeheader()
        for linha in linhas:
            w.writerow({c: linha.get(c, "") for c in campos})


# --------------------------------------------------------------------------- main
ATIVOS: list[dict] = []  # usada pelas funções de derivados (ver calcular_contratos)


def main() -> None:
    global ATIVOS
    parser = argparse.ArgumentParser(description="Gera os artefatos de dados do portal.")
    parser.add_argument("--destino", default="public", help="pasta de saída (padrão: public)")
    parser.add_argument("--perfil", choices=["publico", "completo"], default="publico",
                        help="publico exclui itens administrativos; completo mantém tudo (padrão: publico)")
    args = parser.parse_args()
    destino = RAIZ / args.destino
    perfil = args.perfil
    hoje = date.today()
    gerado_em = datetime.now().astimezone().isoformat(timespec="seconds")

    print(f"Lendo CSVs de {DIR_DADOS} …")
    ativos = ler_csv("ativos.csv")
    prestadores = ler_csv("prestadores.csv")
    cronograma = ler_csv("cronograma.csv")
    manutencoes = ler_csv("manutencoes.csv")
    documentos = ler_csv("documentos.csv")
    contratos = ler_csv("contratos.csv")
    orcamentos = ler_csv("orcamentos.csv")
    ATIVOS = ativos

    # pré-parse dos campos calculáveis
    for m in manutencoes:
        m["_data"] = parse_data(m["data"], f"manutenção {m['id']}", []) or date(1970, 1, 1)
        m["_valor"] = parse_valor(m["valor"], f"manutenção {m['id']}", [])
    for ct in contratos:
        ct["_valor_mensal"] = parse_valor(ct["valor_mensal"], f"contrato {ct['id']}", [])
    for o in orcamentos:
        o["_valor"] = parse_valor(o["valor"], f"orçamento {o['id']}", [])

    erros, avisos = validar(hoje, ativos, prestadores, cronograma, manutencoes,
                            documentos, contratos, orcamentos)
    if erros:
        print("\nFalha na validação dos dados:", file=sys.stderr)
        for e in erros:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)
    for a in avisos:
        print(f"AVISO: {a}")

    cronograma_calc = calcular_cronograma(hoje, ativos, prestadores, cronograma, manutencoes)
    manutencoes_calc = []
    ativo_por_id = {a["id"]: a for a in ativos}
    prest_por_id = {p["id"]: p for p in prestadores}
    for m in sorted(manutencoes, key=lambda m: m["_data"], reverse=True):
        manutencoes_calc.append({
            **{k: v for k, v in m.items() if not k.startswith("_")},
            "data": m["_data"].isoformat(),
            "categoria": ativo_por_id.get(m["ativo_id"], {}).get("categoria", "?"),
            "ativo_nome": ativo_por_id.get(m["ativo_id"], {}).get("nome", "?"),
            "prestador_nome": prest_por_id.get(m["prestador_id"], {}).get("nome") if m["prestador_id"] else None,
        })
    documentos_calc = calcular_documentos(hoje, documentos, prestadores, manutencoes)
    contratos_calc, _ = calcular_contratos(hoje, contratos, prestadores, manutencoes)
    orcamentos_calc = calcular_orcamentos(orcamentos, prestadores, cronograma_calc)

    # ---- filtro de perfil: o build público não recebe nada administrativo ----
    arquivos_admin = {d["arquivo"] for d in documentos_calc if d["administrativo"]}
    if perfil == "publico":
        documentos_calc = [d for d in documentos_calc if not d["administrativo"]]
        for m in manutencoes_calc:
            if m["documento"] in arquivos_admin:
                m["documento"] = ""
        for o in orcamentos_calc:
            if o["documento"] in arquivos_admin:
                o["documento"] = ""
        for c in contratos_calc:
            if c["documento"] in arquivos_admin:
                c["documento"] = ""

    agregacoes = agregar(hoje, manutencoes, cronograma_calc, ativos, documentos_calc,
                         contratos_calc, orcamentos_calc)

    manutencoes_limpo = [{k: v for k, v in m.items() if not k.startswith("_")} for m in manutencoes_calc]
    contratos_limpo = [{k: v for k, v in c.items() if not k.startswith("_")} for c in contratos_calc]
    orcamentos_limpo = [{k: v for k, v in o.items() if not k.startswith("_")} for o in orcamentos_calc]
    dados = {
        "gerado_em": gerado_em,
        "hoje": hoje.isoformat(),
        "perfil": perfil,
        "condominio": {"nome": CONDOMINIO, "aviso": AVISO},
        "categorias": CATEGORIAS,
        "ativos": ativos,
        "prestadores": prestadores,
        "cronograma": cronograma_calc,
        "manutencoes": manutencoes_limpo,
        "documentos": documentos_calc,
        "contratos": contratos_limpo,
        "orcamentos": orcamentos_limpo,
        "agregacoes": agregacoes,
    }

    destino.mkdir(parents=True, exist_ok=True)
    (destino / "dados").mkdir(exist_ok=True)

    (destino / "data.js").write_text(
        "window.__DATA__ = " + json.dumps(dados, ensure_ascii=False) + ";\n", encoding="utf-8")

    # cópias CSV/JSON por conjunto (documentos já filtrado pelo perfil)
    fontes = {
        "ativos": ativos, "prestadores": prestadores, "cronograma": cronograma_calc,
        "manutencoes": manutencoes_limpo, "documentos": documentos_calc,
        "contratos": contratos_limpo, "orcamentos": orcamentos_limpo,
    }
    for nome, linhas in fontes.items():
        exportar_csv(destino, nome, linhas)
        (destino / "dados" / f"{nome}.json").write_text(
            json.dumps(linhas, ensure_ascii=False, indent=2), encoding="utf-8")

    exportar_sqlite(destino, ativos, prestadores, cronograma_calc, manutencoes_calc,
                    documentos_calc, contratos_calc, orcamentos_calc)
    exportar_datapackage(destino, gerado_em, perfil)

    # documentos: no perfil público, arquivos administrativos não são copiados
    docs_destino = destino / "documentos"
    if docs_destino.exists():
        shutil.rmtree(docs_destino)
    if DIR_DOCS.exists():
        shutil.copytree(DIR_DOCS, docs_destino,
                        ignore=shutil.ignore_patterns(*[
                            Path(a).name for a in arquivos_admin
                        ]) if perfil == "publico" and arquivos_admin else None)

    t = agregacoes["totais"]
    print(f"\nOK — artefatos gerados em {destino.relative_to(RAIZ)}/ (perfil: {perfil})")
    print(f"  ativos: {t['n_ativos']} | cronograma: {len(cronograma_calc)} itens | "
          f"manutenções: {t['n_manutencoes']} | documentos: {t['n_documentos']} "
          f"({t['docs_vencidos']} vencidos, {t['docs_vencendo']} vencendo)")
    print(f"  contratos ativos: {t['contratos_ativos']} ({moeda_brl(t['contratos_mensal_total'])}/mês) | "
          f"orçamentos aguardando: {t['orcamentos_aguardando']}")
    print(f"  gasto 12 meses: {moeda_brl(t['gasto_12m'])} | atrasadas: {t['atrasadas']} | "
          f"vencendo em <= {DIAS_VENCE_BREVE}d: {t['vencendo_30d']}")
    for c in cronograma_calc:
        if c["status"] == "atrasado":
            print(f"  ATRASADO: {c['id']} — {c['atividade']} (vencia {c['proxima_execucao']})")


def moeda_brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


if __name__ == "__main__":
    main()
