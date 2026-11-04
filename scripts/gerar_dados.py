#!/usr/bin/env python3
"""Gera os artefatos de dados do portal a partir dos CSVs em dados/.

Saída (em public/ por padrão, ou no caminho passado em --destino):
  data.js                     -> dados embutidos consumidos pelo site em runtime
  dados/*.csv|*.json          -> cópias abertas dos conjuntos (download)
  dados/condominio.sqlite     -> banco SQLite para quem quer consultas SQL
  dados/datapackage.json      -> metadados no estilo Frictionless/CKAN
  documentos/**               -> PDFs organizados por categoria

Uso: python3 scripts/gerar_dados.py [--destino public]
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
DIAS_VENCE_BREVE = 30

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
def validar(ativos, prestadores, cronograma, manutencoes) -> list[str]:
    erros: list[str] = []
    ids_ativos = {a["id"] for a in ativos}
    ids_prestadores = {p["id"] for p in prestadores}

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

    ids_cronograma = set()
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

    ids_manutencoes = set()
    for i, m in enumerate(manutencoes, start=2):
        ctx = f"manutencoes.csv linha {i} ({m['id'] or 'sem id'})"
        if not m["id"]:
            erros.append(f"{ctx}: id vazio")
            continue
        if m["id"] in ids_manutencoes:
            erros.append(f"{ctx}: id duplicado")
        ids_manutencoes.add(m["id"])
        if parse_data(m["data"], ctx, erros) is None:
            pass  # erro já registrado
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
    return erros


# --------------------------------------------------------------------- derivados
def calcular(hoje: date, ativos, prestadores, cronograma, manutencoes):
    ativo_por_id = {a["id"]: a for a in ativos}
    prest_por_id = {p["id"]: p for p in prestadores}
    execs_por_crono: dict[str, list[dict]] = {}
    for m in manutencoes:
        if m["cronograma_id"]:
            execs_por_crono.setdefault(m["cronograma_id"], []).append(m)

    cronograma_calc = []
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

        cronograma_calc.append({
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

    manutencoes_calc = []
    for m in sorted(manutencoes, key=lambda m: m["_data"], reverse=True):
        ativo = ativo_por_id.get(m["ativo_id"], {})
        manutencoes_calc.append({
            **m,
            "data": m["_data"].isoformat(),
            "categoria": ativo.get("categoria", "?"),
            "ativo_nome": ativo.get("nome", "?"),
            "prestador_nome": prest_por_id.get(m["prestador_id"], {}).get("nome") if m["prestador_id"] else None,
        })

    return cronograma_calc, manutencoes_calc


def agregar(hoje: date, manutencoes, cronograma_calc, ativos):
    ano_atual = hoje.year
    inicio_12m = add_meses(hoje, -11)
    inicio_12m = date(inicio_12m.year, inicio_12m.month, 1)

    com_valor = [m for m in manutencoes if m["_valor"] is not None]

    def total_ms(ms):
        return round(sum(m["_valor"] for m in ms), 2)

    por_categoria_12m = [
        {"categoria": cat, "total": total_ms([m for m in com_valor if m["categoria"] == cat and m["_data"] >= inicio_12m])}
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
            "n_documentos": sum(1 for _ in DIR_DOCS.rglob("*.pdf")) if DIR_DOCS.exists() else 0,
        },
    }


def escanear_documentos() -> list[dict]:
    docs = []
    if not DIR_DOCS.exists():
        return docs
    for cat in CATEGORIAS:
        pasta = DIR_DOCS / cat
        if not pasta.exists():
            continue
        for arq in sorted(pasta.glob("*.pdf")):
            docs.append({
                "categoria": cat,
                "titulo": arq.stem.replace("-", " ").replace("_", " ").strip(),
                "arquivo": f"documentos/{cat}/{arq.name}",
                "tamanho": arq.stat().st_size,
            })
    return docs


# ---------------------------------------------------------------------- exportações
def exportar_sqlite(destino: Path, ativos, prestadores, cronograma_calc, manutencoes_calc) -> None:
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
                                  documento TEXT, responsavel TEXT);
        CREATE INDEX idx_manut_data ON manutencoes (data);
        CREATE INDEX idx_manut_ativo ON manutencoes (ativo_id);
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
    con.executemany("INSERT INTO manutencoes VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [(m["id"], m["data"], m["ativo_id"], m["cronograma_id"] or None, m["tipo"], m["descricao"],
                      m["prestador_id"] or None, m["_valor"], m["documento"] or None, m["responsavel"] or None)
                     for m in manutencoes_calc])
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
                    ("documento", "string"), ("responsavel", "string")],
}


def exportar_datapackage(destino: Path, gerado_em: str) -> None:
    pkg = {
        "name": "condominio-dados-abertos",
        "title": f"Dados abertos do {CONDOMINIO}",
        "description": "Manutenção predial, cronograma preventivo, prestadores e documentos do condomínio. "
                       + AVISO,
        "version": gerado_em[:10],
        "gerado_em": gerado_em,
        "licenses": [{
            "name": "CC-BY-4.0",
            "title": "Atribuição 4.0 Internacional (CC BY 4.0)",
            "path": "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
        }],
        "conformidade": "O cronograma segue os conceitos da ABNT NBR 5674 (sistema de gestão de manutenção "
                        "de edificações) e as inspeções, a NBR 16747.",
        "resources": [
            {
                "name": nome,
                "path": f"dados/{nome}.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "dialect": {"delimiter": ";", "encoding": "utf-8-sig"},
                "title": {"ativos": "Ativos e sistemas do edifício", "prestadores": "Prestadores de serviços",
                          "cronograma": "Cronograma de manutenção preventiva",
                          "manutencoes": "Histórico de manutenções"}[nome],
                "schema": {"fields": [{"name": n, "type": t} for n, t in CAMPOS[nome]]},
            }
            for nome in CAMPOS
        ] + [{
            "name": "condominio-sqlite",
            "path": "dados/condominio.sqlite",
            "format": "sqlite",
            "title": "Base completa em SQLite (inclui colunas calculadas do cronograma)",
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


# --------------------------------------------------------------------------- main
def main() -> None:
    parser = argparse.ArgumentParser(description="Gera os artefatos de dados do portal.")
    parser.add_argument("--destino", default="public", help="pasta de saída (padrão: public)")
    args = parser.parse_args()
    destino = RAIZ / args.destino
    hoje = date.today()
    gerado_em = datetime.now().astimezone().isoformat(timespec="seconds")

    print(f"Lendo CSVs de {DIR_DADOS} …")
    ativos = ler_csv("ativos.csv")
    prestadores = ler_csv("prestadores.csv")
    cronograma = ler_csv("cronograma.csv")
    manutencoes = ler_csv("manutencoes.csv")

    # pré-parse dos campos calculáveis
    for m in manutencoes:
        m["_data"] = parse_data(m["data"], f"manutenção {m['id']}", []) or date(1970, 1, 1)
        m["_valor"] = parse_valor(m["valor"], f"manutenção {m['id']}", [])

    erros = validar(ativos, prestadores, cronograma, manutencoes)
    if erros:
        print("\nFalha na validação dos dados:", file=sys.stderr)
        for e in erros:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    cronograma_calc, manutencoes_calc = calcular(hoje, ativos, prestadores, cronograma, manutencoes)
    agregacoes = agregar(hoje, manutencoes_calc, cronograma_calc, ativos)
    documentos = escanear_documentos()

    manutencoes_limpo = [{k: v for k, v in m.items() if not k.startswith("_")} for m in manutencoes_calc]
    dados = {
        "gerado_em": gerado_em,
        "hoje": hoje.isoformat(),
        "condominio": {"nome": CONDOMINIO, "aviso": AVISO},
        "categorias": CATEGORIAS,
        "ativos": ativos,
        "prestadores": prestadores,
        "cronograma": cronograma_calc,
        "manutencoes": manutencoes_limpo,
        "documentos": documentos,
        "agregacoes": agregacoes,
    }

    destino.mkdir(parents=True, exist_ok=True)
    (destino / "dados").mkdir(exist_ok=True)

    (destino / "data.js").write_text(
        "window.__DATA__ = " + json.dumps(dados, ensure_ascii=False) + ";\n", encoding="utf-8")

    for nome in CAMPOS:
        shutil.copy2(DIR_DADOS / f"{nome}.csv", destino / "dados" / f"{nome}.csv")
        linhas = {"ativos": ativos, "prestadores": prestadores,
                  "cronograma": cronograma_calc, "manutencoes": manutencoes_limpo}[nome]
        (destino / "dados" / f"{nome}.json").write_text(
            json.dumps(linhas, ensure_ascii=False, indent=2), encoding="utf-8")

    exportar_sqlite(destino, ativos, prestadores, cronograma_calc, manutencoes_calc)
    exportar_datapackage(destino, gerado_em)

    docs_destino = destino / "documentos"
    if docs_destino.exists():
        shutil.rmtree(docs_destino)
    if DIR_DOCS.exists():
        shutil.copytree(DIR_DOCS, docs_destino)

    t = agregacoes["totais"]
    print(f"\nOK — artefatos gerados em {destino.relative_to(RAIZ)}/")
    print(f"  ativos: {t['n_ativos']} | cronograma: {len(cronograma_calc)} itens | "
          f"manutenções: {t['n_manutencoes']} | documentos: {t['n_documentos']}")
    print(f"  gasto 12 meses: R$ {t['gasto_12m']:,.2f} | atrasadas: {t['atrasadas']} | "
          f"vencendo em <= {DIAS_VENCE_BREVE}d: {t['vencendo_30d']}")
    for c in cronograma_calc:
        if c["status"] == "atrasado":
            print(f"  ATRASADO: {c['id']} — {c['atividade']} (vencia {c['proxima_execucao']})")


if __name__ == "__main__":
    main()
