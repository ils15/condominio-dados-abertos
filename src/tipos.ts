/** Tipos espelhando a saída de scripts/gerar_dados.py (public/data.js) */

export type Categoria = 'hidraulica' | 'eletrica' | 'mecanica' | 'estrutural' | 'servicos'
export type Criticidade = 'alta' | 'media' | 'baixa'
export type TipoManutencao = 'preventiva' | 'corretiva' | 'inspecao'
export type StatusCronograma = 'atrasado' | 'vence_breve' | 'em_dia' | 'a_programar'

export interface Ativo {
  id: string
  categoria: Categoria
  nome: string
  local: string
  descricao: string
  criticidade: Criticidade
}

export interface Prestador {
  id: string
  nome: string
  cnpj: string
  contato: string
  especialidades: string
  categoria: Categoria | string
}

export interface ItemCronograma {
  id: string
  ativo_id: string
  atividade: string
  tipo: 'preventiva' | 'inspecao'
  periodicidade_meses: string
  prestador_id: string
  valor_referencia: string
  ultima_execucao: string
  observacoes: string
  // derivados (calculados pelo gerador)
  ativo_nome: string
  categoria: Categoria
  prestador_nome: string | null
  n_execucoes: number
  ultima_origem: 'manual' | 'historico'
  ultimo_valor: number | null
  valor_estimado: number | null
  custo_anual_estimado: number | null
  proxima_execucao: string | null
  dias_restantes: number | null
  status: StatusCronograma
}

export interface Manutencao {
  id: string
  data: string
  ativo_id: string
  cronograma_id: string
  tipo: TipoManutencao
  descricao: string
  prestador_id: string
  valor: string
  documento: string
  responsavel: string
  // derivados
  categoria: Categoria
  ativo_nome: string
  prestador_nome: string | null
}

export interface Documento {
  categoria: Categoria
  titulo: string
  arquivo: string
  tamanho: number
}

export interface Agregacoes {
  por_categoria_12m: { categoria: Categoria; total: number }[]
  por_mes: { mes: string; total: number; corretivas: number }[]
  totais: {
    gasto_12m: number
    gasto_ano_atual: number
    gasto_total: number
    n_manutencoes: number
    n_manutencoes_12m: number
    corretivas_12m: number
    atrasadas: number
    vencendo_30d: number
    custo_anual_estimado: number
    n_ativos: number
    n_documentos: number
  }
}

export interface Dados {
  gerado_em: string
  hoje: string
  condominio: { nome: string; aviso: string }
  categorias: Categoria[]
  ativos: Ativo[]
  prestadores: Prestador[]
  cronograma: ItemCronograma[]
  manutencoes: Manutencao[]
  documentos: Documento[]
  agregacoes: Agregacoes
}
