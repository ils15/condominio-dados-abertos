/** Tipos espelhando a saída de scripts/gerar_dados.py (public/data.js) */

export type Categoria = 'hidraulica' | 'eletrica' | 'mecanica' | 'estrutural' | 'servicos'
export type Criticidade = 'alta' | 'media' | 'baixa'
export type TipoManutencao = 'preventiva' | 'corretiva' | 'inspecao'
export type StatusCronograma = 'atrasado' | 'vence_breve' | 'em_dia' | 'a_programar'
export type TipoDocumento =
  | 'relatorio' | 'ordem_servico' | 'nota_fiscal' | 'contrato' | 'certificado'
  | 'relatorio_fotografico' | 'laudo' | 'parecer' | 'art'
export type StatusValidade = 'vencido' | 'vence_breve' | 'valido' | 'sem_validade'

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
  orcamento_id: string
  responsavel: string
  // derivados
  categoria: Categoria
  ativo_nome: string
  prestador_nome: string | null
}

export interface Documento {
  id: string
  titulo: string
  categoria: Categoria
  arquivo: string
  tipo: TipoDocumento
  data_emissao: string
  validade: string
  prestador_id: string
  art_rrt: string
  manutencao_id: string
  visibilidade: 'publico' | 'administrativo'
  observacoes: string
  // derivados
  status_validade: StatusValidade
  prestador_nome: string | null
  manutencao_descricao: string | null
  administrativo: boolean
  tamanho: number | null
  extensao: string
}

export interface Contrato {
  id: string
  prestador_id: string
  objeto: string
  categoria: Categoria
  inicio: string
  fim: string
  valor_mensal: string
  status: 'ativo' | 'encerrado'
  documento: string
  observacoes: string
  // derivados
  prestador_nome: string
  vigente: boolean
  dias_para_fim: number | null
  gasto_12m_prestador: number
}

export interface Orcamento {
  id: string
  data: string
  descricao: string
  ativo_id: string
  cronograma_id: string
  prestador_id: string
  valor: string
  status: 'aguardando' | 'aprovado' | 'rejeitado'
  documento: string
  observacoes: string
  // derivados
  prestador_nome: string | null
  ativo_nome: string | null
  cronograma_atividade: string | null
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
    docs_vencidos: number
    docs_vencendo: number
    contratos_ativos: number
    contratos_mensal_total: number
    orcamentos_aguardando: number
    orcamentos_aguardando_total: number
  }
}

export interface Dados {
  gerado_em: string
  hoje: string
  perfil: 'publico' | 'completo'
  condominio: { nome: string; aviso: string }
  categorias: Categoria[]
  ativos: Ativo[]
  prestadores: Prestador[]
  cronograma: ItemCronograma[]
  manutencoes: Manutencao[]
  documentos: Documento[]
  contratos: Contrato[]
  orcamentos: Orcamento[]
  agregacoes: Agregacoes
}
