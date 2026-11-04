/**
 * Verificação visual do portal (build em dist/):
 *   - abre cada página, coleta erros de console e tira screenshot
 *   - testa o modo escuro e os filtros do cronograma
 *   - prova que a cópia local funciona via file:// (offline)
 * Uso: node scripts/verificar_visual.mjs [url-base]
 * (padrão http://localhost:8123 — sirva dist/ antes com: python3 -m http.server 8123 -d dist)
 */
import { chromium } from 'playwright-core'
import { homedir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:8123'
const EXECUTAVEL = join(homedir(), '.cache/ms-playwright/chromium-1252/chrome-linux64/chrome')
const SAIDA = '/tmp/cond-shots'
mkdirSync(SAIDA, { recursive: true })

const erros = []
const navegador = await chromium.launch({ executablePath: EXECUTAVEL, args: ['--no-sandbox'] })
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
pagina.on('console', (msg) => {
  if (msg.type() === 'error') erros.push(`[${pagina.url()}] ${msg.text()}`)
})
pagina.on('pageerror', (err) => erros.push(`[pageerror ${pagina.url()}] ${err.message}`))

async function abrir(rota, nome, acoes) {
  await pagina.goto(`${BASE}/#${rota}`, { waitUntil: 'networkidle' })
  await pagina.waitForTimeout(600) // gráficos recharts animam
  if (acoes) await acoes()
  await pagina.screenshot({ path: `${SAIDA}/${nome}.png` })
  console.log(`ok: ${nome}`)
}

await abrir('/', '01-painel-claro')
await pagina.getByTitle('Modo escuro').click()
await pagina.waitForTimeout(300)
await pagina.screenshot({ path: `${SAIDA}/02-painel-escuro.png` })
console.log('ok: 02-painel-escuro')
await pagina.getByTitle('Modo claro').click()

await abrir('/cronograma', '03-cronograma', async () => {
  await pagina.getByTitle('Modo escuro').click() // tabela no escuro
  await pagina.waitForTimeout(300)
})
await pagina.getByTitle('Modo claro').click()

await abrir('/cronograma', '04-cronograma-atrasadas', async () => {
  await pagina.locator('select').first().selectOption('hidraulica')
  await pagina.waitForTimeout(300)
})

await abrir('/historico', '05-historico')
await abrir('/prestadores', '06-prestadores')
await abrir('/documentos', '07-documentos')
await abrir('/dados-abertos', '08-dados-abertos')

// busca global no header (só aparece >= sm)
await pagina.goto(`${BASE}/#/historico`, { waitUntil: 'networkidle' })
await pagina.getByPlaceholder('Buscar em todo o portal…').fill('elevador')
await pagina.waitForTimeout(400)
await pagina.screenshot({ path: `${SAIDA}/09-busca-global.png` })
console.log('ok: 09-busca-global')

// link de documento abre (target=_blank)
const [aba] = await Promise.all([
  pagina.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
  pagina.getByRole('link', { name: 'ver documento' }).first().click(),
])
console.log(aba ? 'ok: link de PDF abriu em nova aba' : 'AVISO: popup de PDF não capturado')
if (aba) await aba.close()

await navegador.close()

// cópia local offline via file://
const navegador2 = await chromium.launch({ executablePath: EXECUTAVEL, args: ['--no-sandbox'] })
const pagina2 = await navegador2.newPage({ viewport: { width: 1440, height: 900 } })
const errosFile = []
pagina2.on('console', (m) => m.type() === 'error' && errosFile.push(m.text()))
pagina2.on('pageerror', (e) => errosFile.push(e.message))
const caminho = new URL(`file://${process.cwd()}/dist/index.html`)
await pagina2.goto(caminho.href, { waitUntil: 'load' })
await pagina2.waitForTimeout(800)
const carregou = await pagina2.evaluate(() => {
  const texto = document.body.innerText
  return {
    temDados: !!window.__DATA__?.cronograma?.length,
    temPainel: texto.includes('Gasto — últimos 12 meses'),
    temAtrasadas: texto.includes('Manutenções atrasadas'),
  }
})
await pagina2.screenshot({ path: `${SAIDA}/10-file-local.png` })
console.log('ok: 10-file-local', JSON.stringify(carregou))
console.log('erros file://', errosFile.length ? errosFile : 'nenhum')
await navegador2.close()

console.log('\nerros de console (servidor):', erros.length ? erros : 'nenhum')
console.log(`screenshots em ${SAIDA}`)
