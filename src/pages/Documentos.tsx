import { useState } from 'react'
import { Camera, FileBadge, FileText, Lock } from 'lucide-react'
import {
  BADGE_ADMIN, META_CATEGORIA, META_STATUS_VALIDADE, META_TIPO_DOC, badgeCategoria, dados,
} from '../dados'
import { bytes, dataPt } from '../format'
import { Badge, Card, CampoFiltro, RotuloFiltro, Vazio, inputBase } from '../ui'
import { useBusca } from '../Layout'

const VALIDADES = ['todas', 'vencido', 'vence_breve', 'valido', 'sem_validade'] as const

export default function Documentos() {
  const { consulta } = useBusca()
  const [categoria, setCategoria] = useState('todas')
  const [tipo, setTipo] = useState('todos')
  const [validade, setValidade] = useState<(typeof VALIDADES)[number]>('todas')
  const q = consulta.trim().toLowerCase()

  const filtrados = dados.documentos
    .filter((d) => categoria === 'todas' || d.categoria === categoria)
    .filter((d) => tipo === 'todos' || d.tipo === tipo)
    .filter((d) => validade === 'todas' || d.status_validade === validade)
    .filter(
      (d) => !q
        || `${d.titulo} ${d.prestador_nome ?? ''} ${d.art_rrt} ${d.manutencao_descricao ?? ''} ${d.id}`
          .toLowerCase().includes(q),
    )

  const catsDoc = dados.categorias_doc?.length ? dados.categorias_doc : dados.categorias

  const porCategoria = catsDoc
    .map((c) => ({ categoria: c, itens: filtrados.filter((d) => d.categoria === c) }))
    .filter((g) => g.itens.length > 0)

  const tiposPresentes = [...new Set(dados.documentos.map((d) => d.tipo))]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Documentos</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Repositório técnico e operacional do condomínio — laudos, ordens de serviço, notas fiscais,
          certificados, contratos e relatórios fotográficos, com controle de validade e ART/RRT.
        </p>
        {dados.perfil === 'completo' && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300">
            <Lock className="h-3 w-3" /> Cópia local completa — inclui documentos administrativos que não
            são publicados no site
          </p>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CampoFiltro>
            <RotuloFiltro>Tipo</RotuloFiltro>
            <select className={inputBase} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {tiposPresentes.map((t) => (
                <option key={t} value={t}>{META_TIPO_DOC[t]?.rotulo ?? t}</option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Validade</RotuloFiltro>
            <select className={inputBase} value={validade}
                    onChange={(e) => setValidade(e.target.value as (typeof VALIDADES)[number])}>
              {VALIDADES.map((v) => (
                <option key={v} value={v}>
                  {v === 'todas' ? 'Todas' : META_STATUS_VALIDADE[v].rotulo}
                </option>
              ))}
            </select>
          </CampoFiltro>
          <CampoFiltro>
            <RotuloFiltro>Categoria</RotuloFiltro>
            <select className={inputBase} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {catsDoc.map((c) => (
                <option key={c} value={c}>{META_CATEGORIA[c as keyof typeof META_CATEGORIA].rotulo}</option>
              ))}
            </select>
          </CampoFiltro>
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card><Vazio>Nenhum documento corresponde aos filtros.</Vazio></Card>
      ) : (
        porCategoria.map((g) => (
          <Card key={g.categoria} titulo={`${META_CATEGORIA[g.categoria].rotulo} · ${g.itens.length}`}>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {g.itens.map((d) => (
                <li key={d.id}>
                  <a
                    href={`./${d.arquivo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {d.extensao === 'png' || d.extensao === 'jpg' || d.extensao === 'jpeg'
                        ? <Camera className="h-4 w-4" />
                        : <FileText className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{d.titulo}</span>
                        <Badge className={badgeCategoria(d.categoria)}>
                          {META_CATEGORIA[d.categoria].rotulo}
                        </Badge>
                        <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {META_TIPO_DOC[d.tipo]?.rotulo ?? d.tipo}
                        </Badge>
                        {d.administrativo && (
                          <Badge className={BADGE_ADMIN}><Lock className="mr-1 h-3 w-3" /> administrativo</Badge>
                        )}
                      </span>
                      <span className="mt-1 block flex-wrap text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        emissão {dataPt(d.data_emissao)}
                        {d.validade && (
                          <> · validade {dataPt(d.validade)} <Badge className={`ml-1 ${META_STATUS_VALIDADE[d.status_validade].badge}`}>
                            {META_STATUS_VALIDADE[d.status_validade].rotulo}
                          </Badge></>
                        )}
                        {d.prestador_nome && ` · ${d.prestador_nome}`}
                        {d.manutencao_descricao && ` · vinculado a: ${d.manutencao_descricao}`}
                        {d.contrato_objeto && ` · contrato: ${d.contrato_objeto}`}
                        {` · ${d.extensao.toUpperCase()} ${d.tamanho != null ? bytes(d.tamanho) : ''}`}
                      </span>
                      {d.art_rrt && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                          <FileBadge className="h-3 w-3" /> {d.art_rrt}
                        </span>
                      )}
                      {d.observacoes && (
                        <span className="mt-1 block text-[11px] italic text-zinc-400">{d.observacoes}</span>
                      )}
                    </span>
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
