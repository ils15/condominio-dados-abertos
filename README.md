# condominio-dados-abertos

Portal de dados abertos da manutenção de um edifício residencial — cronograma preventivo, gastos, prestadores e documentos — feito para síndicos e condôminos que precisam prestar contas.

[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20TypeScript-3178c6)](package.json)
[![Dados](https://img.shields.io/badge/dados-Python%203-3776ab)](scripts/gerar_dados.py)
[![Demo](https://img.shields.io/badge/demo-ao%20vivo-2ea44f)](https://ils15.github.io/condominio-dados-abertos/)

## O que é

Laudos, notas fiscais, atas e o plano de manutenção de um prédio vivem em pastas e planilhas que ninguém consegue auditar. Este projeto transforma esses arquivos em um portal estático de transparência, com cronograma preventivo baseado na ABNT NBR 5674 e inspeções na NBR 16747.

A fonte da verdade são doze arquivos CSV em `dados/` mais os PDFs em `documentos/`. Um script Python valida os dados, calcula a próxima execução de cada atividade e o valor estimado, e gera os artefatos que o site React consome — incluindo um `dist/index.html` autocontido que abre offline com dois cliques.

Não há banco nem servidor: o build é 100% estático, e a cópia local é idêntica à publicada no GitHub Pages.

## Demo

<https://ils15.github.io/condominio-dados-abertos/> — com dados fictícios de demonstração (Edifício Exemplo).

## Instalação

Requer Python 3 e Node.js; não há dependência Python além da biblioteca padrão. O workflow de publicação usa Python 3.12 e Node 22.

```bash
python3 scripts/gerar_dados.py   # valida os CSVs e gera public/data.js e os demais artefatos
npm install
```

## Uso

```bash
npm run dev                            # servidor de desenvolvimento
npm run build                          # gera dist/ (index.html único + dados + PDFs)
python3 -m http.server 8123 -d dist    # confere a versão de produção
npm run gerar:local                    # gera dist-local/ com os documentos de visibilidade administrativa
```

No dia a dia a atualização é editar o CSV direto no GitHub e commitar: o workflow `.github/workflows/deploy.yml` regenera os dados, builda e publica. O validador recusa data, valor ou referência inválida e mostra o erro em português na execução da Action.

Rotina completa da síndica (doze conjuntos, upload de documentos, regras do validador, informe semanal por e-mail/WhatsApp, visibilidade dos documentos): [`docs/OPERACAO.md`](docs/OPERACAO.md). Arquitetura e benchmarking de alternativas: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Estrutura

```
dados/       12 CSVs — fonte da verdade (cronograma, manutenções, prestadores, financeiro…)
documentos/  PDFs por categoria (hidraulica, eletrica, mecanica, estrutural, servicos, assembleias)
scripts/     gerar_dados.py · alerta.py · verificar_visual.mjs
src/         app React (10 páginas)
public/      gerado por scripts/gerar_dados.py (não commitado)
dist/        build final (não commitado)
```

## Licença

Não há arquivo de licença no repositório; o projeto declara os dados sob CC BY 4.0 e o código de uso livre.
