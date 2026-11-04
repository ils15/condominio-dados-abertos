import { Link } from 'react-router-dom'
import { CalendarDays, FileText, Users } from 'lucide-react'
import { META_ASSEMBLEIA, dados } from '../dados'
import { dataPt, diasTexto } from '../format'
import { Badge, Card, Vazio } from '../ui'
import { useBusca } from '../Layout'

export default function Assembleias() {
  const { consulta } = useBusca()
  const q = consulta.trim().toLowerCase()

  const itens = dados.assembleias.filter(
    (a) => !q || `${a.pauta} ${a.tipo} ${a.id} ${a.observacoes}`.toLowerCase().includes(q),
  )
  const proxima = itens.find((a) => a.futura)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Assembleias</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Convocações, atas e quórum das assembleias gerais — a história das decisões do
          condomínio, aberta a qualquer morador (art. 1.348 do Código Civil).
        </p>
      </div>

      {proxima && (
        <Link
          to={`/documentos`}
          className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/15"
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            Próxima assembleia: <b>{dataPt(proxima.data)}</b> ({diasTexto(
              Math.round((new Date(proxima.data).getTime() - new Date(dados.hoje).getTime()) / 86400000),
            )}) — {proxima.pauta.split(';')[0]} · <u>ver convocação</u>
          </span>
        </Link>
      )}

      {itens.length === 0 ? (
        <Card><Vazio>Nenhuma assembleia registrada.</Vazio></Card>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-zinc-200 pl-6 dark:border-zinc-800">
          {itens.map((a) => (
            <li key={a.id} className="relative">
              <span
                className={`absolute -left-[31px] top-4 h-2.5 w-2.5 rounded-full ring-4 ${
                  a.futura
                    ? 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-500/20'
                    : 'bg-zinc-300 ring-zinc-100 dark:bg-zinc-600 dark:ring-zinc-900'
                }`}
              />
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={META_ASSEMBLEIA[a.tipo]?.badge ?? ''}>
                        {META_ASSEMBLEIA[a.tipo]?.rotulo ?? a.tipo}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {dataPt(a.data)}
                      </span>
                      {a.futura && (
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                          agendada
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{a.pauta}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <Users className="h-3.5 w-3.5" />
                      {a.futura
                        ? `${a.unidades} unidades convocadas`
                        : a.quorum_pct != null
                          ? `${a.presentes} de ${a.unidades} unidades presentes (quórum ${String(a.quorum_pct).replace('.', ',')}%)`
                          : 'quórum não registrado'}
                    </p>
                    {a.observacoes && (
                      <p className="mt-1 text-[11px] italic text-zinc-400">{a.observacoes}</p>
                    )}
                  </div>
                  {a.documento && (
                    <a
                      href={`./${a.documento}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {a.futura ? 'Convocação' : 'Ata em PDF'}
                    </a>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
