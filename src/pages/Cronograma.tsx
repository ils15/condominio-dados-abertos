import { useMemo, useState } from 'react'
import { META_CATEGORIA, META_STATUS, META_TIPO, badgeCategoria, dados } from '../dados'
import { dataPt, diasTexto, moeda } from '../format'
import { Badge, Card, CampoFiltro, RotuloFiltro, Vazio, inputBase } from '../ui'
import { useBusca } from '../Layout'

const STATUS = ['todos', 'atrasado', 'vence_breve', 'em_dia', 'a_programar'] as const

export default function Cronograma() {
  const { consulta } = useBusca()
  const [categoria, setCategoria] = useState('todas')
  const [status, setStatus] = useState<(typeof STATUS)[number]>('todos')
  const [tipo, setTipo] = useState('ambos')

  const itens = useMemo(() => {
    const q = consulta.trim().toLowerCase()
    return dados.cronograma
      .filter((c) => categoria === 'todas' || c.categoria === categoria)
      .filter((c) => status === 'todos' || c.status === status)
      .filter((c) => tipo === 'ambos' || c.tipo === tipo)
      .filter((c) => !q || `${c.atividade} ${c.ativo_nome} ${c.id} ${c.prestador_nome ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.dias_restantes ?? 99999) - (b.dias_restantes ?? 99999))
  }, [consulta, categoria, status, tipo])

  const custoAnual = itens.reduce((s, c) => s + (c.custo_anual_estimado ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Cronograma de manutenção</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Plano preventivo do edifício — próxima execução e valor estimado calculados a partir do histórico
          registrado (média das últimas execuções; sem histórico, usa o valor de referência).
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoFiltro>
            <RotuloFiltro>Categoria</RotuloFiltro>
            <select className={inputBase} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {dados.categorias.map((c) => (
                <option key={c} value={c}>{META_CATEGORIA[c].rotulo}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Situação</RotuloFiltro>
            <select className={inputBase} value={status} onChange={(e) => setStatus(e.target.value as (typeof STATUS)[number])}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s === 'todos' ? 'Todas' : META_STATUS[s].rotulo}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Tipo</RotuloFiltro>
            <select className={inputBase} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="ambos">Ambos</option>
              <option value="preventiva">Preventiva</option>
              <option value="inspecao">Inspeção</option>
            </select>
          </CampoFiltro>
        </div>
      </Card>

      <Card titulo={`${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`}
            acao={<span className="text-xs text-zinc-500 dark:text-zinc-400">custo anual estimado: <b className="tabular-nums text-zinc-800 dark:text-zinc-100">{moeda(custoAnual)}</b></span>}>
        {itens.length === 0 ? (
          <Vazio>Nenhum item do cronograma corresponde aos filtros.</Vazio>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Atividade</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Periodicidade</th>
                  <th className="pb-2 pr-3 font-medium">Última execução</th>
                  <th className="pb-2 pr-3 font-medium">Próxima</th>
                  <th className="pb-2 pr-3 text-right font-medium">Valor estimado</th>
                  <th className="pb-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {itens.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="max-w-[280px] py-3 pr-3">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">{c.atividade}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {c.ativo_nome} · {c.id}
                        {c.prestador_nome && ` · ${c.prestador_nome}`}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge className={badgeCategoria(c.categoria)}>{META_CATEGORIA[c.categoria].rotulo}</Badge>
                      <Badge className="ml-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {META_TIPO[c.tipo].rotulo}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-zinc-600 tabular-nums dark:text-zinc-300">
                      {c.periodicidade_meses} {Number(c.periodicidade_meses) === 1 ? 'mês' : 'meses'}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-zinc-600 tabular-nums dark:text-zinc-300">
                      {dataPt(c.ultima_execucao)}
                      <span className="block text-xs text-zinc-400">
                        {c.n_execucoes > 0
                          ? `${c.n_execucoes} execuç${c.n_execucoes === 1 ? 'ão' : 'ões'}`
                          : 'sem registro'}
                        {c.ultima_origem === 'manual' && ' · data manual'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-zinc-600 tabular-nums dark:text-zinc-300">
                      {dataPt(c.proxima_execucao)}
                      <span className="block text-xs text-zinc-400">{diasTexto(c.dias_restantes)}</span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                      {moeda(c.valor_estimado)}
                      <span className="block text-xs font-normal text-zinc-400">
                        {moeda(c.custo_anual_estimado)}/ano
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge className={META_STATUS[c.status].badge}>{META_STATUS[c.status].rotulo}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
