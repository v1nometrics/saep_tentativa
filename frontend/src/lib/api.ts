const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Interface para os dados que vêm do backend (TODAS as colunas do CSV)
export interface BackendOpportunity {
  // Colunas originais do CSV SIOP
  'Ano'?: number;
  'RP'?: string;
  'Autor'?: string;
  'Tipo Autor'?: string;
  'Partido'?: string;
  'UF Autor'?: string;
  'Nro. Emenda'?: string;
  'Órgão'?: string;
  'UO'?: string;
  'Ação'?: string;
  'Localizador'?: string;
  'GND'?: string;
  'Modalidade'?: string;
  'Natureza Despesa'?: string;
  'Dotação Inicial Emenda'?: number;
  'Dotação Atual Emenda'?: number;
  'Empenhado'?: number;
  'Liquidado'?: number;
  'Pago'?: number;
  
  // Código único gerado pelo backend (Portal da Transparência)
  'Codigo_Emenda'?: string;
  
  // Fallback para nomes antigos (compatibilidade)
  natureza_despesa?: string;
  modalidade?: number;
  resultado_primario?: string;
  orgao_orcamentario?: string;
  valor_emenda?: number;
  numero_emenda?: string;
  autor_emenda?: string;
  uf_autor?: string;
  descricao?: string;
  acao?: string;
}

// Interface normalizada para o frontend
export interface Opportunity {
  // Campos de identificação
  ano: number;
  numero_sequencial: string;
  identificacao_emenda: string;
  tipo_emenda: string;
  acao: string; // TÍTULO PRINCIPAL da emenda
  
  // Autor
  autor: string;
  codigo_funcional_autor: string;
  uf_favorecida: string;
  partido: string;
  
  // Destino
  orgao_orcamentario: string;
  codigo_orgao_orcamentario: string;
  unidade_orcamentaria: string;
  codigo_unidade_orcamentaria: string;
  
  // Financeiro
  valor_empenhado: number;
  valor_pago: number;
  
  // Classificação
  natureza_da_despesa: string;
  modalidade_de_aplicacao: string;
  resultado_primario: string;
  
  // Outros
  municipio_favorecido: string;
  objeto_da_emenda: string;
  
  // Campos extras do CSV SIOP (para exibição completa)
  tipo_autor?: string;
  unidade_orcamentaria_detalhada?: string;
  localizador?: string;
  gnd?: string;
  dotacao_inicial?: number;
  dotacao_atual?: number;
  valor_liquidado?: number;
  // Manter dados originais completos
  dados_originais?: any;
}

// Função auxiliar para converter valor monetário SIOP (formato brasileiro)
function parseMonetaryValue(value: any): number {
  // FORMATO SIOP: valores já em reais com pontos como separadores de milhares
  // Exemplos: "500.000" = R$ 500.000, "2.000.000" = R$ 2.000.000, "0" = R$ 0
  // DADOS SEMPRE VÁLIDOS: nunca null, undefined ou string vazia
  
  if (typeof value === 'number') {
    return value; // Já é um número em reais
  }
  
  if (typeof value === 'string') {
    // Remover pontos (separadores de milhares) e converter
    const cleanValue = value.replace(/\./g, '');
    return parseFloat(cleanValue);
  }
  
  // Este caso nunca deveria acontecer com dados SIOP válidos
  console.error(`ERRO: Valor monetário inesperado nos dados SIOP: ${value}`);
  return 0;
}

// Função para converter dados do backend para o formato do frontend
function normalizeOpportunity(backendOpp: BackendOpportunity): Opportunity {
  // Converter valores monetários corretamente
  const dotacaoInicial = parseMonetaryValue(backendOpp['Dotação Inicial Emenda']);
  const dotacaoAtual = parseMonetaryValue(backendOpp['Dotação Atual Emenda']);
  const empenhado = parseMonetaryValue(backendOpp['Empenhado']);
  const liquidado = parseMonetaryValue(backendOpp['Liquidado']);
  const pago = parseMonetaryValue(backendOpp['Pago']);
  
  // Usar sempre os valores reais dos campos financeiros
  const valorEmpenhado = empenhado; // Sempre usar o valor real de empenhado
  const valorPago = pago > 0 ? pago : liquidado;

  // USAR CÓDIGO ÚNICO DA EMENDA (Portal da Transparência) COMO TÍTULO
  // Formato oficial: AAAA-BBBB-CCCC (Ano + Código Autor + Número Sequencial)
  let codigoEmenda = backendOpp['Codigo_Emenda'];
  const acaoBase = backendOpp['Ação'] || backendOpp['acao'] || 'Ação não especificada';
  const localizador = backendOpp['Localizador'];
  const orgao = backendOpp['Órgão'] || backendOpp['orgao_orcamentario'] || 'Órgão não especificado';
  
  // FALLBACK: Se Codigo_Emenda não existe, criar baseado nos dados disponíveis
  if (!codigoEmenda && backendOpp['Ano'] && backendOpp['Nro. Emenda']) {
    try {
      const ano = String(backendOpp['Ano']);
      const nroEmenda = String(backendOpp['Nro. Emenda']).padStart(8, '0');
      const codigoAutor = nroEmenda.substring(0, 4);
      const numSequencial = nroEmenda.substring(4);
      codigoEmenda = `${ano}-${codigoAutor}-${numSequencial}`;
    } catch (e) {
      codigoEmenda = `${backendOpp['Ano'] || 'XXXX'}-${backendOpp['Nro. Emenda'] || 'XXXXXXXX'}`;
    }
  }
  
  // VALIDAÇÃO com fallbacks: Se dados essenciais estão vazios, usar valores padrão
  if (!codigoEmenda) {
    codigoEmenda = `TEMP-${backendOpp['Ano'] || 'XXXX'}-${backendOpp['Nro. Emenda'] || Math.random().toString(36).substr(2, 8)}`;
    console.warn('⚠️ Codigo_Emenda não encontrado, usando fallback:', codigoEmenda);
  }
  
  if (!acaoBase || acaoBase === 'Ação não especificada') {
    console.warn('⚠️ Ação não especificada para:', codigoEmenda);
  }
  
  if (!orgao || orgao === 'Órgão não especificado') {
    console.warn('⚠️ Órgão não especificado para:', codigoEmenda);
  }
  
  // TÍTULO ÚNICO LIMPO: Código oficial + descrição da ação
  // Backend já deduplicou - cada código de emenda aparece apenas 1 vez
  let tituloUnico = codigoEmenda;
  
  // Adicionar descrição da ação para contexto (sem limitação de espaço)
  if (acaoBase && acaoBase.trim() !== '') {
    // Truncar apenas se muito longa
    const acaoTruncada = acaoBase.length > 80 ? acaoBase.substring(0, 80) + '...' : acaoBase;
    tituloUnico += ` • ${acaoTruncada}`;
  }
  
  // Se temos localizador específico, adicionar para contexto geográfico
  if (localizador && localizador.trim() !== '' && 
      !localizador.toLowerCase().includes('nacional') && 
      !localizador.toLowerCase().includes('todas') &&
      localizador !== '0000') {
    const locTruncado = localizador.length > 25 ? localizador.substring(0, 25) + '...' : localizador;
    tituloUnico += ` • ${locTruncado}`;
  }

  return {
    ano: backendOpp['Ano']!,
    numero_sequencial: codigoEmenda!, // Garantido pela validação acima
    identificacao_emenda: codigoEmenda!, // Garantido pela validação acima
    tipo_emenda: backendOpp['Tipo Autor']!,
    acao: tituloUnico, // TÍTULO ÚNICO E ESPECÍFICO para cada emenda
    
    autor: backendOpp['Autor']!,
    codigo_funcional_autor: backendOpp['Partido']!,
    uf_favorecida: backendOpp['UF Autor']!,
    partido: backendOpp['Partido']!,
    
    orgao_orcamentario: orgao,
    codigo_orgao_orcamentario: backendOpp['UO']!,
    unidade_orcamentaria: backendOpp['UO']!,
    codigo_unidade_orcamentaria: backendOpp['UO']!,
    
    // Valores monetários convertidos corretamente
    valor_empenhado: valorEmpenhado,
    valor_pago: valorPago,
    
    natureza_da_despesa: backendOpp['Natureza Despesa']!,
    modalidade_de_aplicacao: backendOpp['Modalidade']!,
    resultado_primario: backendOpp['RP']!,
    
    municipio_favorecido: localizador || 'Nacional',
    objeto_da_emenda: acaoBase, // Descrição da ação original (sem número)
    
    // Campos extras preservados do CSV (convertendo valores monetários)
    tipo_autor: backendOpp['Tipo Autor']!,
    unidade_orcamentaria_detalhada: backendOpp['UO']!,
    localizador: localizador,
    gnd: backendOpp['GND']!,
    dotacao_inicial: dotacaoInicial,
    dotacao_atual: dotacaoAtual,
    valor_liquidado: liquidado,
    // Manter dados originais completos para debug/expansão futura
    dados_originais: backendOpp
  };
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  total: number;
  limit: number;
  offset: number;
  last_update: string;
  timestamp: string;
}

export interface Summary {
  total_opportunities: number;
  total_value: number;
  ministries_count: number;
  years_covered: number[];
  unique_ufs: string[];
  unique_partidos: string[];
  by_ministry: {
    count: Record<string, number>;
    value: Record<string, number>;
  };
  by_modality: Record<string, number>;
  by_uf: Record<string, number>;
  by_partido: Record<string, number>;
  all_ministries: Ministry[];
  top_ministries: Ministry[];
  ministries_with_relationship_count: number;
  ministries_without_relationship_count: number;
}

export interface SummaryResponse {
  summary: Summary;
  last_update: string;
  data_source: string;
  cache_info: string;
  timestamp: string;
}

export interface Ministry {
  ministry: string;
  count: number;
  total_value: number;
  has_relationship: boolean;
}

class ApiService {
  async searchOpportunities(params: {
    q: string;
    limit?: number;
    offset?: number;
    ministry?: string;
    // NOVO: Parâmetros de filtros com hierarquia
    years?: string;
    rp?: string;
    modalidades?: string;
    ufs?: string;
    partidos?: string;
    include_stats?: boolean;
  }): Promise<OpportunitiesResponse & { 
    search_term: string;
    filters_applied?: string[];
    hierarchy_info?: string;
    filtered_stats?: {
      total_opportunities: number;
      total_value: number;
      unique_ministries: number;
      unique_years: number;
      unique_authors: number;
    };
  }> {
    const url = new URL(`${API_BASE_URL}/api/search`);
    
    url.searchParams.set('q', params.q);
    if (params.limit) url.searchParams.set('limit', params.limit.toString());
    if (params.offset) url.searchParams.set('offset', params.offset.toString());
    if (params.ministry) url.searchParams.set('ministry', params.ministry);
    
    // NOVO: Adicionar parâmetros de filtros com hierarquia
    if (params.years) url.searchParams.set('years', params.years);
    if (params.rp) url.searchParams.set('rp', params.rp);
    if (params.modalidades) url.searchParams.set('modalidades', params.modalidades);
    if (params.ufs) url.searchParams.set('ufs', params.ufs);
    if (params.partidos) url.searchParams.set('partidos', params.partidos);
    
    // SEMPRE incluir estatísticas (para hierarquia de filtros + busca)
    url.searchParams.set('include_stats', 'true');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    const backendData = await response.json();
    
    // Converter dados do backend para o formato esperado pelo frontend
    const normalizedOpportunities = backendData.opportunities.map((opp: BackendOpportunity) => 
      normalizeOpportunity(opp)
    );
    
    return {
      opportunities: normalizedOpportunities,
      total: backendData.total,
      limit: backendData.limit,
      offset: backendData.offset || 0,
      last_update: backendData.last_update,
      timestamp: backendData.timestamp,
      search_term: backendData.search_term,
      // NOVO: Informações sobre filtros aplicados e estatísticas
      filters_applied: backendData.filters_applied,
      hierarchy_info: backendData.hierarchy_info,
      filtered_stats: backendData.filtered_stats
    };
  }

  async getOpportunities(params?: {
    limit?: number;
    offset?: number;
    ministry?: string;
  }): Promise<OpportunitiesResponse> {
    const url = new URL(`${API_BASE_URL}/api/opportunities`);
    
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());
    if (params?.ministry) url.searchParams.set('ministry', params.ministry);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    const backendData = await response.json();
    
    // Converter dados do backend para o formato esperado pelo frontend
    const normalizedOpportunities = backendData.opportunities.map((opp: BackendOpportunity) => 
      normalizeOpportunity(opp)
    );
    
    return {
      opportunities: normalizedOpportunities,
      total: backendData.total,
      limit: backendData.limit,
      offset: backendData.offset || 0,
      last_update: backendData.last_update,
      timestamp: backendData.timestamp
    };
  }

  async getSummary(): Promise<SummaryResponse> {
    const response = await fetch(`${API_BASE_URL}/api/summary`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    const backendData = await response.json();

    // CORREÇÃO: Usar diretamente os dados do backend corrigido
    if (backendData.summary) {
      // Backend já retorna a estrutura completa com valores numéricos corretos
      return {
        summary: {
          total_opportunities: backendData.summary.total_opportunities ?? 0,
          total_value: backendData.summary.total_value ?? 0,
          ministries_count: backendData.summary.ministries_count ?? 0,
          years_covered: backendData.summary.years_covered ?? [2025],
          unique_ufs: backendData.summary.unique_ufs ?? [],
          unique_partidos: backendData.summary.unique_partidos ?? [],
          by_ministry: backendData.summary.by_ministry ?? { count: {}, value: {} },
          by_modality: backendData.summary.by_modality ?? {},
          by_uf: backendData.summary.by_uf ?? {},
          by_partido: backendData.summary.by_partido ?? {},
          all_ministries: backendData.summary.all_ministries ?? [],
          top_ministries: backendData.summary.top_ministries ?? [],
          ministries_with_relationship_count: backendData.summary.ministries_with_relationship_count ?? 0,
          ministries_without_relationship_count: backendData.summary.ministries_without_relationship_count ?? 0
        },
        last_update: backendData.last_update,
        data_source: backendData.data_source,
        cache_info: backendData.cache_info,
        timestamp: backendData.timestamp
      };
    }

    // Fallback se backend não retornar estrutura esperada
    return {
      summary: {
        total_opportunities: 0,
        total_value: 0,
        ministries_count: 0,
        years_covered: [2025],
        unique_ufs: [],
        unique_partidos: [],
        by_ministry: { count: {}, value: {} },
        by_modality: {},
        by_uf: {},
        by_partido: {},
        all_ministries: [],
        top_ministries: [],
        ministries_with_relationship_count: 0,
        ministries_without_relationship_count: 0
      },
      last_update: new Date().toISOString(),
      data_source: "fallback",
      cache_info: "Dados não disponíveis",
      timestamp: new Date().toISOString()
    };
  }

  async getHealthCheck(): Promise<{ status: string; services: any; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async refreshData(force: boolean = true, wait: boolean = false): Promise<{ message: string; timestamp: string }> {
    const url = new URL(`${API_BASE_URL}/api/s3/refresh`);
    url.searchParams.set('force', force.toString());
    url.searchParams.set('wait', wait.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const apiService = new ApiService();