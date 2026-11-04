import { useState } from 'react'
import { FileText } from 'lucide-react'
import { META_CATEGORIA, badgeCategoria, dados } from '../dados'
import { bytes } from '../format'
import { Badge, Card, Vazio } from '../ui'
import { useBusca } from '../Layout'

export default function Documentos() {
  const { consulta } = useBusca()
  const [categoria, setCategoria] = useState('todas')
  const q = consulta.trim().toLowerCase()

  const porCategoria = dados.categorias
    .map((c) => ({
      categoria: c,
      itens: dados.documentos.filter(
        (d) => d.categoria === c
          && (categoria === 'todas' || d.categoria === categoria)
          && (!q || d.titulo.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.itens.length > 0)

  const total = porCategoria.reduce((s, g) => s + g.itens.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Documentos</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Relatórios, ordens de serviço, notas fiscais, laudos e contratos — organizados por categoria
          da manutenção.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <BotaoCategoria ativo={categoria === 'todas'} onClick={() => setCategoria('todas')}>
          Todas ({dados.documentos.length})
        </BotaoCategoria>
        {dados.categorias.map((c) => {
          const n = dados.documentos.filter((d) => d.categoria === c).length
          if (n === 0) return null
          return (
            <BotaoCategoria key={c} ativo={categoria === c} onClick={() => setCategoria(c)}>
              {META_CATEGORIA[c].rotulo} ({n})
            </BotaoCategoria>
          )
        })}
      </div>

      {total === 0 ? (
        <Card><Vazio>Nenhum documento encontrado.</Vazio></Card>
      ) : (
        porCategoria.map((g) => (
          <Card key={g.categoria} titulo={`${META_CATEGORIA[g.categoria].rotulo} · ${g.itens.length}`}>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {g.itens.map((d) => (
                <li key={d.arquivo}>
                  <a
                    href={`./${d.arquivo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {d.titulo}
                      </span>
                      <span className="block text-xs text-zinc-400">PDF · {bytes(d.tamanho)}</span>
                    </span>
                    <Badge className={badgeCategoria(d.categoria)}>
                      {META_CATEGORIA[d.categoria].rotulo}
                    </Badge>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  )
}

function BotaoCategoria({ ativo, onClick, children }: {
  ativo: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        ativo
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}
