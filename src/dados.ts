import type { CategoriaDoc, Dados, StatusCronograma } from './tipos'

declare global {
  interface Window {
    __DATA__?: Dados
  }
}

const vazio: Dados = {
  gerado_em: '',
  hoje: new Date().toISOString().slice(0, 10),
  perfil: 'publico',
  condominio: { nome: 'Condomínio', aviso: '' },
  categorias: [],
  categorias_doc: [],
  ativos: [],
  prestadores: [],
  cronograma: [],
  manutencoes: [],
  documentos: [],
  contratos: [],
  orcamentos: [],
  orcamento: [],
  balancetes: [],
  assembleias: [],
  consumo: [],
  agregacoes: {
    por_categoria_12m: [],
    por_mes: [],
    totais: {
      gasto_12m: 0, gasto_ano_atual: 0, gasto_total: 0, n_manutencoes: 0, n_manutencoes_12m: 0,
      corretivas_12m: 0, atrasadas: 0, vencendo_30d: 0, custo_anual_estimado: 0, n_ativos: 0,
      n_documentos: 0, docs_vencidos: 0, docs_vencendo: 0, contratos_ativos: 0,
      contratos_mensal_total: 0, orcamentos_aguardando: 0, orcamentos_aguardando_total: 0,
      inadimplencia_atual: null, proxima_assembleia: null,
    },
  },
}

export const dados: Dados = window.__DATA__ ?? vazio

if (!window.__DATA__) {
  console.error('data.js não carregou — rode "python3 scripts/gerar_dados.py" antes de abrir o site.')
}

/** Metadados visuais por categoria (cor do gráfico + classes de badge). */
export const META_CATEGORIA: Record<CategoriaDoc, { rotulo: string; cor: string; badge: string }> = {
  hidraulica: {
    rotulo: 'Hidráulica',
    cor: '#0ea5e9',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  },
  eletrica: {
    rotulo: 'Elétrica',
    cor: '#f59e0b',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  mecanica: {
    rotulo: 'Mecânica',
    cor: '#8b5cf6',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  },
  estrutural: {
    rotulo: 'Estrutural',
    cor: '#78716c',
    badge: 'bg-stone-200 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300',
  },
  servicos: {
    rotulo: 'Serviços',
    cor: '#10b981',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  assembleias: {
    rotulo: 'Assembleias',
    cor: '#6366f1',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
}

export const rotuloCategoria = (c: string): string =>
  META_CATEGORIA[c as CategoriaDoc]?.rotulo ?? c
export const badgeCategoria = (c: string): string =>
  META_CATEGORIA[c as CategoriaDoc]?.badge ?? ''

export const META_STATUS: Record<StatusCronograma, { rotulo: string; badge: string }> = {
  atrasado: {
    rotulo: 'Atrasado',
    badge: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
  vence_breve: {
    rotulo: 'Vence em breve',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  em_dia: {
    rotulo: 'Em dia',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  a_programar: {
    rotulo: 'A programar',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-300',
  },
}

export const META_TIPO: Record<string, { rotulo: string; badge: string }> = {
  preventiva: {
    rotulo: 'Preventiva',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  inspecao: {
    rotulo: 'Inspeção',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
  corretiva: {
    rotulo: 'Corretiva',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  },
}

export const META_TIPO_DOC: Record<string, { rotulo: string }> = {
  relatorio: { rotulo: 'Relatório' },
  ordem_servico: { rotulo: 'Ordem de serviço' },
  nota_fiscal: { rotulo: 'Nota fiscal' },
  contrato: { rotulo: 'Contrato' },
  certificado: { rotulo: 'Certificado' },
  relatorio_fotografico: { rotulo: 'Rel. fotográfico' },
  laudo: { rotulo: 'Laudo' },
  parecer: { rotulo: 'Parecer' },
  art: { rotulo: 'ART/RRT' },
  ata: { rotulo: 'Ata' },
  convocacao: { rotulo: 'Convocação' },
}

export const META_ASSEMBLEIA: Record<string, { rotulo: string; badge: string }> = {
  ordinaria: {
    rotulo: 'Ordinária',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  extraordinaria: {
    rotulo: 'Extraordinária',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  },
}

export const META_STATUS_VALIDADE: Record<string, { rotulo: string; badge: string }> = {
  vencido: {
    rotulo: 'Vencido',
    badge: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
  vence_breve: {
    rotulo: 'Vence em breve',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  valido: {
    rotulo: 'Válido',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  sem_validade: {
    rotulo: 'Sem validade',
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

export const META_STATUS_CONTRATO: Record<string, { rotulo: string; badge: string }> = {
  ativo: {
    rotulo: 'Ativo',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  encerrado: {
    rotulo: 'Encerrado',
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

export const META_STATUS_ORCAMENTO: Record<string, { rotulo: string; badge: string }> = {
  aguardando: {
    rotulo: 'Aguardando',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  aprovado: {
    rotulo: 'Aprovado',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  rejeitado: {
    rotulo: 'Rejeitado',
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
}

/** Badge para itens administrativos (só existem na cópia local completa). */
export const BADGE_ADMIN =
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300'
