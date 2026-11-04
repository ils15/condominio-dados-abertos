#!/usr/bin/env python3
"""Alerta semanal por e-mail para a síndica: o que vence e o que está atrasado.

Lê o data.js gerado (perfil público) e envia, via SMTP, um resumo com:
manutenções atrasadas/vencendo, documentos com validade vencida/vencendo,
contratos vigentes chegando ao fim e orçamentos aguardando aprovação.

Configuração por variáveis de ambiente (no GitHub: Settings → Secrets → Actions):
  ALERTA_SMTP_HOST, ALERTA_SMTP_PORT (587=STARTTLS, 465=SSL),
  ALERTA_SMTP_USER, ALERTA_SMTP_PASS, ALERTA_EMAIL_DE, ALERTA_EMAIL_PARA
Sem as variáveis, o script apenas imprime o resumo (útil para teste local).
"""
from __future__ import annotations

import json
import os
import smtplib
import sys
from datetime import date
from email.mime.text import MIMEText
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def carregar(caminho: Path) -> dict:
    txt = caminho.read_text(encoding="utf-8")
    return json.loads(txt.removeprefix("window.__DATA__ = ").rstrip().rstrip(";"))


def fmt(iso: str | None) -> str:
    if not iso:
        return "—"
    a, m, d = iso.split("-")
    return f"{d}/{m}/{a}"


def moeda(v: float | None) -> str:
    if v is None:
        return "—"
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def parse_valor(v) -> float | None:
    if v in (None, ""):
        return None
    s = str(v).replace("R$", "").strip().replace(" ", "")
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def montar_secoes(d: dict) -> list[tuple[str, list[str]]]:
    hoje = date.fromisoformat(d["hoje"])
    out: list[tuple[str, list[str]]] = []

    atrasadas = [c for c in d["cronograma"] if c["status"] == "atrasado"]
    if atrasadas:
        linhas = [f"{c['atividade']} — {c['ativo_nome']} · vencia {fmt(c['proxima_execucao'])} · "
                  f"estimativa {moeda(c['valor_estimado'])}" for c in atrasadas]
        out.append(("Manutenções atrasadas", linhas))

    vencendo = [c for c in d["cronograma"] if c["status"] == "vence_breve"]
    if vencendo:
        linhas = [f"{c['atividade']} — {c['ativo_nome']} · próxima {fmt(c['proxima_execucao'])} · "
                  f"estimativa {moeda(c['valor_estimado'])}" for c in vencendo]
        out.append(("Manutenções vencendo nos próximos 30 dias", linhas))

    docs = [x for x in d["documentos"] if x["status_validade"] in ("vencido", "vence_breve")]
    if docs:
        linhas = [f"{x['titulo']} · validade {fmt(x['validade'])} ({'VENCIDO' if x['status_validade']=='vencido' else 'vence em breve'})"
                  for x in docs]
        out.append(("Documentos com validade crítica", linhas))

    contratos = [c for c in d["contratos"] if c["vigente"] and c["dias_para_fim"] is not None and c["dias_para_fim"] <= 90]
    if contratos:
        linhas = [f"{c['objeto']} — {c['prestador_nome']} · termina {fmt(c['fim'])} (renovar/negociar)"
                  for c in contratos]
        out.append(("Contratos terminando em até 90 dias", linhas))

    orc = [o for o in d["orcamentos"] if o["status"] == "aguardando"]
    if orc:
        linhas = [f"{o['descricao']} · {o['prestador_nome'] or 'sem cadastro'} · {moeda(parse_valor(o['valor']))}" for o in orc]
        out.append(("Orçamentos aguardando decisão", linhas))

    proxima = d["agregacoes"]["totais"].get("proxima_assembleia")
    if proxima:
        out.append(("Assembleias", [f"Próxima assembleia agendada para {fmt(proxima)} — confira convocação e pauta."]))

    _ = hoje  # reservado para filtros futuros por data
    return out


def montar_html(nome_cond: str, secoes: list[tuple[str, list[str]]]) -> str:
    partes = [
        "<html><body style='font-family:Segoe UI,Arial,sans-serif;color:#27272a;max-width:640px'>",
        f"<h2 style='color:#2563eb;margin-bottom:4px'>{nome_cond} — alerta semanal</h2>",
        "<p style='color:#71717a;font-size:13px'>Resumo do portal de dados abertos: o que precisa de atenção.</p>",
    ]
    if not secoes:
        partes.append("<p style='background:#ecfdf5;padding:12px;border-radius:8px'>"
                      "✅ Nada vencendo, nada atrasado. Sem ações necessárias esta semana.</p>")
    for titulo, linhas in secoes:
        partes.append(f"<h3 style='font-size:14px;margin:18px 0 6px'>{titulo}</h3><ul style='margin:0;padding-left:18px;font-size:13px'>")
        partes.extend(f"<li style='margin:4px 0'>{l}</li>" for l in linhas)
        partes.append("</ul>")
    partes.append("<p style='color:#a1a1aa;font-size:11px;margin-top:24px'>"
                  "E-mail automático gerado pelo portal de dados abertos do condomínio.</p></body></html>")
    return "".join(partes)


def main() -> None:
    caminho = RAIZ / "public" / "data.js"
    if not caminho.exists():
        print("ERRO: rode scripts/gerar_dados.py antes (public/data.js ausente).", file=sys.stderr)
        sys.exit(1)
    d = carregar(caminho)
    secoes = montar_secoes(d)
    nome = d["condominio"]["nome"]
    html = montar_html(nome, secoes)

    host = os.environ.get("ALERTA_SMTP_HOST")
    user = os.environ.get("ALERTA_SMTP_USER")
    senha = os.environ.get("ALERTA_SMTP_PASS")
    para = os.environ.get("ALERTA_EMAIL_PARA")
    de = os.environ.get("ALERTA_EMAIL_DE", user)

    print(f"Resumo do alerta ({len(secoes)} seções):")
    for titulo, linhas in secoes:
        print(f"  • {titulo}: {len(linhas)}")
    if not (host and user and senha and para):
        print("\nSMTP não configurado (ALERTA_* ausentes) — e-mail não enviado; isto é só um teste."
              " Configure os secrets no GitHub para o envio automático.")
        return

    porta = int(os.environ.get("ALERTA_SMTP_PORT", "587"))
    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = f"[{nome}] Alerta semanal — {date.today().strftime('%d/%m/%Y')}"
    msg["From"] = de
    msg["To"] = para

    if porta == 465:
        smtp = smtplib.SMTP_SSL(host, porta, timeout=30)
    else:
        smtp = smtplib.SMTP(host, porta, timeout=30)
        smtp.starttls()
    with smtp:
        smtp.login(user, senha)
        smtp.sendmail(de, [para], msg.as_string())
    print(f"\nAlerta enviado para {para} ✓")


if __name__ == "__main__":
    main()
