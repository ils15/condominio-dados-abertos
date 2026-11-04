# Portal de Dados Abertos do Condomínio

Sistema de dados abertos para transparência da gestão condominial: documentos de manutenção
(hidráulica, elétrica, mecânica, estrutural e serviços), cronograma preventivo com próxima
execução e **valor estimado a partir do histórico**, prestadores e histórico completo de gastos.

O cronograma segue os conceitos da **ABNT NBR 5674** (sistema de gestão de manutenção de
edificações) e as inspeções, a NBR 16747 — o portal também serve como registro de conformidade
para assembleias.

**Status atual:** dados fictícios de demonstração (Edifício Exemplo). Substitua pelos dados reais.

---

## Como funciona (visão geral)

```
dados/*.csv  +  documentos/**          ← FONTE DA VERDADE (síndica edita)
        │
        ▼
scripts/gerar_dados.py                 ← valida, calcula (próxima execução, valor estimado,
        │                                situação) e exporta data.js + CSV + JSON + SQLite
        ▼
site React (Vite)                      ← painel, cronograma, histórico, prestadores,
        │                                documentos e catálogo de dados abertos
        ▼
dist/                                  ← 1 único index.html autocontido + dados + PDFs
     ├── funciona ABRINDO O ARQUIVO localmente (offline, dois cliques)
     └── é o mesmo artifact publicado no GitHub Pages
```

- **Sem banco no servidor** — o site é 100% estático (grátis em qualquer host).
- **Cópia local = cópia nuvem**: `dist/index.html` abre em qualquer navegador sem internet.
- Publicação automática via GitHub Action a cada alteração.

---

## Atualização dos dados (rotina da síndica)

1. Acesse o repositório no GitHub → pasta `dados/` → clique no CSV → ✏️ *Edit*.
2. Edite (adicione manutenções, ajuste o cronograma…) → *Commit changes*.
3. O Action roda sozinho e o site atualiza em ~1 minuto.

Também dá para editar no Excel/LibreOffice e enviar o arquivo pelo botão *Add file → Upload*.

### Os sete conjuntos (delimiter `;`, UTF-8)

| Arquivo | O que registra |
|---|---|
| `ativos.csv` | Sistemas do prédio: id, categoria, nome, local, criticidade |
| `cronograma.csv` | Plano preventivo: ativo, atividade, periodicidade (meses), valor de referência, `ultima_execucao` manual (opcional) |
| `manutencoes.csv` | Histórico: data, ativo, `cronograma_id` (vincula ao plano), tipo, valor, prestador, documento, `orcamento_id` |
| `prestadores.csv` | Empresas: CNPJ, contato, especialidades |
| `documentos.csv` | **Manifesto do repositório documental**: título, categoria, arquivo, tipo (laudo, ordem_servico, nota_fiscal, certificado, relatorio_fotografico, ART…), emissão, **validade**, prestador, **ART/RRT**, manutenção vinculada e **visibilidade** |
| `contratos.csv` | Contratos: prestador, objeto, vigência (início/fim), mensalidade, status |
| `orcamentos.csv` | Cotações: descrição, vínculo (ativo/plano), prestador, valor, status (aguardando/aprovado/rejeitado) |

**Regras que o validador cobra:** datas `AAAA-MM-DD` ou `DD/MM/AAAA`; valores `3200.50` ou
`3200,50` (sem separador de milhar); categorias: `hidraulica, eletrica, mecanica, estrutural,
servicos`; tipos: `preventiva, corretiva, inspecao`; todo `documento` citado precisa existir em
`documentos/<categoria>/` (PDF ou imagem PNG/JPG); IDs referenciados precisam existir; arquivo
presente em `documentos/` sem linha no manifesto gera **aviso**.

### Visibilidade: público vs. administrativo

Na coluna `visibilidade` de `documentos.csv`:
- **publico** — vai para o site (gh-pages) e para a cópia local;
- **administrativo** — **nunca é publicado**: fica de fora do build público (nem o arquivo é
  copiado) e aparece só na **cópia local completa** da síndica, gerada com:

```bash
npm run gerar:local   # gera dist-local/ com TUDO (abre offline, com badge "administrativo")
```

Use `administrativo` para folha de pagamento, processos jurídicos, dados pessoais (LGPD) —
nunca para prestações de contas coletivas.

### Como o valor estimado é calculado

Para cada item do cronograma: **média dos valores das execuções vinculadas** (`cronograma_id`);
sem histórico, usa o `valor_referencia`. Próxima execução = última data + periodicidade.
Situação: **Atrasado** (passou), **Vence em breve** (≤ 30 dias) ou **Em dia**.

---

## Rodando localmente (desenvolvimento)

```bash
python3 scripts/gerar_dados.py        # gera public/ no perfil público (padrão)
npm install
npm run dev                           # dev server
npm run build                         # gera dist/ (index.html único + dados + PDFs)
npm run gerar:local                   # gera dist-local/ COMPLETO (com administrativos)
python3 -m http.server 8123 -d dist   # serve a versão de produção p/ testar
```

A arquitetura completa (benchmarking, decisões, fases de evolução para PocketBase/nuvem) está
em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

Verificação visual automatizada (screenshots de todas as páginas + teste file://):
```bash
python3 -m http.server 8123 -d dist &
node scripts/verificar_visual.mjs
```

## Publicar no GitHub Pages (uma vez só)

1. Crie o repositório (ex.: `condominio-dados-abertos`) e faça push da `main`.
2. Ative Pages com fonte **GitHub Actions**: Settings → Pages → Source: *GitHub Actions*.
   (ou `gh api -X POST repos/SEU-USUARIO/SEU-REPO/pages -f build_type=workflow`)
3. A cada push, o workflow `.github/workflows/deploy.yml` publica.
   URL final: `https://SEU-USUARIO.github.io/condominio-dados-abertos/`

**Domínio próprio do condomínio depois:** basta apontar um CNAME para o GitHub Pages e adicionar
o arquivo `CNAME` — nada mais muda, pois o site usa caminhos relativos.

### Restringir acesso (se não quiser público)

O site é estático, então não há login real. Opções: repo **privado** + Pages só para membros
( requer plano pago em repos privados), URL não divulgada, ou colocar senha na CDN/host
(ex.: Cloudflare Access na frente do domínio próprio). Avalie o que é dado público:
valores e CNPJs de prestadores são de interesse coletivo; dados pessoais de funcionários
**nunca** devem entrar (LGPD).

---

## Estrutura

```
dados/          CSVs (fonte da verdade)
documentos/     PDFs por categoria (hidraulica/, eletrica/, mecanica/, estrutural/, servicos/)
scripts/        gerar_dados.py · criar_pdfs_exemplo.py · verificar_visual.mjs
src/            app React (páginas, componentes)
public/         gerado pelo script (não commitado)
dist/           build final (não commitado) — cópia local publicável
```

Licença dos dados: CC BY 4.0. Código: use livremente.
