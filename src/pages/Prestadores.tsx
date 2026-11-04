import { useMemo } from 'react'
import { Mail, PhoneCall, Wrench } from 'lucide-react'
import { META_CATEGORIA, badgeCategoria, dados } from '../dados'
import { moeda } from '../format'
import { Badge, Card, Vazio } from '../ui'
import { useBusca } from '../Layout'

const parseValor = (v: string): number | null => {
  if (!v) return null
  const n = Number(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function Prestadores() {
  const { consulta } = useBusca()
  const q = consulta.trim().toLowerCase()

  const stats = useMemo(() => {
    const mapa = new Map<string, { servicos: number; total: number }>()
    for (const m of dados.manutencoes) {
      const id = m.prestador_id
      if (!id) continue
      const s = mapa.get(id) ?? { servicos: 0, total: 0 }
      s.servicos += 1
      s.total += parseValor(m.valor) ?? 0
      mapa.set(id, s)
    }
    return mapa
  }, [])

  const itens = dados.prestadores.filter(
    (p) => !q || `${p.nome} ${p.especialidades} ${p.cnpj} ${p.contato}`.toLowerCase().includes(q),
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Prestadores de serviços</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Empresas que atuam ou atuaram no edifício, com histórico de serviços e valores contratados.
        </p>
      </div>

      {itens.length === 0 ? (
        <Card><Vazio>Nenhum prestador encontrado.</Vazio></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {itens.map((p) => {
            const s = stats.get(p.id)
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{p.nome}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">CNPJ {p.cnpj || '—'} · {p.id}</p>
                  </div>
                  <Badge className={badgeCategoria(p.categoria)}>
                    {META_CATEGORIA[p.categoria as keyof typeof META_CATEGORIA]?.rotulo ?? String(p.categoria)}
                  </Badge>
                </div>

                <p className="mt-3 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  {p.especialidades || '—'}
                </p>
                {p.contato && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.contato}</span>
                  </p>
                )}

                <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <b className="text-zinc-800 tabular-nums dark:text-zinc-100">{s?.servicos ?? 0}</b> serviços
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    <b className="text-zinc-800 tabular-nums dark:text-zinc-100">{moeda(s?.total ?? 0)}</b> no histórico
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {dados.condominio.aviso && (
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <PhoneCall className="h-3 w-3" /> Dados de contato dos prestadores são públicos (pessoa jurídica);
          nunca inclua dados pessoais de funcionários (LGPD).
        </p>
      )}
    </div>
  )
}
