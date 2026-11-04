import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, ArrowRight, CalendarClock, Calculator, CircleDollarSign, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { META_CATEGORIA, META_STATUS, badgeCategoria, dados } from '../dados'
import { diasTexto, mesCurto, moeda, moedaCurta, dataPt } from '../format'
import type { ConsumoRow } from '../tipos'
import { Badge, Card, Vazio, cardBase } from '../ui'
import { useBusca } from '../Layout'

function Kpi({ icone, rotulo, valor, sub, destaque }: {
  icone: ReactNode; rotulo: string; valor: string; sub?: string; destaque?: 'alerta'
}) {
  return (
    <div className={`${cardBase} flex items-center gap-4 px-5 py-4`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          destaque === 'alerta'
            ? 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-400'
            : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
        }`}
      >
        {icone}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {rotulo}
        </span>
        <span className="block truncate text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {valor}
        </span>
        {sub && <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>}
      </span>
    </div>
  )
}

function TooltipGrafico({ ativo, rotulo, valor, extra }: {
  ativo?: string | number; rotulo: string; valor: string; extra?: string
}) {
  if (ativo == null) return null
  return (
    <div className={`${cardBase} px-3 py-2 text-xs shadow-lg`}>
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{rotulo}</p>
      <p className="tabular-nums text-zinc-600 dark:text-zinc-300">{valor}</p>
      {extra && <p className="text-zinc-500 dark:text-zinc-400">{extra}</p>}
    </div>
  )
}

export default function Painel() {
  const { consulta } = useBusca()
  const t = dados.agregacoes.totais
  const donut = dados.agregacoes.por_categoria_12m
    .filter((c) => c.total > 0)
    .map((c) => ({ ...c, nome: META_CATEGORIA[c.categoria].rotulo }))
  const barras = dados.agregacoes.por_mes.map((m) => ({ ...m, rotulo: mesCurto(m.mes) }))
  const totalDonut = donut.reduce((s, c) => s + c.total, 0)

  const proximas = dados.cronograma
    .filter((c) => c.proxima_execucao && c.status !== 'atrasado')
    .filter((c) => !consulta || `${c.atividade} ${c.ativo_nome} ${c.id}`.toLowerCase().includes(consulta.toLowerCase()))
    .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0))
    .slice(0, 8)

  const atrasadas = dados.cronograma
    .filter((c) => c.status === 'atrasado')
    .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0))

  const docsVencidos = dados.documentos.filter((d) => d.status_validade === 'vencido')
  const docsVencendo = dados.documentos.filter((d) => d.status_validade === 'vence_breve')

  return (
    <div className="flex flex-col gap-5">
      {!consulta && (docsVencidos.length > 0 || docsVencendo.length > 0) && (
        <Link
          to="/documentos"
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
            docsVencidos.length > 0
              ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15'
              : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {docsVencidos.length > 0 ? (
              <>
                <b>{docsVencidos.length} documento{docsVencidos.length > 1 ? 's' : ''} com validade vencida</b>
                {' '}({docsVencidos.map((d) => d.titulo.split('—')[0].trim()).slice(0, 2).join(', ')}
                {docsVencidos.length > 2 ? '…' : ''})
              </>
            ) : (
              <b>{docsVencendo.length} documento(s) vencendo em até 90 dias</b>
            )}
            {docsVencidos.length > 0 && docsVencendo.length > 0 && ` e ${docsVencendo.length} vencendo em breve`}
            {' '}— ver em Documentos
          </span>
        </Link>
      )}

      {consulta ? (
        <Card titulo={`Próximas manutenções que batem com “${consulta}”`}>
          {proximas.length === 0 ? (
            <Vazio>Nenhuma próxima manutenção encontrada com esse termo.</Vazio>
          ) : (
            <ListaProximas itens={proximas} />
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icone={<CircleDollarSign className="h-5 w-5" />}
              rotulo="Gasto — últimos 12 meses"
              valor={moedaCurta(t.gasto_12m)}
              sub={`${t.n_manutencoes_12m} manutenções registradas`}
            />
            <Kpi
              icone={<Wrench className="h-5 w-5" />}
              rotulo="Corretivas — 12 meses"
              valor={String(t.corretivas_12m)}
              sub="não planejadas (ideal: zero)"
            />
            <Kpi
              icone={<AlertTriangle className="h-5 w-5" />}
              rotulo="Manutenções atrasadas"
              valor={String(t.atrasadas)}
              sub={`${t.vencendo_30d} vencendo em até 30 dias`}
              destaque={t.atrasadas > 0 ? 'alerta' : undefined}
            />
            <Kpi
              icone={<Calculator className="h-5 w-5" />}
              rotulo="Custo anual estimado"
              valor={moedaCurta(t.custo_anual_estimado)}
              sub="plano preventivo completo"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card titulo="Gastos por categoria — 12 meses" className="lg:col-span-2">
              <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="total" nameKey="nome" innerRadius="62%" outerRadius="88%"
                        paddingAngle={2} strokeWidth={0}>
                      {donut.map((c) => (
                        <Cell key={c.categoria} fill={META_CATEGORIA[c.categoria].cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        payload?.[0] ? (
                          <TooltipGrafico
                            ativo={active ? 1 : undefined}
                            rotulo={String(payload[0].name ?? '')}
                            valor={moeda(Number(payload[0].value))}
                          />
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">total</span>
                  <span className="text-lg font-semibold tabular-nums">{moedaCurta(totalDonut)}</span>
                </div>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {donut.map((c) => (
                  <li key={c.categoria} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: META_CATEGORIA[c.categoria].cor }} />
                    {c.nome}
                    <span className="ml-auto tabular-nums text-zinc-400">{moedaCurta(c.total)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card titulo="Gastos por mês — últimos 12 meses" className="lg:col-span-3">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barras} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                    <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: '#a1a1aa' }}
                           tickFormatter={(v: number) => moedaCurta(v)} />
                    <Tooltip
                      cursor={{ fill: 'currentColor', className: 'text-zinc-100 dark:text-zinc-800' }}
                      content={({ active, payload }) => {
                        const p = payload?.[0]?.payload as (typeof barras)[number] | undefined
                        return p && active ? (
                          <TooltipGrafico
                            ativo={1}
                            rotulo={p.rotulo}
                            valor={moeda(p.total)}
                            extra={`${p.corretivas} corretiva${p.corretivas === 1 ? '' : 's'}`}
                          />
                        ) : null
                      }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={42}>
                      {barras.map((m) => (
                        <Cell key={m.mes} fill={m.corretivas > 0 ? '#f97316' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Barras <span className="text-orange-500">laranja</span> = meses com corretivas.
              </p>
            </Card>
          </div>

          {dados.consumo.length > 1 && (
            <Card titulo="Consumo das áreas comuns — últimos 12 meses">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <GraficoConsumo
                  rotulo="Água (m³)"
                  cor="#0ea5e9"
                  dados={dados.consumo.map((c: ConsumoRow) => ({ rotulo: mesCurto(c.mes), valor: Number(c.agua_m3.replace(',', '.')) }))}
                />
                <GraficoConsumo
                  rotulo="Energia (kWh)"
                  cor="#f59e0b"
                  dados={dados.consumo.map((c: ConsumoRow) => ({ rotulo: mesCurto(c.mes), valor: Number(c.energia_kwh.replace(',', '.')) }))}
                />
              </div>
            </Card>
          )}

          {atrasadas.length > 0 && (
            <Card
              titulo={
                <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" /> Manutenções atrasadas ({atrasadas.length})
                </span>
              }
            >
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {atrasadas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{c.atividade}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {c.ativo_nome} · vencia {dataPt(c.proxima_execucao)} · {diasTexto(c.dias_restantes)}
                      </p>
                    </div>
                    <Badge className={badgeCategoria(c.categoria)}>
                      {META_CATEGORIA[c.categoria].rotulo}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
                      {moeda(c.valor_estimado)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            titulo="Próximas manutenções"
            acao={
              <Link to="/cronograma" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                Ver cronograma completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {proximas.length === 0 ? (
              <Vazio>Nenhuma manutenção programada.</Vazio>
            ) : (
              <ListaProximas itens={proximas} />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function ListaProximas({ itens }: { itens: typeof dados.cronograma }) {  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {itens.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{c.atividade}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {c.ativo_nome} · {dataPt(c.proxima_execucao)} ({diasTexto(c.dias_restantes)})
            </p>
          </div>
          <Badge className={badgeCategoria(c.categoria)}>{META_CATEGORIA[c.categoria].rotulo}</Badge>
          <Badge className={META_STATUS[c.status].badge}>{META_STATUS[c.status].rotulo}</Badge>
          <span className="w-24 text-right text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
            {moeda(c.valor_estimado)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function GraficoConsumo({ rotulo, cor, dados: linhas }: {
  rotulo: string; cor: string; dados: { rotulo: string; valor: number }[]
}) {
  const primeiro = linhas[0]?.valor ?? 0
  const ultimo = linhas[linhas.length - 1]?.valor ?? 0
  const variacao = primeiro ? ((ultimo - primeiro) / primeiro) * 100 : 0
  return (
    <div>
      <p className="mb-1 flex items-baseline gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {rotulo}
        <span className={`tabular-nums font-medium ${variacao <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {variacao > 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(0).replace('.', ',')}% no período
        </span>
      </p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
            <Tooltip
              content={({ active, payload }) => {
                const p = payload?.[0]
                return p && active ? (
                  <TooltipGrafico ativo={1} rotulo={String(p.payload.rotulo)} valor={`${Number(p.value).toLocaleString('pt-BR')} ${rotulo.includes('Água') ? 'm³' : 'kWh'}`} />
                ) : null
              }}
            />
            <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
