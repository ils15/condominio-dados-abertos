import type { CategoriaDoc } from './tipos'
import { dados } from './dados'
import { badgeCategoria } from './dados'

/** Tipos de evento exibidos no calendário. */
export type TipoEvento =
  | 'preventiva' | 'inspecao' | 'corretiva' | 'validade' | 'contrato' | 'assembleia'

export interface EventoCalendario {
  id: string
  data: string // AAAA-MM-DD
  tipo: TipoEvento
  titulo: string
  subtitulo?: string
  valor?: number | null
  documento?: string
  categoria?: CategoriaDoc
  /** true = projeção do cronograma ainda não executada */
  previsto: boolean
  atrasado?: boolean
}

export const META_EVENTO: Record<TipoEvento, { rotulo: string; cor: string; badge: string }> = {
  preventiva: {
    rotulo: 'Preventiva',
    cor: '#3b82f6',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  inspecao: {
    rotulo: 'Inspeção',
    cor: '#8b5cf6',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  },
  corretiva: {
    rotulo: 'Corretiva',
    cor: '#f97316',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  },
  validade: {
    rotulo: 'Validade',
    cor: '#ef4444',
    badge: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
  contrato: {
    rotulo: 'Contrato',
    cor: '#14b8a6',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
  },
  assembleia: {
    rotulo: 'Assembleia',
    cor: '#6366f1',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
}

const addDias = (iso: string, dias: number): string => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

const addMesesISO = (iso: string, meses: number): string => {
  const [a, m, d] = iso.split('-').map(Number)
  const total = m - 1 + meses
  const ano = a + Math.floor(total / 12)
  const mes = (total % 12) + 1
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

/** Monta todos os eventos: histórico executado, projeções futuras do plano e vencimentos. */
export function montarEventos(janelaMeses = 12): EventoCalendario[] {
  const hoje = dados.hoje
  const limite = addMesesISO(hoje, janelaMeses)
  const eventos: EventoCalendario[] = []

  // 1) histórico executado
  for (const m of dados.manutencoes) {
    eventos.push({
      id: `m-${m.id}`,
      data: m.data,
      tipo: m.tipo as TipoEvento,
      titulo: m.descricao,
      subtitulo: `${m.ativo_nome}${m.prestador_nome ? ` · ${m.prestador_nome}` : ''}`,
      valor: m.valor ? Number(m.valor.replace(/\./g, '').replace(',', '.')) : null,
      documento: m.documento || undefined,
      categoria: m.categoria,
      previsto: false,
    })
  }

  // 2) projeções do cronograma (inclui atrasadas na data devida)
  for (const c of dados.cronograma) {
    if (!c.proxima_execucao) continue
    const passo = Number(c.periodicidade_meses)
    let data = c.proxima_execucao
    let n = 0
    while (data <= limite && n < 24) {
      eventos.push({
        id: `p-${c.id}-${data}`,
        data,
        tipo: c.tipo as TipoEvento,
        titulo: c.atividade,
        subtitulo: `${c.ativo_nome}${c.prestador_nome ? ` · ${c.prestador_nome}` : ''}`,
        valor: c.valor_estimado,
        categoria: c.categoria,
        previsto: true,
        atrasado: data < hoje,
      })
      data = addMesesISO(data, passo)
      n++
    }
  }

  // 3) validades de documentos
  for (const d of dados.documentos) {
    if (!d.validade) continue
    eventos.push({
      id: `v-${d.id}`,
      data: d.validade,
      tipo: 'validade',
      titulo: `Vence: ${d.titulo}`,
      subtitulo: d.prestador_nome ?? undefined,
      documento: d.arquivo,
      categoria: d.categoria,
      previsto: d.validade >= hoje,
      atrasado: d.validade < hoje,
    })
  }

  // 4) fim de vigência dos contratos
  for (const c of dados.contratos) {
    if (!c.vigente) continue
    eventos.push({
      id: `c-${c.id}`,
      data: c.fim,
      tipo: 'contrato',
      titulo: `Contrato termina: ${c.objeto}`,
      subtitulo: c.prestador_nome,
      documento: c.documento || undefined,
      categoria: c.categoria,
      previsto: true,
    })
  }

  // 5) assembleias
  for (const a of dados.assembleias) {
    eventos.push({
      id: `a-${a.id}`,
      data: a.data,
      tipo: 'assembleia',
      titulo: `${a.futura ? 'Assembleia agendada' : 'Assembleia'} — ${a.pauta.split(';')[0]}`,
      subtitulo: a.futura ? 'convocação disponível' : `quórum ${a.quorum_pct ? String(a.quorum_pct).replace('.', ',') + '%' : '—'}`,
      documento: a.documento || undefined,
      categoria: 'assembleias',
      previsto: a.futura,
    })
  }

  return eventos.sort((x, y) => (x.data < y.data ? -1 : x.data > y.data ? 1 : 0))
}

/** Grade do mês: 6 semanas a partir do domingo anterior ao dia 1. */
export function gradeMes(ano: number, mes: number): { iso: string; dia: number; foraDoMes: boolean }[] {
  const primeiro = new Date(ano, mes - 1, 1)
  const inicio = new Date(primeiro)
  inicio.setDate(1 - primeiro.getDay()) // recua até o domingo
  const celulas = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    celulas.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dia: d.getDate(),
      foraDoMes: d.getMonth() !== mes - 1,
    })
  }
  return celulas
}

export { badgeCategoria, addDias }
