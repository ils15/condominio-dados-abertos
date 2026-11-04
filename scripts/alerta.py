#!/usr/bin/env python3
"""Informes do condomínio — alerta semanal multicanal (e-mail + WhatsApp).

Lê o data.js gerado (perfil público) e envia um resumo com o que precisa de
atenção: manutenções atrasadas/vencendo, validades críticas, contratos
terminando, orçamentos pendentes e próxima assembleia.

Canais (independentes — configure um, outro ou ambos):
  E-MAIL    via SMTP:      ALERTA_SMTP_HOST, ALERTA_SMTP_PORT (587/465),
                           ALERTA_SMTP_USER, ALERTA_SMTP_PASS,
                           ALERTA_EMAIL_DE, ALERTA_EMAIL_PARA
  WHATSAPP  via CallMeBot: ALERTA_WHATS_PHONE (+55DDN...), ALERTA_WHATS_APIKEY
                           (gere em https://callmebot.com/start.php — grátis,
                            envia para UM número, ideal p/ a síndica)

Sem nenhum canal configurado, imprime o resumo (modo teste) e sai sem erro.
"""
from __future__ import annotations

import json
import os
import smtplib
import sys
import urllib.parse
import urllib.request
from datetime import date
from email.mime.text import MIMEText
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
URL_PORTAL = os.environ.get("SITE_URL", "https://ils15.github.io/condominio-dados-abertos/")


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
    secoes: list[tuple[str, list[str]]] = []

    atrasadas = [c for c in d["cronograma"] if c["status"] == "atrasado"]
    if atrasadas:
        secoes.append(("Manutenções atrasadas", [
            f"{c['atividade']} — {c['ativo_nome']} · vencia {fmt(c['proxima_execucao'])} · "
            f"estimativa {moeda(c['valor_estimado'])}" for c in atrasadas]))

    vencendo = [c for c in d["cronograma"] if c["status"] == "vence_breve"]
    if vencendo:
        secoes.append(("Vencendo nos próximos 30 dias", [
            f"{c['atividade']} — {c['ativo_nome']} · {fmt(c['proxima_execucao'])} · "
            f"{moeda(c['valor_estimado'])}" for c in vencendo]))

    docs = [x for x in d["documentos"] if x["status_validade"] in ("vencido", "vence_breve")]
    if docs:
        secoes.append(("Documentos com validade crítica", [
            f"{x['titulo']} · validade {fmt(x['validade'])}"
            f"{' ⚠ VENCIDO' if x['status_validade'] == 'vencido' else ''}" for x in docs]))

    contratos = [c for c in d["contratos"] if c["vigente"] and c.get("dias_para_fim") is not None
                 and c["dias_para_fim"] <= 90]
    if contratos:
        secoes.append(("Contratos terminando em até 90 dias", [
            f"{c['objeto']} — {c['prestador_nome']} · termina {fmt(c['fim'])}" for c in contratos]))

    orc = [o for o in d["orcamentos"] if o["status"] == "aguardando"]
    if orc:
        secoes.append(("Orçamentos aguardando decisão", [
            f"{o['descricao']} · {o['prestador_nome'] or 'sem cadastro'} · "
            f"{moeda(parse_valor(o['valor']))}" for o in orc]))

    proxima = d["agregacoes"]["totais"].get("proxima_assembleia")
    if proxima:
        secoes.append(("Assembleias", [f"Próxima assembleia: {fmt(proxima)} — veja convocação e pauta no portal."]))

    return secoes


# ---------------------------------------------------------------------------- e-mail
def montar_html(nome_cond: str, secoes: list[tuple[str, list[str]]]) -> str:
    partes = [
        "<html><body style='font-family:Segoe UI,Arial,sans-serif;color:#27272a;max-width:640px'>",
        f"<h2 style='color:#2563eb;margin-bottom:4px'>{nome_cond} — informe semanal</h2>",
        f"<p style='color:#71717a;font-size:13px'>Resumo do portal de dados abertos · "
        f"<a href='{URL_PORTAL}'>abrir o portal</a></p>",
    ]
    if not secoes:
        partes.append("<p style='background:#ecfdf5;padding:12px;border-radius:8px'>"
                      "✅ Nada vencendo, nada atrasado. Sem ações necessárias esta semana.</p>")
    for titulo, linhas in secoes:
        partes.append(f"<h3 style='font-size:14px;margin:18px 0 6px'>{titulo} ({len(linhas)})</h3>"
                      "<ul style='margin:0;padding-left:18px;font-size:13px'>")
        partes.extend(f"<li style='margin:4px 0'>{l}</li>" for l in linhas)
        partes.append("</ul>")
    partes.append("<p style='color:#a1a1aa;font-size:11px;margin-top:24px'>"
                  "Informe automático do portal de dados abertos do condomínio.</p></body></html>")
    return "".join(partes)


def enviar_email(nome_cond: str, secoes: list[tuple[str, list[str]]]) -> bool:
    host = os.environ.get("ALERTA_SMTP_HOST")
    user = os.environ.get("ALERTA_SMTP_USER")
    senha = os.environ.get("ALERTA_SMTP_PASS")
    para = os.environ.get("ALERTA_EMAIL_PARA")
    de = os.environ.get("ALERTA_EMAIL_DE", user)
    if not (host and user and senha and para):
        return False
    porta = int(os.environ.get("ALERTA_SMTP_PORT", "587"))
    msg = MIMEText(montar_html(nome_cond, secoes), "html", "utf-8")
    msg["Subject"] = f"[{nome_cond}] Informe semanal — {date.today().strftime('%d/%m/%Y')}"
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
    print(f"  ✓ e-mail enviado para {para}")
    return True


# ----------------------------------------------------------------------------- WhatsApp
def montar_texto_whats(nome_cond: str, secoes: list[tuple[str, list[str]]]) -> str:
    """CallMeBot limita ~3 msgs de ~900 chars; resumo compacto com contagens + top itens."""
    if not secoes:
        return (f"🏠 *{nome_cond}* — informe semanal\n\n✅ Nada vencendo, nada atrasado!\n"
                f"Portal: {URL_PORTAL}")
    icones = {"Manutenções atrasadas": "🔴", "Vencendo nos próximos 30 dias": "🟡",
              "Documentos com validade crítica": "📄", "Contratos terminando em até 90 dias": "📋",
              "Orçamentos aguardando decisão": "💰", "Assembleias": "🗳️"}
    linhas = [f"🏠 *{nome_cond}* — informe semanal", ""]
    for titulo, itens in secoes:
        icone = icones.get(titulo, "•")
        principal = itens[0]
        if len(principal) > 80:
            principal = principal[:77] + "…"
        extra = f" (+{len(itens) - 1})" if len(itens) > 1 else ""
        linhas.append(f"{icone} *{titulo}* ({len(itens)})")
        linhas.append(f"   {principal}{extra}")
    linhas += ["", f"Detalhes: {URL_PORTAL}"]
    return "\n".join(linhas)


def enviar_whatsapp(nome_cond: str, secoes: list[tuple[str, list[str]]]) -> bool:
    fone = os.environ.get("ALERTA_WHATS_PHONE")
    apikey = os.environ.get("ALERTA_WHATS_APIKEY")
    if not (fone and apikey):
        return False
    texto = montar_texto_whats(nome_cond, secoes)
    url = ("https://api.callmebot.com/whatsapp.php?"
           + urllib.parse.urlencode({"phone": fone, "apikey": apikey, "text": texto}))
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            ok = resp.status == 200
    except Exception as exc:  # noqa: BLE001 — rede é opcional no modo teste
        print(f"  ✗ WhatsApp falhou: {exc}")
        return True  # tentou; não configura não é problema do script
    if ok:
        print(f"  ✓ WhatsApp enviado para {fone}")
    return True


def main() -> None:
    caminho = RAIZ / "public" / "data.js"
    if not caminho.exists():
        print("ERRO: rode scripts/gerar_dados.py antes (public/data.js ausente).", file=sys.stderr)
        sys.exit(1)
    d = carregar(caminho)
    secoes = montar_secoes(d)
    nome = d["condominio"]["nome"]

    print(f"Resumo do informe ({len(secoes)} seções):")
    for titulo, linhas in secoes:
        print(f"  • {titulo}: {len(linhas)}")

    enviou = enviar_email(nome, secoes)
    enviou = enviar_whatsapp(nome, secoes) or enviou
    if not enviou:
        print("\nNenhum canal configurado (ALERTA_* ausentes) — modo teste, nada enviado.\n"
              "E-mail: ALERTA_SMTP_HOST/PORT/USER/PASS + ALERTA_EMAIL_DE/PARA\n"
              "WhatsApp: ALERTA_WHATS_PHONE + ALERTA_WHATS_APIKEY (callmebot.com/start.php)")


if __name__ == "__main__":
    main()
