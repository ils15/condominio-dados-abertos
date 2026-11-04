import { useMemo, useState } from 'react'
import { FileText, ShoppingCart } from 'lucide-react'
import { META_CATEGORIA, badgeCategoria, dados } from '../dados'
import { dataPt, moeda } from '../format'
import { Badge, Card, CampoFiltro, RotuloFiltro, Vazio, cardBase, inputBase } from '../ui'
import { useBusca } from '../Layout'

const parseValor = (v: string): number | null => {
  if (!v) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function Compras() {
  const { consulta } = useBusca()
  const [ano, setAno] = useState('todos')
  const [categoria, setCategoria] = useState('todas')
  const q = consulta.trim().toLowerCase()

  const anos = useMemo(() => [...new Set(dados.compras.map((c) => c.data.slice(0, 4)))].sort().reverse(), [])

  const itens = useMemo(
    () => dados.compras
      .filter((c) => ano === 'todos' || c.data.startsWith(ano))
      .filter((c) => categoria === 'todas' || c.categoria === categoria)
      .filter(
        (c) => !q || `${c.descricao} ${c.fornecedor} ${c.cnpj} ${c.id} ${c.observacoes}`.toLowerCase().includes(q),
      ),
    [ano, categoria, q],
  )

  const total = itens.reduce((s, c) => s + (parseValor(c.valor) ?? 0), 0)
  const t = dados.agregacoes.totais

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Compras e notas fiscais</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Aquisições de materiais e insumos do condomínio — cada compra aponta para a nota fiscal
          correspondente no repositório documental.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${cardBase} flex items-center gap-4 px-5 py-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Compras — 12 meses
            </span>
            <span className="block text-xl font-semibold tabular-nums">{moeda(t.compras_12m)}</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{t.n_compras} no histórico</span>
          </span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            No ano corrente
          </span>
          <span className="block text-xl font-semibold tabular-nums">{moeda(t.compras_ano_atual)}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">materiais e insumos</span>
        </div>
        <div className={`${cardBase} px-5 py-4`}>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Gasto total (manutenção + compras) — 12m
          </span>
          <span className="block text-xl font-semibold tabular-nums">{moeda(t.gasto_12m + t.compras_12m)}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {moeda(t.gasto_12m)} em serviços + {moeda(t.compras_12m)} em materiais
          </span>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoFiltro>
            <RotuloFiltro>Ano</RotuloFiltro>
            <select className={inputBase} value={ano} onChange={(e) => setAno(e.target.value)}>
              <option value="todos">Todos</option>
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Categoria</RotuloFiltro>
            <select className={inputBase} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {dados.categorias.map((c) => (
                <option key={c} value={c}>{META_CATEGORIA[c].rotulo}</option>
              ))}
            </select>
          </CampoFiltro>
        </div>
      </Card>

      <Card
        titulo={`${itens.length} ${itens.length === 1 ? 'compra' : 'compras'}`}
        acao={<span className="text-xs text-zinc-500 dark:text-zinc-400">total: <b className="tabular-nums text-zinc-800 dark:text-zinc-100">{moeda(total)}</b></span>}
      >
        {itens.length === 0 ? (
          <Vazio>Nenhuma compra corresponde aos filtros.</Vazio>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Fornecedor</th>
                  <th className="pb-2 pr-3 font-medium">NF</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {itens.map((c) => (
                  <tr key={c.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-zinc-600 dark:text-zinc-300">
                      {dataPt(c.data)}
                    </td>
                    <td className="max-w-[280px] py-3 pr-3">
                      <p className="text-zinc-800 dark:text-zinc-100">{c.descricao}</p>
                      {c.observacoes && (
                        <p className="mt-0.5 text-xs italic text-zinc-400">{c.observacoes}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge className={badgeCategoria(c.categoria)}>
                        {META_CATEGORIA[c.categoria as keyof typeof META_CATEGORIA].rotulo}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-300">
                      {c.fornecedor}
                      {c.cnpj && <span className="block text-xs text-zinc-400">CNPJ {c.cnpj}</span>}
                    </td>
                    <td className="py-3 pr-3">
                      {c.documento ? (
                        <a href={`./${c.documento}`} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                          <FileText className="h-3 w-3" /> nota fiscal
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                      {moeda(parseValor(c.valor))}
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
