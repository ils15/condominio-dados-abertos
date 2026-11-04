const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtMoedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
})

export const moeda = (v: number | null | undefined): string =>
  v == null ? '—' : fmtMoeda.format(v)

export const moedaCurta = (v: number | null | undefined): string =>
  v == null ? '—' : fmtMoedaCurta.format(v)

/** Converte '2026-11-08' em '08/11/2026'. */
export const dataPt = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Texto humano para dias restantes: "em 4 dias", "atrasado 21 dias". */
export const diasTexto = (dias: number | null): string => {
  if (dias == null) return '—'
  if (dias === 0) return 'vence hoje'
  if (dias > 0) return `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  const atraso = -dias
  if (atraso > 548) return `atrasado há ${Math.round(atraso / 365)} anos`
  if (atraso > 60) return `atrasado há ${Math.round(atraso / 30)} meses`
  return `atrasado há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}`
}

export const bytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** '2026-11' -> 'nov/26' */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const mesCurto = (mes: string): string => {
  const [a, m] = mes.split('-')
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`
}
