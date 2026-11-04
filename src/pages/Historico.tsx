import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { META_CATEGORIA, META_TIPO, badgeCategoria, dados } from '../dados'
import { dataPt, moeda } from '../format'
import { Badge, Card, CampoFiltro, RotuloFiltro, Vazio, inputBase } from '../ui'
import { useBusca } from '../Layout'

const parseValor = (v: string): number | null => {
  if (!v) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function Historico() {
  const { consulta } = useBusca()
  const [ano, setAno] = useState('todos')
  const [categoria, setCategoria] = useState('todas')
  const [tipo, setTipo] = useState('todos')

  const anos = useMemo(
    () => [...new Set(dados.manutencoes.map((m) => m.data.slice(0, 4)))].sort().reverse(),
    [],
  )

  const itens = useMemo(() => {
    const q = consulta.trim().toLowerCase()
    return dados.manutencoes
      .filter((m) => ano === 'todos' || m.data.startsWith(ano))
      .filter((m) => categoria === 'todas' || m.categoria === categoria)
      .filter((m) => tipo === 'todos' || m.tipo === tipo)
      .filter(
        (m) => !q
          || `${m.descricao} ${m.ativo_nome} ${m.prestador_nome ?? ''} ${m.id} ${m.responsavel}`
            .toLowerCase().includes(q),
      )
  }, [consulta, ano, categoria, tipo])

  const total = itens.reduce((s, m) => s + (parseValor(m.valor) ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Histórico de manutenções</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Tudo o que foi executado no edifício — preventivas, inspeções e corretivas, com valores e
          respectivos documentos.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <option key={c} value={c}>{META_CATEGORIA[c as keyof typeof META_CATEGORIA].rotulo}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Tipo</RotuloFiltro>
            <select className={inputBase} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {Object.entries(META_TIPO).map(([v, m]) => (
                <option key={v} value={v}>{m.rotulo}</option>
              ))}
            </select>
          </CampoFiltro>
        </div>
      </Card>

      <Card
        titulo={`${itens.length} ${itens.length === 1 ? 'lançamento' : 'lançamentos'}`}
        acao={<span className="text-xs text-zinc-500 dark:text-zinc-400">total: <b className="tabular-nums text-zinc-800 dark:text-zinc-100">{moeda(total)}</b></span>}
      >
        {itens.length === 0 ? (
          <Vazio>Nenhuma manutenção corresponde aos filtros.</Vazio>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Descrição</th>
                  <th className="pb-2 pr-3 font-medium">Ativo</th>
                  <th className="pb-2 pr-3 font-medium">Categoria</th>
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium">Prestador</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {itens.map((m) => (
                  <tr key={m.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="whitespace-nowrap py-3 pr-3 tabular-nums text-zinc-600 dark:text-zinc-300">
                      {dataPt(m.data)}
                    </td>
                    <td className="max-w-[300px] py-3 pr-3">
                      <p className="text-zinc-800 dark:text-zinc-100">{m.descricao}</p>
                      {m.documento && (
                        <a
                          href={`./${m.documento}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <FileText className="h-3 w-3" /> ver documento
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-300">{m.ativo_nome}</td>
                    <td className="py-3 pr-3">
                      <Badge className={badgeCategoria(m.categoria)}>
                        {META_CATEGORIA[m.categoria as keyof typeof META_CATEGORIA].rotulo}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge className={META_TIPO[m.tipo].badge}>{META_TIPO[m.tipo].rotulo}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-zinc-600 dark:text-zinc-300">{m.prestador_nome ?? '—'}</td>
                    <td className="whitespace-nowrap py-3 text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                      {moeda(parseValor(m.valor))}
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
