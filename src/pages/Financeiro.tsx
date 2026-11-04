import { useState } from 'react'
import { FileSignature, FileText } from 'lucide-react'
import {
  META_CATEGORIA, META_STATUS_CONTRATO, META_STATUS_ORCAMENTO, badgeCategoria, dados,
} from '../dados'
import { dataPt, mesPt, moeda } from '../format'
import { Badge, Card, Vazio, cardBase, inputBase } from '../ui'
import { useBusca } from '../Layout'

const parseValor = (v: string): number | null => {
  if (!v) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const parseNum = (v: string | number | null | undefined): number =>
  typeof v === 'number' ? v : Number(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0

export default function Financeiro() {
  const { consulta } = useBusca()
  const [statusOrc, setStatusOrc] = useState('todos')
  const q = consulta.trim().toLowerCase()

  const t = dados.agregacoes.totais
  const orcamento = dados.orcamento[dados.orcamento.length - 1]
  const balancetes = [...dados.balancetes].reverse()
  const ultimoBalancete = dados.balancetes[dados.balancetes.length - 1]
  const contratos = dados.contratos
    .filter((c) => !q || `${c.objeto} ${c.prestador_nome} ${c.id}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.vigente) - Number(a.vigente))
  const orcamentos = dados.orcamentos
    .filter((o) => statusOrc === 'todos' || o.status === statusOrc)
    .filter(
      (o) => !q
        || `${o.descricao} ${o.prestador_nome ?? ''} ${o.ativo_nome ?? ''} ${o.cronograma_atividade ?? ''} ${o.id}`
          .toLowerCase().includes(q),
    )
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Transparência financeira</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Contratos vigentes com seus encargos mensais, orçamentos em análise e a trajetória
          orçamento → execução → gasto de cada intervenção.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Contratos vigentes
          </span>
          <span className="block text-xl font-semibold tabular-nums">
            {t.contratos_ativos}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {moeda(t.contratos_mensal_total)}/mês em encargos fixos
          </span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Orçamentos aguardando
          </span>
          <span className="block text-xl font-semibold tabular-nums">{t.orcamentos_aguardando}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {moeda(t.orcamentos_aguardando_total)} em cotação
          </span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Inadimplência {ultimoBalancete ? `(${ultimoBalancete.mes})` : ''}
          </span>
          <span className="block text-xl font-semibold tabular-nums">
            {t.inadimplencia_atual != null ? `${String(t.inadimplencia_atual).replace('.', ',')}%` : '—'}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {ultimoBalancete
              ? `resultado do mês: ${moeda(ultimoBalancete.resultado)}`
              : 'sem balancete registrado'}
          </span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Orçamento {orcamento?.ano ?? ''} executado
          </span>
          <span className="block text-xl font-semibold tabular-nums">
            {orcamento && orcamento.previsto_total
              ? `${(orcamento.realizado_total / orcamento.previsto_total * 100).toFixed(1).replace('.', ',')}%`
              : '—'}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {orcamento ? `${moeda(orcamento.realizado_total)} de ${moeda(orcamento.previsto_total)} previstos` : ''}
          </span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Compras — 12 meses
          </span>
          <span className="block text-xl font-semibold tabular-nums">{moeda(t.compras_12m)}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            materiais e insumos com NF
          </span>
        </div>
      </div>

      {orcamento && (
        <Card
          titulo={`Previsão orçamentária ${orcamento.ano} × realizado`}
          acao={
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              aprovado em assembleia ·{' '}
              <b className="tabular-nums text-zinc-800 dark:text-zinc-100">
                {moeda(orcamento.realizado_total)}
              </b>{' '}
              de <b className="tabular-nums text-zinc-800 dark:text-zinc-100">{moeda(orcamento.previsto_total)}</b>
            </span>
          }
        >
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 text-right font-medium">Previsto</th>
                  <th className="pb-2 pr-3 text-right font-medium">Realizado</th>
                  <th className="pb-2 pr-3 text-right font-medium">Saldo</th>
                  <th className="pb-2 font-medium">Execução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orcamento.itens.map((i) => (
                  <tr key={i.categoria} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-2.5 pr-3">
                      <Badge className={badgeCategoria(i.categoria)}>
                        {META_CATEGORIA[i.categoria as keyof typeof META_CATEGORIA].rotulo}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(i.previsto)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                      {moeda(i.realizado)}
                    </td>
                    <td className={`py-2.5 pr-3 text-right tabular-nums ${
                      i.saldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {moeda(i.saldo)}
                    </td>
                    <td className="w-56 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${i.pct_executado != null && i.pct_executado > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(i.pct_executado ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                          {i.pct_executado != null ? `${String(i.pct_executado).replace('.', ',')}%` : '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {dados.balancetes.length > 0 && (
        <Card titulo="Balancetes mensais">
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Mês</th>
                  <th className="pb-2 pr-3 text-right font-medium">Receita de taxas</th>
                  <th className="pb-2 pr-3 text-right font-medium">Outras receitas</th>
                  <th className="pb-2 pr-3 text-right font-medium">Despesas</th>
                  <th className="pb-2 pr-3 text-right font-medium">Resultado</th>
                  <th className="pb-2 pr-3 text-right font-medium">Fundo de reserva</th>
                  <th className="pb-2 text-right font-medium">Inadimplência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {balancetes.map((b) => (
                  <tr key={b.mes} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-zinc-600 dark:text-zinc-300">
                      {mesPt(b.mes)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(parseNum(b.receita_taxas))}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(parseNum(b.receita_outros))}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(parseNum(b.despesas))}
                    </td>
                    <td className={`py-2.5 pr-3 text-right font-medium tabular-nums ${
                      b.resultado < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {moeda(b.resultado)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(parseNum(b.fundo_reserva))}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <Badge className={parseNum(b.inadimplencia_pct) > 5
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}>
                        {String(parseNum(b.inadimplencia_pct)).replace('.', ',')}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
            Números agregados fornecidos pela administradora — sem qualquer dado por unidade (LGPD).
          </p>
        </Card>
      )}

      <Card titulo={<span className="flex items-center gap-2"><FileSignature className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Contratos de prestação de serviços</span>}>
        {contratos.length === 0 ? (
          <Vazio>Nenhum contrato registrado.</Vazio>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Objeto</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Vigência</th>
                  <th className="pb-2 pr-3 text-right font-medium">Mensalidade</th>
                  <th className="pb-2 pr-3 text-right font-medium">Gasto 12m (prestador)</th>
                  <th className="pb-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {contratos.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="max-w-[280px] py-3 pr-3">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">{c.objeto}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {c.prestador_nome} · {c.id}
                        {c.documento && (
                          <>
                            {' · '}
                            <a href={`./${c.documento}`} target="_blank" rel="noreferrer"
                               className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
                              <FileText className="h-3 w-3" /> contrato
                            </a>
                          </>
                        )}
                      </p>
                      {c.observacoes && (
                        <p className="mt-0.5 text-[11px] italic text-zinc-400">{c.observacoes}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge className={badgeCategoria(c.categoria)}>
                        {META_CATEGORIA[c.categoria as keyof typeof META_CATEGORIA].rotulo}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-zinc-600 dark:text-zinc-300">
                      {dataPt(c.inicio)} → {dataPt(c.fim)}
                      {c.vigente && c.dias_para_fim != null && (
                        <span className="block text-xs text-zinc-400">
                          {c.dias_para_fim > 0
                            ? `termina em ${c.dias_para_fim} ${c.dias_para_fim === 1 ? 'dia' : 'dias'}`
                            : 'vencido — renovar'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                      {moeda(parseValor(c.valor_mensal))}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {moeda(c.gasto_12m_prestador)}
                    </td>
                    <td className="py-3">
                      <Badge className={c.vigente
                        ? META_STATUS_CONTRATO.ativo.badge
                        : META_STATUS_CONTRATO.encerrado.badge}>
                        {c.vigente ? 'Vigente' : c.status === 'ativo' ? 'Vencido' : 'Encerrado'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        titulo={<span className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Orçamentos</span>}
        acao={
          <div className="w-44">
            <select className={inputBase} value={statusOrc} onChange={(e) => setStatusOrc(e.target.value)}>
              <option value="todos">Todos os status</option>
              <option value="aguardando">Aguardando</option>
              <option value="aprovado">Aprovados</option>
              <option value="rejeitado">Rejeitados</option>
            </select>
          </div>
        }
      >
        {orcamentos.length === 0 ? (
          <Vazio>Nenhum orçamento corresponde aos filtros.</Vazio>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {orcamentos.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{o.descricao}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {dataPt(o.data)} · {o.prestador_nome ?? 'concorrente sem cadastro'}
                    {o.cronograma_atividade && ` · plano: ${o.cronograma_atividade}`}
                    {o.ativo_nome && ` · ${o.ativo_nome}`}
                    {o.documento && (
                      <>
                        {' · '}
                        <a href={`./${o.documento}`} target="_blank" rel="noreferrer"
                           className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          proposta
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <Badge className={META_STATUS_ORCAMENTO[o.status].badge}>
                  {META_STATUS_ORCAMENTO[o.status].rotulo}
                </Badge>
                <span className="w-28 text-right text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                  {moeda(parseValor(o.valor))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
