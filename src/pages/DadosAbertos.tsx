import { Database, Download, FileJson, FileSpreadsheet, GitBranch, Scale } from 'lucide-react'
import { dados } from '../dados'
import { dataPt } from '../format'
import { Card } from '../ui'

const RECURSOS = [
  {
    nome: 'ativos',
    titulo: 'Ativos e sistemas do edifício',
    descricao: 'Equipamentos e sistemas sob manutenção (elevadores, bombas, quadros, laje…), com local e criticidade.',
  },
  {
    nome: 'cronograma',
    titulo: 'Cronograma de manutenção preventiva',
    descricao: 'Plano preventivo com periodicidade, prestador sugerido e valor de referência. A versão SQLite já traz as colunas calculadas (próxima execução, valor estimado, situação).',
  },
  {
    nome: 'manutencoes',
    titulo: 'Histórico de manutenções',
    descricao: 'Todas as execuções registradas: data, tipo, valor, prestador, responsável e documento vinculado.',
  },
  {
    nome: 'prestadores',
    titulo: 'Prestadores de serviços',
    descricao: 'Empresas contratadas com CNPJ, contato e especialidades.',
  },
  {
    nome: 'documentos',
    titulo: 'Repositório documental (metadados)',
    descricao: 'Laudos, ordens de serviço, notas fiscais, certificados e relatórios fotográficos com data de emissão, validade, ART/RRT e prestador vinculado.',
  },
  {
    nome: 'contratos',
    titulo: 'Contratos de prestação de serviços',
    descricao: 'Vigência, mensalidade e situação de cada contrato do condomínio.',
  },
  {
    nome: 'orcamentos',
    titulo: 'Orçamentos',
    descricao: 'Cotações recebidas com status (aguardando/aprovado/rejeitado) e vínculo com o plano de manutenção.',
  },
  {
    nome: 'orcamento_anual',
    titulo: 'Previsão orçamentária anual',
    descricao: 'Valores previstos por categoria, aprovados em assembleia — compare com o histórico para ver o executado.',
  },
  {
    nome: 'balancetes',
    titulo: 'Balancetes mensais e inadimplência',
    descricao: 'Receitas, despesas, fundo de reserva e taxa de inadimplência agregada por mês (sem dados por unidade — LGPD).',
  },
  {
    nome: 'assembleias',
    titulo: 'Assembleias',
    descricao: 'Convocações e atas com pauta e quórum de cada assembleia geral.',
  },
  {
    nome: 'consumo',
    titulo: 'Consumo de água e energia',
    descricao: 'Consumo mensal das áreas comuns (m³ e kWh) com os respectivos custos.',
  },
] as const

export default function DadosAbertos() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dados abertos</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Todos os conjuntos de dados do portal, em formatos abertos, para download e reuso. A mesma
          base alimenta este site — atualizada em {dataPt(dados.gerado_em.slice(0, 10))}.
        </p>
      </div>

      <Card titulo={<span className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Conjuntos de dados</span>}>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {RECURSOS.map((r) => (
            <li key={r.nome} className="flex flex-wrap items-start gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{r.titulo}</h3>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{r.descricao}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <DownloadRecurso icone={FileSpreadsheet} rotulo="CSV" arquivo={`dados/${r.nome}.csv`} />
                <DownloadRecurso icone={FileJson} rotulo="JSON" arquivo={`dados/${r.nome}.json`} />
              </div>
            </li>
          ))}
          <li className="flex flex-wrap items-start gap-x-6 gap-y-2 py-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Base completa (SQLite)</h3>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                As quatro tabelas num único banco, já com as colunas calculadas do cronograma — para
                quem quer fazer consultas SQL.
              </p>
            </div>
            <DownloadRecurso icone={Database} rotulo="SQLite" arquivo="dados/condominio.sqlite" />
          </li>
          <li className="flex flex-wrap items-start gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Metadados (datapackage.json)</h3>
              <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Descrição dos conjuntos no formato Frictionless Data — mesmos conceitos usados por
                portais como o dados.gov.br.
              </p>
            </div>
            <DownloadRecurso icone={FileJson} rotulo="datapackage" arquivo="dados/datapackage.json" />
          </li>
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card titulo="Divulgue o portal aos moradores">
          <div className="flex flex-wrap items-center gap-5">
            <img
              src="./qr-code.svg"
              alt="QR code do portal"
              className="h-36 w-36 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700"
            />
            <div className="min-w-0 text-sm text-zinc-600 dark:text-zinc-300">
              <p className="leading-relaxed">
                Aponte a câmera do celular ou imprima este QR no quadro de avisos ou elevador.
                O portal também pode ser <b>instalado como app</b>: no navegador do celular,
                use “Adicionar à tela de início”.
              </p>
              <p className="mt-2 rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                ils15.github.io/condominio-dados-abertos
              </p>
            </div>
          </div>
        </Card>
        <Card titulo={<span className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Como os dados são atualizados</span>}>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>Os arquivos <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">dados/*.csv</code> são a fonte da verdade — editáveis em Excel/LibreOffice ou direto no GitHub.</li>
            <li>A cada alteração, o script <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">scripts/gerar_dados.py</code> valida os dados, recalcula o cronograma e regenera este portal.</li>
            <li>No GitHub isso acontece automaticamente (GitHub Action) a cada alteração — a síndica só edita o CSV.</li>
          </ol>
        </Card>
        <Card titulo={<span className="flex items-center gap-2"><Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Licença e conformidade</span>}>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li><b>Licença:</b> CC BY 4.0 — pode reutilizar com atribuição ao condomínio.</li>
            <li><b>Norma:</b> o cronograma segue os conceitos da ABNT NBR 5674 (gestão de manutenção de edificações); inspeções conforme NBR 16747.</li>
            <li><b>LGPD:</b> não há dados pessoais nos conjuntos — apenas pessoas jurídicas (CNPJ) e valores de serviços.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function DownloadRecurso({ icone: Icone, rotulo, arquivo }: {
  icone: typeof FileJson; rotulo: string; arquivo: string
}) {
  return (
    <a
      href={`./${arquivo}`}
      download
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-400"
    >
      <Icone className="h-3.5 w-3.5" />
      <Download className="h-3 w-3 opacity-60" />
      {rotulo}
    </a>
  )
}
