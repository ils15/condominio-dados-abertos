#!/usr/bin/env python3
"""Cria PDFs mínimos de demonstração em documentos/ (roda uma vez só; os PDFs são commitados no repo).

Cada arquivo é um PDF válido de 1 página com título e algumas linhas — serve para os
links de documentos do portal funcionarem de verdade. Substitua pelos PDFs reais do
condomínio conforme forem sendo digitalizados.
"""
from pathlib import Path
import struct
import zlib

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / "documentos"

NOTA_RODAPE = "Documento de demonstração do portal de dados abertos — dados fictícios."


def criar_png(caminho: Path, largura: int, altura: int, rgb: tuple[int, int, int]) -> None:
    """Gera um PNG sólido (truecolor 8 bits) sem dependências — placeholder de foto."""

    def chunk(tipo: bytes, dados: bytes) -> bytes:
        return (struct.pack(">I", len(dados)) + tipo + dados
                + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", largura, altura, 8, 2, 0, 0, 0)
    linha = b"\x00" + bytes(rgb) * largura
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(linha * altura)) + chunk(b"IEND", b""))
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(png)
    print(f"  criado: {caminho.relative_to(RAIZ)}")


def _esc(texto: str) -> str:
    return texto.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def criar_pdf(caminho: Path, titulo: str, linhas: list[str]) -> None:
    """Monta um PDF 1.4 mínimo (uma página A4) com texto em Helvetica."""
    comandos = [f"BT /F2 15 Tf 56 780 Td ({_esc(titulo)}) Tj ET"]
    y = 748
    for linha in linhas:
        comandos.append(f"BT /F1 11 Tf 56 {y} Td ({_esc(linha)}) Tj ET")
        y -= 20
    y -= 12
    comandos.append(f"BT /F1 9 Tf 56 {y} Td ({_esc(NOTA_RODAPE)}) Tj ET")
    stream = "\n".join(comandos).encode("cp1252", errors="replace")

    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    saida = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, corpo in enumerate(objs, start=1):
        offsets.append(len(saida))
        saida += f"{i} 0 obj\n".encode() + corpo + b"\nendobj\n"
    inicio_xref = len(saida)
    saida += f"xref\n0 {len(objs) + 1}\n".encode()
    saida += b"0000000000 65535 f \n"
    for off in offsets:
        saida += f"{off:010d} 00000 n \n".encode()
    saida += (
        f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{inicio_xref}\n%%EOF\n"
    ).encode()
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(bytes(saida))
    print(f"  criado: {caminho.relative_to(RAIZ)}")


PDFS = [
    ("mecanica/2026-02-relatorio-elevador-social.pdf", "Relatório de Manutenção Preventiva — Elevador Social",
     ["Edifício Exemplo — dados fictícios", "Data: 05/02/2026", "Prestador: Manutenção de Elevadores Exemplo Ltda",
      "Serviço: manutenção preventiva mensal (15 itens do fabricante)", "Valor: R$ 1.180,00", "Responsável: Síndico"]),
    ("mecanica/2026-10-relatorio-elevador-social.pdf", "Relatório de Manutenção Preventiva — Elevador Social",
     ["Edifício Exemplo — dados fictícios", "Data: 08/10/2026", "Prestador: Manutenção de Elevadores Exemplo Ltda",
      "Serviço: manutenção preventiva mensal (15 itens do fabricante)", "Valor: R$ 1.180,00", "Responsável: Síndico"]),
    ("mecanica/2026-08-reparo-portao.pdf", "Ordem de Serviço — Reparo do Portão da Garagem",
     ["Edifício Exemplo — dados fictícios", "Data: 19/08/2026", "Serviço: reparo do motor do portão automático",
      "Valor: R$ 1.450,00", "Responsável: Zelador"]),
    ("hidraulica/2024-07-troca-motor-bomba-2.pdf", "Nota Fiscal — Troca do Motor da Bomba 2",
     ["Edifício Exemplo — dados fictícios", "Data: 16/07/2024", "Prestador: Hidro Bombas Serviços ME",
      "Serviço: troca do motor (queima do enrolamento)", "Valor: R$ 3.800,00", "Responsável: Síndico"]),
    ("hidraulica/2025-02-reparo-vazamento.pdf", "Ordem de Serviço — Reparo de Vazamento na Rede de Entrada",
     ["Edifício Exemplo — dados fictícios", "Data: 11/02/2025", "Prestador: Hidro Bombas Serviços ME",
      "Serviço: reparo de vazamento na rede de entrada de água", "Valor: R$ 2.200,00", "Responsável: Síndico"]),
    ("hidraulica/2026-08-limpeza-caixa-agua.pdf", "Certificado de Limpeza — Caixa d'Água Superior",
     ["Edifício Exemplo — dados fictícios", "Data: 01/08/2026", "Prestador: Hidro Bombas Serviços ME",
      "Serviço: limpeza e desinfecção do reservatório de 10.000 L", "Valor: R$ 700,00", "Responsável: Síndico"]),
    ("eletrica/2026-09-termografia-qgi.pdf", "Relatório Termográfico — Quadro Geral de Energia",
     ["Edifício Exemplo — dados fictícios", "Data: 03/09/2026", "Prestador: Elétrica Condor Ltda",
      "Serviço: termografia e reaperto do QGI", "Valor: R$ 1.800,00", "Responsável: Síndico"]),
    ("estrutural/2024-10-vistoria-fachada.pdf", "Laudo de Vistoria — Fachada e Esquadrias",
     ["Edifício Exemplo — dados fictícios", "Data: 20/10/2024", "Prestador: Engework Engenharia",
      "Serviço: vistoria de fachada conforme NBR 16747", "Valor: R$ 3.000,00", "Responsável: Conselho"]),
    ("estrutural/2024-11-manutencao-laje.pdf", "Ordem de Serviço — Impermeabilização da Laje de Cobertura",
     ["Edifício Exemplo — dados fictícios", "Data: 12/11/2024", "Prestador: Impermeabiliza Teto Ltda",
      "Serviço: manutenção da manta asfáltica, juntas e selantes", "Valor: R$ 6.200,00", "Responsável: Síndico"]),
    ("servicos/2025-06-troca-dvr.pdf", "Ordem de Serviço — Substituição de DVR e Câmeras",
     ["Edifício Exemplo — dados fictícios", "Data: 30/06/2025", "Prestador: Secure Vigilância e Acesso",
      "Serviço: substituição do DVR e de 2 câmeras do circuito de TV", "Valor: R$ 2.900,00", "Responsável: Conselho"]),
    ("servicos/2026-contrato-limpeza.pdf", "Contrato de Limpeza e Conservação — Exercício 2026",
     ["Edifício Exemplo — dados fictícios", "Contratada: Clean Condomínios Ltda", "Vigência: 01/01/2026 a 31/12/2026",
      "Mensalidade: R$ 4.200,00", "Aprovado em assembleia de 10/12/2025"]),
    ("eletrica/2025-11-laudo-spda.pdf", "Laudo do SPDA — Sistema de Proteção contra Descargas Atmosféricas",
     ["Edifício Exemplo — dados fictícios", "Data: 20/11/2025", "Prestador: Elétrica Condor Ltda",
      "ART 2025/9908776655 (CREA)", "Validade: 12 meses (até 20/11/2026)", "Valor: R$ 1.500,00"]),
    ("servicos/2026-folha-pagamento.pdf", "Folha de Pagamento — Outubro/2026 (uso administrativo)",
     ["Edifício Exemplo — dados fictícios", "Documento com dados pessoais de funcionários.",
      "Visibilidade: ADMINISTRATIVO — não publicado no site público (LGPD).",
      "Disponível apenas na cópia local completa da síndica."]),
    ("servicos/2025-03-parecer-juridico.pdf", "Parecer Jurídico — Danos por vazamento na unidade 42",
     ["Edifício Exemplo — dados fictícios", "Data: 18/03/2025", "Advogada contratada do condomínio",
      "Visibilidade: ADMINISTRATIVO — não publicado no site público.",
      "Disponível apenas na cópia local completa da síndica."]),
    ("assembleias/2025-12-ata-age-contratos.pdf", "Ata de Assembleia Geral Extraordinária — 10/12/2025",
     ["Edifício Exemplo — dados fictícios", "1ª convocação: 20h com 32 de 48 unidades presentes",
      "Única pauta: aprovação dos contratos de limpeza, jardinagem e monitoramento para 2026.",
      "Deliberação aprovada por unanimidade dos presentes."]),
    ("assembleias/2026-03-ata-ago.pdf", "Ata de Assembleia Geral Ordinária — 14/03/2026",
     ["Edifício Exemplo — dados fictícios", "1ª convocação: 20h com 41 de 48 unidades presentes",
      "Pauta: prestação de contas 2025, orçamento 2026 e eleição do conselho fiscal.",
      "Contas aprovadas com ressalva sobre a vistoria de fachada vencida."]),
    ("assembleias/2026-11-convocacao-age-laje.pdf", "Convocação — AGE 18/11/2026",
     ["Edifício Exemplo — dados fictícios", "Convocação de assembleia geral extraordinária",
      "Pauta: votação de orçamento para recuperação da impermeabilização da laje (CR-10)",
      "e contratação de nova vistoria de fachada (CR-11).",
      "1ª convocação às 20h no salão de festas; 2ª às 20h30 com qualquer quórum."]),
    ("servicos/2026-01-nf-material-limpeza.pdf", "Nota Fiscal — Material de Limpeza (janeiro/2026)",
     ["Edifício Exemplo — dados fictícios", "NF-e 000.123 — 15/01/2026",
      "Fornecedor: Clean Supply Distribuidora", "Material de limpeza diversos",
      "Valor total: R$ 680,00", "Vinculada à compra C-002"]),
    ("eletrica/2026-03-nf-lampadas-led.pdf", "Nota Fiscal — Lote de Lâmpadas LED",
     ["Edifício Exemplo — dados fictícios", "NF-e 000.456 — 02/03/2026",
      "Fornecedor: LuzPrime Materiais Elétricos", "24 lâmpadas LED 9W soquete E27",
      "Valor total: R$ 520,00", "Vinculada à compra C-003"]),
    ("mecanica/2026-08-nf-pecas-portao.pdf", "Nota Fiscal — Peças do Motor do Portão",
     ["Edifício Exemplo — dados fictícios", "NF-e 000.789 — 22/08/2026",
      "Fornecedor: Portões & Cia Peças", "Capacitor de partida e fusíveis",
      "Valor total: R$ 180,00", "Insumo da manutenção corretiva do portão (M-041)"]),
    ("servicos/2026-10-relatorio-mensal-limpeza.pdf", "Relatório Mensal de Atividades — Limpeza (out/2026)",
     ["Edifício Exemplo — dados fictícios", "Contratada: Clean Condomínios Ltda (contrato CT-01)",
      "Período: 01/10 a 31/10/2026", "Equipe: 3 profissionais em horário comercial",
      "Ocorrências: nenhuma intercorrência; reposição de insumos conforme C-002",
      "Aprovado pela síndica em 02/11/2026"]),
    ("servicos/2026-09-relatorio-monitoramento.pdf", "Relatório de Monitoramento — setembro/2026",
     ["Edifício Exemplo — dados fictícios", "Contratada: Secure Vigilância e Acesso (contrato CT-03)",
      "Eventos registrados: 4 acionamentos de alarme (todos testes/falsos)",
      "Gravações íntegras — retenção de 30 dias conforme contrato",
      "Nenhum incidente de segurança no período"]),
    ("servicos/2026-10-relatorio-jardinagem.pdf", "Relatório Fotográfico — Jardinagem (out/2026)",
     ["Edifício Exemplo — dados fictícios", "Contratada: Verde Vida Jardinagem ME (contrato CT-02)",
      "Poda de formação, adubação (insumos da compra C-008) e replantio de 6 mudas",
      "Áreas: entrada, jardineiras da garagem e quintal de serviço"]),
]

# fotos de demonstração (relatório fotográfico da manutenção da laje — M-005)
FOTOS = [
    ("estrutural/2023-04-fotos-laje-1.png", (120, 113, 108)),
    ("estrutural/2023-04-fotos-laje-2.png", (87, 83, 78)),
]


def main() -> None:
    print("Criando documentos de exemplo em documentos/ …")
    for rel, titulo, linhas in PDFS:
        criar_pdf(DOCS / rel, titulo, linhas)
    for rel, rgb in FOTOS:
        criar_png(DOCS / rel, 320, 180, rgb)
    print(f"{len(PDFS)} PDFs e {len(FOTOS)} fotos criados.")


if __name__ == "__main__":
    main()
