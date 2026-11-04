/**
 * Gera public/qr-code.svg apontando para a URL do portal (para impressão em quadro
 * de avisos/elevador). Sobrescreve com: SITE_URL=https://... node scripts/gerar_qr.mjs
 */
import QRCode from 'qrcode'
import { writeFileSync } from 'node:fs'

const url = process.env.SITE_URL ?? 'https://ils15.github.io/condominio-dados-abertos/'
const svg = await QRCode.toString(url, {
  type: 'svg',
  margin: 1,
  width: 320,
  color: { dark: '#18181b', light: '#ffffff' },
})
writeFileSync('public/qr-code.svg', svg)
console.log(`QR gerado em public/qr-code.svg -> ${url}`)
