# Operação — rotina da síndica e publicação

Detalhamento operacional do portal. O panorama está no [`README.md`](../README.md); a
arquitetura e as decisões de projeto, em [`ARQUITETURA.md`](ARQUITETURA.md).

## Atualização dos dados

1. Acesse o repositório no GitHub → pasta `dados/` → clique no CSV → ✏️ *Edit*.
2. Edite (adicione manutenções, ajuste o cronograma…) → *Commit changes*.
3. O workflow roda sozinho e o site atualiza em cerca de um minuto.

Também dá para editar no Excel/LibreOffice e enviar o arquivo por *Add file → Upload files*.

### Os doze conjuntos (delimitador `;`, UTF-8)

| Arquivo | O que registra |
|---|---|
| `ativos.csv` | Sistemas do prédio: id, categoria, nome, local, criticidade |
| `cronograma.csv` | Plano preventivo: ativo, atividade, periodicidade (meses), valor de referência, `ultima_execucao` manual (opcional) |
| `manutencoes.csv` | Histórico: data, ativo, `cronograma_id` (vincula ao plano), tipo, valor, prestador, documento, `orcamento_id` |
| `prestadores.csv` | Empresas: CNPJ, contato, especialidades |
| `documentos.csv` | Manifesto do repositório documental: título, categoria (inclui `assembleias`), arquivo, tipo, emissão, validade, prestador, ART/RRT, manutenção vinculada e visibilidade |
| `contratos.csv` | Contratos: prestador, objeto, vigência (início/fim), mensalidade, status |
| `orcamentos.csv` | Cotações: descrição, vínculo (ativo/plano), prestador, valor, status |
| `orcamento_anual.csv` | Previsão aprovada em assembleia: ano, categoria, valor previsto |
| `balancetes.csv` | Balancete mensal: mês (`AAAA-MM`), receita de taxas, outras receitas, despesas, fundo de reserva, inadimplência % (agregada) |
| `assembleias.csv` | Assembleias: data, tipo, pauta, presentes/unidades (quórum) e a ata em `documentos/assembleias/` |
| `consumo.csv` | Consumo mensal das áreas comuns: água (m³), energia (kWh) e custos |
| `compras.csv` | Compras de materiais: data, descrição, categoria, fornecedor (+CNPJ), valor e nota fiscal vinculada |

### Como subir um documento ou nota fiscal

1. No GitHub, abra `documentos/<categoria>/` → *Add file → Upload files* e arraste o PDF.
2. Edite `dados/documentos.csv` e adicione a linha correspondente (título, tipo, emissão/validade,
   prestador/vínculos, visibilidade). Para nota fiscal de compra, edite também `dados/compras.csv`.
3. Commit — o validador confere arquivo, datas, valores e referências, e o site publica sozinho.

Relatório mensal de prestador (limpeza, segurança…): salve o PDF em `documentos/servicos/` e
cadastre em `documentos.csv` com `tipo=relatorio` e o `contrato_id` correspondente.

**Regras que o validador cobra:** datas `AAAA-MM-DD` ou `DD/MM/AAAA`; meses `AAAA-MM`; valores
`3200.50` ou `3200,50` (sem separador de milhar); categorias `hidraulica, eletrica, mecanica,
estrutural, servicos` (documentos aceitam também `assembleias`); tipos `preventiva, corretiva,
inspecao`; todo documento citado precisa existir (PDF ou imagem PNG/JPG); IDs referenciados
precisam existir; arquivo em `documentos/` sem linha no manifesto gera aviso.

## Informe semanal: e-mail e WhatsApp (opcional)

O workflow `.github/workflows/alerta.yml` roda toda segunda às 09h (Brasília) e envia o resumo do
que está atrasado ou vencendo: manutenções, validades, contratos, orçamentos pendentes e a próxima
assembleia. Os canais são independentes — configure um ou ambos em
*Settings → Secrets and variables → Actions*.

**E-mail (SMTP, ex.: Gmail com senha de app):** `ALERTA_SMTP_HOST`, `ALERTA_SMTP_PORT` (587 ou 465),
`ALERTA_SMTP_USER`, `ALERTA_SMTP_PASS`, `ALERTA_EMAIL_DE`, `ALERTA_EMAIL_PARA`.

**WhatsApp (CallMeBot, envia para um número):**

1. Pelo WhatsApp da síndica, envie `I allow callmebot to send me messages` para `+34 644 51 95 23`.
2. Cadastre os secrets `ALERTA_WHATS_PHONE` (`+55DDDNUMERO`) e `ALERTA_WHATS_APIKEY`.

Sem secrets, o script roda em modo de teste sem enviar. Teste local: `python3 scripts/alerta.py`
(após gerar os dados).

## Calendário e agenda

- A página **Calendário** mostra o histórico executado, a projeção do plano (12 meses), validades,
  contratos e assembleias, com filtros e detalhe por dia.
- O `calendario.ics` gerado junto com os dados pode ser assinado no Google Agenda/Apple Calendar:
  *Outras agendas → De URL* → `https://SEU-USUARIO.github.io/condominio-dados-abertos/calendario.ics`.

## Visibilidade: público vs. administrativo

Na coluna `visibilidade` de `documentos.csv`:

- **publico** — vai para o site e para a cópia local;
- **administrativo** — nunca é publicado: fica fora do build público (o arquivo nem é copiado) e
  aparece só na cópia local completa, gerada com `npm run gerar:local`.

Use `administrativo` para folha de pagamento, processos jurídicos e dados pessoais (LGPD) — nunca
para prestações de contas coletivas.

## Como o valor estimado é calculado

Para cada item do cronograma: média dos valores das execuções vinculadas (`cronograma_id`); sem
histórico, usa o `valor_referencia`. Próxima execução = última data + periodicidade. Situação:
**Atrasado** (passou), **Vence em breve** (≤ 30 dias) ou **Em dia**.

## Desenvolvimento

```bash
python3 scripts/gerar_dados.py        # gera public/ no perfil público (padrão)
npm install
npm run dev                           # dev server
npm run build                         # gera dist/ (index.html único + dados + PDFs)
npm run gerar:local                   # gera dist-local/ completo (com administrativos)
node scripts/gerar_qr.mjs             # regenera o QR do portal (SITE_URL=... para trocar a URL)
python3 -m http.server 8123 -d dist   # serve a versão de produção
```

Verificação visual automatizada (screenshots de todas as páginas + teste `file://`):

```bash
python3 -m http.server 8123 -d dist &
node scripts/verificar_visual.mjs
```

## Publicar no GitHub Pages (uma vez só)

1. Crie o repositório e faça push da `main`.
2. Ative Pages com fonte **GitHub Actions**: *Settings → Pages → Source: GitHub Actions*
   (ou `gh api -X POST repos/SEU-USUARIO/SEU-REPO/pages -f build_type=workflow`).
3. A cada push, `.github/workflows/deploy.yml` publica em
   `https://SEU-USUARIO.github.io/SEU-REPO/`.

Domínio próprio depois: aponte um CNAME para o GitHub Pages e adicione o arquivo `CNAME` — o site
usa caminhos relativos, nada mais muda.

### Restringir acesso

O site é estático, então não há login real. Opções: repositório privado com Pages restrito a
membros (requer plano pago), URL não divulgada, ou uma camada de acesso na CDN/host (ex.:
Cloudflare Access na frente do domínio próprio). Valores e CNPJs de prestadores são de interesse
coletivo; dados pessoais de funcionários nunca devem entrar (LGPD).
