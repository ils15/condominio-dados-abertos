import { useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Download, FileText } from 'lucide-react'
import { META_EVENTO, badgeCategoria, gradeMes, montarEventos, type EventoCalendario, type TipoEvento } from '../eventos'
import { META_CATEGORIA, dados } from '../dados'
import { dataPt, diasTexto, moeda, mesPt } from '../format'
import { Badge, Card, Vazio } from '../ui'
import { useBusca } from '../Layout'

const TODOS_TIPOS = Object.keys(META_EVENTO) as TipoEvento[]
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function Calendario() {
  const { consulta } = useBusca()
  const hojeAno = Number(dados.hoje.slice(0, 4))
  const hojeMes = Number(dados.hoje.slice(5, 7))
  const [cursor, setCursor] = useState({ ano: hojeAno, mes: hojeMes })
  const [ativos, setAtivos] = useState<TipoEvento[]>(TODOS_TIPOS)
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const q = consulta.trim().toLowerCase()

  const eventos = useMemo(() => montarEventos(12), [])

  const filtrados = useMemo(
    () => eventos
      .filter((e) => ativos.includes(e.tipo))
      .filter((e) => !q || `${e.titulo} ${e.subtitulo ?? ''}`.toLowerCase().includes(q)),
    [eventos, ativos, q],
  )

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>()
    for (const e of filtrados) mapa.set(e.data, [...(mapa.get(e.data) ?? []), e])
    return mapa
  }, [filtrados])

  const celulas = useMemo(() => gradeMes(cursor.ano, cursor.mes), [cursor])
  const doMes = celulas.filter((c) => !c.foraDoMes).flatMap((c) => porDia.get(c.iso) ?? [])
  const eventosDia = diaSel ? (porDia.get(diaSel) ?? []) : []

  const navegar = (delta: number) => {
    const total = cursor.mes - 1 + delta
    setCursor({ ano: cursor.ano + Math.floor(total / 12), mes: ((total % 12) + 12) % 12 + 1 })
    setDiaSel(null)
  }

  const alternarTipo = (t: TipoEvento) =>
    setAtivos((atuais) => (atuais.includes(t) ? atuais.filter((x) => x !== t) : [...atuais, t]))

  const contagemMes = (t: TipoEvento) => doMes.filter((e) => e.tipo === t).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Calendário do condomínio</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manutenções executadas (histórico) e previstas (projeção do plano preventivo),
            vencimentos de documentos, contratos e assembleias — tudo numa linha do tempo.
          </p>
        </div>
        <a
          href="./calendario.ics"
          download
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-xs font-medium text-zinc-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
        >
          <Download className="h-3.5 w-3.5" /> Assinar na sua agenda (.ics)
        </a>
      </div>

      {/* filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        {TODOS_TIPOS.map((t) => {
          const meta = META_EVENTO[t]
          const ligado = ativos.includes(t)
          return (
            <button
              key={t}
              onClick={() => alternarTipo(t)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                ligado
                  ? 'border-transparent text-white'
                  : 'border-zinc-300 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
              }`}
              style={ligado ? { background: meta.cor } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: ligado ? '#fff' : meta.cor }} />
              {meta.rotulo}
              {contagemMes(t) > 0 && <span className="opacity-70">({contagemMes(t)})</span>}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* grade do mês */}
        <Card
          className="lg:col-span-2"
          titulo={
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="capitalize">{mesPt(`${cursor.ano}-${String(cursor.mes).padStart(2, '0')}`)}</span>
            </span>
          }
          acao={
            <div className="flex items-center gap-1">
              <button
                onClick={() => navegar(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setCursor({ ano: hojeAno, mes: hojeMes }); setDiaSel(null) }}
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                hoje
              </button>
              <button
                onClick={() => navegar(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celulas.map((c) => {
              const evs = porDia.get(c.iso) ?? []
              const ehHoje = c.iso === dados.hoje
              const ehSel = c.iso === diaSel
              return (
                <button
                  key={c.iso}
                  onClick={() => setDiaSel(ehSel ? null : c.iso)}
                  className={`flex min-h-[72px] flex-col rounded-lg border p-1.5 text-left transition-colors ${
                    c.foraDoMes
                      ? 'border-transparent opacity-35'
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'
                  } ${ehSel ? 'ring-2 ring-blue-500/50' : ''} ${ehHoje && !ehSel ? 'border-blue-400 dark:border-blue-600' : ''}`}
                >
                  <span className={`text-xs font-medium tabular-nums ${ehHoje ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                    {c.dia}
                  </span>
                  <span className="mt-auto flex flex-wrap gap-0.5">
                    {evs.slice(0, 4).map((e) => (
                      <span
                        key={e.id}
                        title={`${META_EVENTO[e.tipo].rotulo}: ${e.titulo}`}
                        className={`h-2 w-2 rounded-full ${e.previsto && !e.atrasado ? 'opacity-60' : ''}`}
                        style={{ background: META_EVENTO[e.tipo].cor }}
                      />
                    ))}
                    {evs.length > 4 && (
                      <span className="text-[9px] leading-none text-zinc-400">+{evs.length - 4}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
            <span>bolinha cheia = executado/vencido</span>
            <span>bolinha translúcida = previsto</span>
            <span>clique num dia para os detalhes</span>
          </p>
        </Card>

        {/* painel do dia / resumo do mês */}
        <div className="flex flex-col gap-4">
          <Card titulo={diaSel ? `Dia ${dataPt(diaSel)}` : 'Resumo do mês'}>
            {diaSel ? (
              eventosDia.length === 0 ? (
                <Vazio>Nenhum evento neste dia.</Vazio>
              ) : (
                <ul className="flex flex-col gap-3">
                  {eventosDia.map((e) => (
                    <li key={e.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: META_EVENTO[e.tipo].cor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">{e.titulo}</p>
                        {e.subtitulo && <p className="text-xs text-zinc-500 dark:text-zinc-400">{e.subtitulo}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge className={META_EVENTO[e.tipo].badge}>{META_EVENTO[e.tipo].rotulo}</Badge>
                          {e.categoria && (
                            <Badge className={badgeCategoria(e.categoria)}>
                              {META_CATEGORIA[e.categoria]?.rotulo}
                            </Badge>
                          )}
                          {e.previsto ? (
                            <Badge className={e.atrasado
                              ? 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}>
                              {e.atrasado ? `atrasado (${diasTexto(Math.round((new Date(dados.hoje).getTime() - new Date(e.data).getTime()) / 86400000) ?? 0)})` : 'previsto'}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                              executado
                            </Badge>
                          )}
                          {e.valor != null && (
                            <span className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                              {e.previsto ? '~' : ''}{moeda(e.valor)}
                            </span>
                          )}
                          {e.documento && (
                            <a href={`./${e.documento}`} target="_blank" rel="noreferrer"
                               className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                              <FileText className="h-3 w-3" /> doc
                            </a>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="flex flex-col gap-3">
                {TODOS_TIPOS.filter((t) => contagemMes(t) > 0).map((t) => (
                  <div key={t} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: META_EVENTO[t].cor }} />
                    <span className="text-zinc-600 dark:text-zinc-300">{META_EVENTO[t].rotulo}</span>
                    <span className="ml-auto font-semibold tabular-nums">{contagemMes(t)}</span>
                  </div>
                ))}
                {doMes.length === 0 && <Vazio>Nenhum evento neste mês.</Vazio>}
              </div>
            )}
          </Card>

          {doMes.some((e) => e.previsto && e.valor) && (
            <Card titulo="Investimento previsto no mês">
              <p className="text-2xl font-semibold tabular-nums">
                {moeda(doMes.filter((e) => e.previsto && !e.atrasado).reduce((s, e) => s + (e.valor ?? 0), 0))}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Clock className="h-3 w-3" /> soma das atividades previstas (estimativas do plano)
              </p>
              {doMes.some((e) => e.previsto && e.atrasado) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <Check className="h-3 w-3" /> atrasadas acumuladas: {moeda(
                    doMes.filter((e) => e.previsto && e.atrasado).reduce((s, e) => s + (e.valor ?? 0), 0),
                  )}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
