# Arquitetura — Sistema de Dados Abertos e Transparência Condominial

Documento de referência do projeto: benchmarking, arquitetura recomendada, modelo de dados e
plano de implantação em fases. Acompanha a implementação real deste repositório.

---

## 1. Benchmarking e referências

| Solução | O que é | Prós | Contras p/ condomínio | Veredito |
|---|---|---|---|---|
| **CKAN** | Plataforma-padrão de portais de dados abertos (dados.gov.br, data.gov) | Metadados maduros (dataset→recurso), API, DCAT, faceted search | Python+PostgreSQL+Solr; ops pesada; UX voltada a governo | Referência de **modelo de metadados** — não vale rodar |
| **Directus** | Headless CMS sobre banco SQL existente | Admin UI muito polido, papéis/permissões, API REST+GraphQL | Mais recurso que PocketBase; conceito de "coleções" generalista | Alternativa na Fase 3 se a equipe quiser admin rico |
| **PocketBase** | Backend num único binário (Go) + SQLite | Auth, regras por coleção, upload de arquivos (local ou S3), realtime; ~30 MB RAM | Sem clustering; backups são responsabilidade sua | **Escolha natural da Fase 3** (login + upload pela interface) |
| **Supabase** | Firebase open-source sobre PostgreSQL | Auth, storage, funções, Postgres completo | Self-host = muitos componentes Docker; complexidade de ops | Exagero p/ o caso; só se já houver equipe/data platform |
| **CMMS open source** (Atlas CMMS, openMAINT) | Gestão de manutenção (ativos, OS, preventivas) | Conceito ativo→plano→histórico maduro | Complexo p/ síndica; não é "dados abertos" | Usamos o **modelo de dados**, não a ferramenta |
| **Sob medida (este projeto)** | CSVs + gerador Python + site estático React | R$ 0 de infra, zero ops, funciona offline, dados 100% abertos | Sem login real (Fase 2 resolve por build duplo); edição via planilha | **Escolhido** p/ MVP e Fase 2 |

Fontes: [CKAN](https://ckan.org) · [comparativo PocketBase vs Supabase](https://pocketbasecloud.com/docs/platform/pocketbase-vs-supabase) ·
[experiências self-hosted de PocketBase](https://lowendtalk.com/discussion/184975/have-you-used-pocketbase-self-hosted-baas) ·
[lista de BaaS self-hosted](https://gist.github.com/PARC6502/ee4db400a05e6eb6d0981bb8cd4e4c1c) ·
[Atlas CMMS](https://github.com/grashjs/cmms) · [openMAINT](https://www.openmaint.org/en/home).

Normas que fundamentam o modelo: **ABNT NBR 5674** (sistema de gestão de manutenção de
edificações — plano preventivo documentado e registros de execução), **NBR 16747** (inspeção
predial) e **NBR 16280** (reformas em edificações habitadas — intervenções estruturais).

## 2. Arquitetura recomendada

### Fase atual — estático híbrido (implantada)

```
┌────────────────────────────────────────────────────────────────────┐
│ FONTE DA VERDADE (editável pela síndica em planilha ou no GitHub)  │
│   dados/*.csv  (7 conjuntos)      documentos/<categoria>/ (PDF,foto)│
└───────────────┬────────────────────────────────────────────────────┘
                │  scripts/gerar_dados.py  (valida + calcula + exporta)
                │  ── perfil PUBLICO: remove visibilidade=administrativo
                │  ── perfil COMPLETO: mantém tudo (cópia local da síndica)
                ▼
   ┌────────────────────────────┐        ┌──────────────────────────┐
   │ public/ (perfil público)   │        │ dist-local/ (completo)   │
   │  + vite build → dist/      │        │  index.html único + dados│
   └────────────┬───────────────┘        │  + TODOS os documentos   │
                │ GitHub Action          └──────────────────────────┘
                ▼                                   (abre offline,
        GitHub Pages (grátis)                        dois cliques)
        https://usuario.github.io/condominio-dados-abertos/
```

**Decisões-chave:**
- **Sem backend = sem custo, sem ataque de superfície, sem backup de servidor** (o repositório
  Git é o backup versionado).
- **Visibilidade por build**: nada administrativo sequer é publicado no site público — não é
  "escondido no front", simplesmente não existe no deploy público. A síndica gera a cópia
  completa com `npm run gerar:local`.
- **Cópia local = mesma tecnologia do site** (um `index.html` autocontido + `data.js` clássico,
  que carrega inclusive via `file://`).
- Dados abertos de verdade: CSV, JSON, **SQLite** e `datapackage.json` (Frictionless) baixáveis.

### Fase 3 — quando precisar de login/upload (evolução planejada)

```
VPS Linux (~R$ 20-40/mês) ou container gratuito
├── PocketBase (1 binário Go, SQLite embutido)
│     ├── coleções: mesmas 7 entidades (+ usuarios)
│     ├── regras: condôminos leem "publico"; síndica/admin escreve
│     └── arquivos: local → S3-compatible (Wasabi/Cloudflare R2) quando crescer
└── o MESMO app React (o data.js vira chamada à API REST)
```
A migração é barata porque o gerador já exporta SQLite com o mesmo esquema.

## 3. Modelo de dados (7 entidades)

```
prestadores 1───n manutencoes n───1 ativos
     │                │  n───1 orcamentos (rastreabilidade orçamento→execução)
     │                └─ n───1 documentos (via manutencao_id)
     ├───n contratos ──┴── documento do contrato
     └───n documentos (via prestador_id)
cronograma n───1 ativos   (execuções ligam cronograma→manutencoes via cronograma_id)
```

| Entidade | Campos essenciais | Derivados (gerador) |
|---|---|---|
| **ativos** | id, categoria, nome, local, descricao, criticidade | — |
| **cronograma** | id, ativo_id, atividade, tipo, periodicidade_meses, prestador_id, valor_referencia, ultima_execucao (manual, opcional), observacoes | próxima_execução, valor_estimado (média do histórico), custo_anual, situação (atrasado/vence/em dia) |
| **manutencoes** | id, data, ativo_id, cronograma_id, tipo (preventiva/corretiva/inspeção), descricao, prestador_id, valor, documento, orcamento_id, responsavel | categoria, nomes resolvidos |
| **documentos** | id, titulo, categoria, arquivo, tipo (laudo/OS/NF/certificado/foto/ART…), data_emissao, **validade**, prestador_id, **art_rrt**, manutencao_id, **visibilidade (publico/administrativo)**, observacoes | status_validade (vencido/vence ≤90d/válido) |
| **prestadores** | id, nome, cnpj, contato, especialidades, categoria | — |
| **contratos** | id, prestador_id, objeto, categoria, inicio, fim, valor_mensal, status, documento, observacoes | vigente, dias_para_fim, gasto_12m do prestador |
| **orcamentos** | id, data, descricao, ativo_id, cronograma_id, prestador_id, valor, status (aguardando/aprovado/rejeitado), documento, observacoes | vínculos resolvidos |

Regras de negócio implementadas no gerador: estimativa = média das execuções vinculadas (senão
valor de referência); validade vencida gera alerta no Painel; NBR 5674 — cada item do plano tem
periodicidade e registro de execução; LGPD — dados pessoais só no perfil administrativo.

## 4. Plano de implantação em fases

| Fase | Escopo | Status |
|---|---|---|
| **F1 — MVP estático** | CSVs, portal React, gh-pages com deploy automático, cópia local offline | ✅ entregue |
| **F2 — Conformidade & transparência** (este) | Repositório documental com metadados (validade, ART/RRT, fotos), visibilidade público/administrativo por build duplo, contratos + orçamentos, página Financeira, alertas de validade | ✅ entregue |
| **F3 — Colaboração** | PocketBase em VPS/container: login de condôminos, upload de documentos pela interface, notificações (e-mail de manutenção vencendo), app React consumindo API | planejada |
| **F4 — Produção plena** | Domínio próprio do condomínio (CNAME), TLS, Cloudflare Access se restrito, backups automáticos do volume, rotina de e-mail mensal aos moradores | planejada |

**Gatilho para a Fase 3:** a síndica/assessoria deixar de conseguir manter os CSVs, ou o
condomínio exigir upload direto de documentos pelo celular. Enquanto isso, o custo operacional
da Fase 1-2 é zero.
