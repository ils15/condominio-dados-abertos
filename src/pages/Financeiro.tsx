import { useState } from 'react'
import { FileSignature, FileText } from 'lucide-react'
import {
  META_CATEGORIA, META_STATUS_CONTRATO, META_STATUS_ORCAMENTO, badgeCategoria, dados,
} from '../dados'
import { dataPt, moeda } from '../format'
import { Badge, Card, Vazio, cardBase, inputBase } from '../ui'
import { useBusca } from '../Layout'

const parseValor = (v: string): number | null => {
  if (!v) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function Financeiro() {
  const { consulta } = useBusca()
  const [statusOrc, setStatusOrc] = useState('todos')
  const q = consulta.trim().toLowerCase()

  const t = dados.agregacoes.totais
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
  const aprovados = dados.orcamentos.filter((o) => o.status === 'aprovado')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Transparência financeira</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Contratos vigentes com seus encargos mensais, orçamentos em análise e a trajetória
          orçamento → execução → gasto de cada intervenção.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            Orçamentos aprovados (histórico)
          </span>
          <span className="block text-xl font-semibold tabular-nums">{aprovados.length}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {moeda(aprovados.reduce((s, o) => s + (parseValor(o.valor) ?? 0), 0))} contratados
          </span>
        </div>
      </div>

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
