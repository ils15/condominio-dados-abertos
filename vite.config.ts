import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Injeta <script src="./data.js"> sem passar pelo resolvedor de assets do Vite.
 * O arquivo vem de public/ (gerado por scripts/gerar_dados.py) e, por ser um script
 * clássico, carrega tanto via http(s) quanto via file:// (cópia local offline).
 */
function dadosRuntime(): Plugin {
  return {
    name: 'dados-runtime',
    transformIndexHtml() {
      return [{ tag: 'script', attrs: { src: './data.js' }, injectTo: 'head-prepend' }]
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), dadosRuntime(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
