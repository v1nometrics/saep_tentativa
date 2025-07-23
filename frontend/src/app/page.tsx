'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, Opportunity } from '@/lib/api';
import { logout } from '@/lib/auth';
import { EmendaCardCompact } from '../components/EmendaCardCompact';
import { EmendaTableView } from '../components/EmendaTableView';
import { EmendaModalExpanded } from '../components/EmendaModalExpanded';
import { ExportModal } from '../components/ExportModal';
import SearchBarInstitutional from '../components/SearchBarInstitutional';
import { FilterPanelInstitutional } from '../components/FilterPanelInstitutional';
import { SummaryStatsInstitucional } from '../components/SummaryStatsInstitucional';

// Extend the Opportunity type to include relationship flag and financial fields
interface OpportunityWithRel extends Opportunity {
  orgao_orcamentario: string;
  ano: number;
  resultado_primario: string;
  modalidade_de_aplicacao: string;
  uf_favorecida: string;
  partido: string;
  acao: string;
  autor: string;
  valor_empenhado: number;
  valor_pago: number;
  hasRelationship: boolean;
  dotacao_atual?: number;
  'Dotação Atual Emenda'?: number;
}

// Componente principal do dashboard
export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  

  
  const [opportunities, setOpportunities] = useState<OpportunityWithRel[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [totalOpportunities, setTotalOpportunities] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  
  // Estados para modal expandido
  const [selectedEmendaModal, setSelectedEmendaModal] = useState<OpportunityWithRel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Estados para modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  
  // Estados dos filtros - ESTADO INICIAL: TODOS SELECIONADOS EXCETO RELACIONAMENTO
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedRP, setSelectedRP] = useState<number[]>([6, 7, 8]);
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>(['99', '90', '31', '41', '50']);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedPartidos, setSelectedPartidos] = useState<string[]>([]);
  const [showOnlyRelatedMinistries, setShowOnlyRelatedMinistries] = useState<boolean>(false); // MUDANÇA: Iniciar desmarcado
  
  // Estados do filtro financeiro
  const [minDotacaoAtual, setMinDotacaoAtual] = useState<number>(0); // Valor aplicado (usado nos filtros)
  const [tempMinDotacao, setTempMinDotacao] = useState<number>(0); // Valor temporário (sendo digitado)
  
  // CORREÇÃO CRÍTICA: Estado para controlar inicialização
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Estado para controlar visualização (cards ou tabela)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Estado para armazenar TODOS os dados (para estatísticas)
  const [allOpportunities, setAllOpportunities] = useState<OpportunityWithRel[]>([]);
  const [originalSearchResults, setOriginalSearchResults] = useState<OpportunityWithRel[]>([]); // NOVO: dados originais da busca
  const [selectedEmenda, setSelectedEmenda] = useState<OpportunityWithRel | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  
  // Estados para busca global
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchMode, setIsSearchMode] = useState<boolean>(false);
  const [clearSearchTrigger, setClearSearchTrigger] = useState<boolean>(false);
  
  // NOVO: Estados para estatísticas dinâmicas e filtros
  const [searchStats, setSearchStats] = useState<any>(null);
  const [filtersApplied, setFiltersApplied] = useState<string[]>([]);
  
  // Estados para ordenação global
  const [sortField, setSortField] = useState<string>('ano');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Timeout para debounce de busca
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const ITEMS_PER_PAGE = 15;

  // Verificação de autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[Dashboard] Verificando autenticação...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.isAuthenticated === true) {
            console.log('[Dashboard] Usuário autenticado:', data.user?.email);
            setAuthChecked(true);
          } else {
            console.log('[Dashboard] Usuário não autenticado, redirecionando para login...');
            router.push('/login');
            return;
          }
        } else {
          console.log('[Dashboard] Erro na verificação de autenticação, redirecionando para login...');
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('[Dashboard] Erro ao verificar autenticação:', error);
        router.push('/login');
        return;
      }
    };
    
    checkAuth();
  }, [router]);

  // Funções de formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(1)}bi`;
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}mi`;
    } else {
      return formatCurrency(value);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };
  // NOVA FUNÇÃO: Calcular valor disponível (Dotação Atual - Empenhado)
  const calculateAvailableValue = (opp: any) => {
    const dotacao = opp.dotacao_atual || opp['Dotação Atual Emenda'] || 0;
    const empenhado = opp.valor_empenhado || opp['Empenhado'] || 0;
    const disponivel = Math.max(0, dotacao - empenhado); // Não permitir valores negativos
    return disponivel;
  };

  // Handler para abrir modal com detalhes completos
  const handleCardClick = (emenda: OpportunityWithRel) => {
    setSelectedEmendaModal(emenda);
    setIsModalOpen(true);
  };

  // Handler para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmendaModal(null);
  };

  // Handler para refresh
  const handleRefresh = async () => {
    setIsInitialized(false);
    setError(null);
    
    // Limpar dados existentes
    setOpportunities([]);
    setAllOpportunities([]);
    setSummary(null);
    setSearchStats(null);
    
    // Resetar modo de busca se ativo
    if (isSearchMode) {
      setIsSearchMode(false);
      setSearchTerm('');
      setOriginalSearchResults([]);
    }
    
    // Carregar dados iniciais (estatísticas)
    await loadInitialData();
    
    // Após carregar as estatísticas, carregar os dados dos cards
    // O useEffect irá detectar que isInitialized mudou e carregar os dados
  };

  // Handler para busca - NOVA LÓGICA: APLICAR FILTROS + BUSCA EM COMBINAÇÃO
  const handleSearch = async (searchTerm: string) => {
    setSearchTerm(searchTerm);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      setIsSearchMode(false);
      setSearchStats(null);
      setOriginalSearchResults([]); // Limpar dados originais da busca
      setCurrentPage(0);
      
      // NOVO: Ao remover busca, voltar aos dados originais + filtros aplicados
      if (isInitialized && summary) {
        setTimeout(() => loadAllData(), 100); // Recarregar dados normais
      }
      
      return;
    }

    setIsSearching(true);
    setIsSearchMode(true);

    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔍 Realizando busca com filtros combinados:', searchTerm);
        
        // NOVA LÓGICA: Enviar filtros junto com a busca para hierarquia backend
        const searchResponse = await apiService.searchOpportunities({
          q: searchTerm,
          years: selectedYears.length > 0 ? selectedYears.join(',') : undefined,
          rp: selectedRP.length > 0 ? selectedRP.join(',') : undefined,
          modalidades: selectedModalidades.length > 0 ? selectedModalidades.join(',') : undefined,
          ufs: selectedUFs.length > 0 ? selectedUFs.join(',') : undefined,
          partidos: selectedPartidos.length > 0 ? selectedPartidos.join(',') : undefined,
          include_stats: true
        });
        
        if (searchResponse && searchResponse.opportunities) {
          console.log('✅ Resultados da busca com filtros:', searchResponse.opportunities.length);
          
          // Adicionar informações sobre filtros aplicados
          const filtersAppliedList = [];
          if (selectedYears.length > 0) filtersAppliedList.push(`Anos: [${selectedYears.join(', ')}]`);
          if (selectedRP.length > 0) filtersAppliedList.push(`RP: [${selectedRP.join(', ')}]`);
          if (selectedModalidades.length > 0) filtersAppliedList.push(`Modalidades: [${selectedModalidades.join(', ')}]`);
          if (selectedUFs.length > 0) filtersAppliedList.push(`UFs: [${selectedUFs.join(', ')}]`);
          if (selectedPartidos.length > 0) filtersAppliedList.push(`Partidos: [${selectedPartidos.join(', ')}]`);
          if (selectedMinistries.length > 0) filtersAppliedList.push(`Ministérios: ${selectedMinistries.length} selecionados`);
          if (showOnlyRelatedMinistries) filtersAppliedList.push(`Apenas com relacionamento prévio`);
          
          setFiltersApplied(filtersAppliedList);
          
          // Adicionar flag de relacionamento e aplicar TODOS os filtros frontend
          const allMinistries = summary?.all_ministries || summary?.top_ministries || [];
          let searchResultsWithRel = searchResponse.opportunities.map((opp: any) => {
            const ministryData = allMinistries.find((m: any) => m.ministry === opp.orgao_orcamentario);
            return {
              ...opp,
              hasRelationship: ministryData?.has_relationship || false
            };
          });
          
          // Aplicar TODOS os filtros que não foram processados no backend
          searchResultsWithRel = searchResultsWithRel.filter((opp: any) => {
            // Filtro de ministério
            const ministryMatch = selectedMinistries.length === 0 || selectedMinistries.includes(opp.orgao_orcamentario);
            
            // Filtro de relacionamento
            const relationshipMatch = !showOnlyRelatedMinistries || opp.hasRelationship;
            
            return ministryMatch && relationshipMatch;
          });
          
          // Recalcular estatísticas após aplicar filtros frontend
          const finalStats = {
            total_opportunities: searchResultsWithRel.length,
            total_value: searchResultsWithRel.reduce((acc: number, o: any) => acc + calculateAvailableValue(o), 0),
            unique_ministries: new Set(searchResultsWithRel.map((o: any) => o.orgao_orcamentario)).size,
            unique_years: new Set(searchResultsWithRel.map((o: any) => o.ano)).size
          };
          
          setSearchStats(finalStats);
          setAllOpportunities(searchResultsWithRel);
          setOriginalSearchResults(searchResultsWithRel); // NOVO: armazenar dados originais da busca
          
          setSearchStats(finalStats);
          setCurrentPage(0);
        } else {
          console.warn('⚠️ Busca retornou resultado vazio');
          setSearchStats({ total_opportunities: 0, total_value: 0, unique_ministries: 0, unique_years: 0 });
          setAllOpportunities([]);
          setOriginalSearchResults([]); // NOVO: limpar dados originais
          setFiltersApplied([]);
        }
      } catch (err) {
        console.error('❌ Erro na busca:', err);
        setError('Erro ao realizar busca. Tente novamente.');
      } finally {
        setIsSearching(false);
      }
    }, 500);

    setSearchTimeout(timeoutId);
  };

  // useEffect principal
  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, []);

  // useEffect para carregar dados - CORRIGIDO PARA RESPEITAR BUSCA + FILTROS
  useEffect(() => {
    if (isInitialized && selectedMinistries.length > 0 && summary) {
      const timeoutId = setTimeout(() => {
        // Se estamos em modo busca, não recarregar dados - apenas aplicar filtros sobre dados da busca
        if (isSearchMode) {
          applyFiltersToSearchResults();
        } else {
          // Se não estamos em busca, carregar dados normais
          loadAllData();
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedMinistries, selectedYears, selectedRP, selectedModalidades, selectedUFs, selectedPartidos, showOnlyRelatedMinistries, minDotacaoAtual, isInitialized, summary, currentPage]);

  // useEffect para controlar ministérios baseado no filtro de relacionamento
  useEffect(() => {
    if (isInitialized && summary) {
      const allMinistries = summary.all_ministries || summary.top_ministries || [];
      
      if (showOnlyRelatedMinistries) {
        const ministeriosComRelacionamento = allMinistries
          .filter((m: any) => m.has_relationship)
          .map((m: any) => m.ministry);
        setSelectedMinistries(ministeriosComRelacionamento);
      }
    }
  }, [showOnlyRelatedMinistries, isInitialized, summary]);

  // Função para carregar dados iniciais
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Carregando dados iniciais...');
      
      const [summaryResponse] = await Promise.all([
        apiService.getSummary()
      ]);

      console.log('✅ Summary recebido:', summaryResponse.summary);
      
      if (summaryResponse && summaryResponse.summary) {
        setSummary(summaryResponse.summary);
        
        const summary = summaryResponse.summary;
        
        // Inicializar anos
        if (summary.years_covered && summary.years_covered.length > 0) {
          setSelectedYears(summary.years_covered);
        }
        
        // Inicializar ministérios - TODOS SELECIONADOS POR PADRÃO
        const allMinistries = summary.all_ministries || summary.top_ministries || [];
        
        // MUDANÇA: Sempre inicializar com TODOS os ministérios (não apenas com relacionamento)
        const ministeriosParaInicializar = allMinistries.map((m: any) => m.ministry);
        
        if (ministeriosParaInicializar.length > 0) {
          setSelectedMinistries(ministeriosParaInicializar);
        } else {
          const fallbackMinisterios = allMinistries.slice(0, 5).map((m: any) => m.ministry);
          setSelectedMinistries(fallbackMinisterios);
        }

        // Inicializar UFs - TODAS SELECIONADAS POR PADRÃO
        if (summary.unique_ufs && summary.unique_ufs.length > 0) {
          setSelectedUFs(summary.unique_ufs);
        }

        // Inicializar Partidos - TODOS SELECIONADOS POR PADRÃO
        if (summary.unique_partidos && summary.unique_partidos.length > 0) {
          setSelectedPartidos(summary.unique_partidos);
        }
        
        setIsInitialized(true);
      } else {
        setError('Dados não disponíveis no servidor. Verifique se o backend está processando dados do SIOP.');
      }
      
    } catch (err) {
      console.error('❌ Erro ao carregar dados iniciais:', err);
      setError(err instanceof Error ? `Erro de conexão: ${err.message}` : 'Erro ao conectar com o servidor de dados SIOP');
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar todos os dados
  const loadAllData = async () => {
    try {
      console.log('🔄 Carregando dados...');

      const allDataResponse = await apiService.getOpportunities({
        limit: 100000,
        offset: 0
      });

      const allMinistries = summary?.all_ministries || summary?.top_ministries || [];
      const allOppsWithRel = allDataResponse.opportunities.map((opp) => {
        const ministryData = allMinistries.find((m: any) => m.ministry === opp.orgao_orcamentario);
        
        return {
          ...opp,
          hasRelationship: ministryData?.has_relationship || false
        };
      });

      setAllOpportunities(allOppsWithRel);
      
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError('Erro ao carregar dados das oportunidades');
    }
  };

  // NOVA FUNÇÃO: Aplicar filtros sobre dados da busca (mantendo busca ativa)
  const applyFiltersToSearchResults = () => {
    console.log('🔄 Aplicando filtros sobre resultados da busca...');
    
    // Usar dados originais da busca armazenados
    if (!originalSearchResults || originalSearchResults.length === 0) {
      console.warn('⚠️ Sem dados originais de busca para filtrar');
      return;
    }

    // Aplicar filtros sobre os dados ORIGINAIS da busca
    const filteredSearchResults = originalSearchResults.filter((opp) => {
      const ministryMatch = selectedMinistries.length === 0 || selectedMinistries.includes(opp.orgao_orcamentario);
      const yearMatch = selectedYears.length === 0 || selectedYears.includes(opp.ano);
      
      const rpMatch = selectedRP.length === 0 || selectedRP.some(rp => {
        const rpString = `${rp}`;
        return opp.resultado_primario?.includes(rpString);
      });
      
      const modalidadeMatch = selectedModalidades.length === 0 || selectedModalidades.some(modal => {
        return opp.modalidade_de_aplicacao?.includes(modal);
      });
      
      const relationshipMatch = !showOnlyRelatedMinistries || opp.hasRelationship;

      // Aplicar filtro de UF Favorecida
      const ufMatch = selectedUFs.length === 0 || selectedUFs.includes(opp.uf_favorecida);

      // Aplicar filtro de Partido
      const partidoMatch = selectedPartidos.length === 0 || selectedPartidos.includes(opp.partido);

      // Aplicar filtro financeiro
      const dotacaoAtual = opp.dotacao_atual || opp['Dotação Atual Emenda'] || 0;
      const dotacaoMatch = !minDotacaoAtual || dotacaoAtual >= minDotacaoAtual;
      
      return ministryMatch && yearMatch && rpMatch && modalidadeMatch && relationshipMatch && ufMatch && partidoMatch && dotacaoMatch;
    });

    // Recalcular estatísticas baseadas nos dados filtrados da busca
    const updatedStats = {
      total_opportunities: filteredSearchResults.length,
      total_value: filteredSearchResults.reduce((acc: number, o: any) => acc + calculateAvailableValue(o), 0),
      unique_ministries: new Set(filteredSearchResults.map((o: any) => o.orgao_orcamentario)).size,
      unique_years: new Set(filteredSearchResults.map((o: any) => o.ano)).size
    };

    // Atualizar dados exibidos E estatísticas para refletir busca + filtros
    setAllOpportunities(filteredSearchResults);
    setSearchStats(updatedStats);
    
    console.log('✅ Filtros aplicados sobre busca. Resultados:', filteredSearchResults.length);
  };

  // NOVA FUNÇÃO: Detectar se filtros estão ativos
  const areFiltersActive = useMemo(() => {
    if (!summary || !isInitialized) return false;
    
    const allMinistries = summary.all_ministries || summary.top_ministries || [];
    const allYears = summary.years_covered || [];
    const allUFs = summary.unique_ufs || [];
    const allPartidos = summary.unique_partidos || [];
    
    // Verificar se algum filtro foi alterado do estado "todos selecionados"
    const hasYearFilter = selectedYears.length > 0 && selectedYears.length < allYears.length;
    const hasRPFilter = selectedRP.length > 0 && selectedRP.length < 3; // RP tem 3 opções: 6,7,8
    const hasModalidadeFilter = selectedModalidades.length > 0 && selectedModalidades.length < 5; // 5 modalidades
    const hasMinistryFilter = selectedMinistries.length > 0 && selectedMinistries.length < allMinistries.length;
    const hasUFFilter = selectedUFs.length > 0 && selectedUFs.length < allUFs.length;
    const hasPartidoFilter = selectedPartidos.length > 0 && selectedPartidos.length < allPartidos.length;
    const hasRelationshipFilter = showOnlyRelatedMinistries;
    const hasFinancialFilter = minDotacaoAtual > 0;
    
    return hasYearFilter || hasRPFilter || hasModalidadeFilter || hasMinistryFilter || hasUFFilter || hasPartidoFilter || hasRelationshipFilter || hasFinancialFilter;
  }, [selectedYears, selectedRP, selectedModalidades, selectedMinistries, selectedUFs, selectedPartidos, showOnlyRelatedMinistries, minDotacaoAtual, summary, isInitialized]);

  // NOVA FUNÇÃO: Gerar lista de filtros aplicados
  const getAppliedFiltersList = useMemo(() => {
    if (!areFiltersActive && !isSearchMode) return [];
    
    const filters = [];
    
    if (isSearchMode) {
      filters.push(`Busca: "${searchTerm}"`);
    }
    
    if (selectedYears.length > 0 && summary?.years_covered && selectedYears.length < summary.years_covered.length) {
      filters.push(`Anos: [${selectedYears.join(', ')}]`);
    }
    
    if (selectedRP.length > 0 && selectedRP.length < 3) {
      filters.push(`RP: [${selectedRP.join(', ')}]`);
    }
    
    if (selectedModalidades.length > 0 && selectedModalidades.length < 5) {
      filters.push(`Modalidades: [${selectedModalidades.join(', ')}]`);
    }
    
    if (selectedMinistries.length > 0 && summary?.all_ministries && selectedMinistries.length < summary.all_ministries.length) {
      filters.push(`Ministérios: ${selectedMinistries.length}/${summary.all_ministries.length} selecionados`);
    }

    if (selectedUFs.length > 0 && summary?.unique_ufs && selectedUFs.length < summary.unique_ufs.length) {
      filters.push(`UFs: [${selectedUFs.join(', ')}]`);
    }

    if (selectedPartidos.length > 0 && summary?.unique_partidos && selectedPartidos.length < summary.unique_partidos.length) {
      filters.push(`Partidos: [${selectedPartidos.join(', ')}]`);
    }
    
    if (showOnlyRelatedMinistries) {
      filters.push(`Apenas órgãos com relacionamento prévio`);
    }
    
    return filters;
  }, [areFiltersActive, isSearchMode, searchTerm, selectedYears, selectedRP, selectedModalidades, selectedMinistries, showOnlyRelatedMinistries, summary]);

  // Verificação de autenticação - agora no final após todos os hooks


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-6 text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Falha nos Dados SIOP</h2>
          <div className="text-gray-600 mb-6 leading-relaxed space-y-3">
            <p className="font-medium text-red-600">Sistema requer dados reais do SIOP</p>
            <p className="text-sm bg-gray-50 p-3 rounded-lg border-l-4 border-red-500">
              {error}
            </p>
          </div>
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-institutional text-white rounded-lg font-medium hover:bg-institutional-dark transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Tentar Carregar Dados SIOP</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Recarregar Aplicação</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Aplicar filtros nos dados completos
  const filteredAllData = allOpportunities.filter((opp) => {
    if (allOpportunities.length === 0) {
      return false;
    }

    const ministryMatch = selectedMinistries.length === 0 || selectedMinistries.includes(opp.orgao_orcamentario);
    const yearMatch = selectedYears.length === 0 || selectedYears.includes(opp.ano);
    
    const rpMatch = selectedRP.length === 0 || selectedRP.some(rp => {
      const rpString = `${rp}`;
      return opp.resultado_primario?.includes(rpString);
    });
    
    const modalidadeMatch = selectedModalidades.length === 0 || selectedModalidades.some(modal => {
      return opp.modalidade_de_aplicacao?.includes(modal);
    });

    // Aplicar filtro de UF Favorecida
    const ufMatch = selectedUFs.length === 0 || selectedUFs.includes(opp.uf_favorecida);

    // Aplicar filtro de Partido
    const partidoMatch = selectedPartidos.length === 0 || selectedPartidos.includes(opp.partido);

    // Aplicar filtro financeiro
    const dotacaoAtual = opp.dotacao_atual || opp['Dotação Atual Emenda'] || 0;
    const dotacaoMatch = !minDotacaoAtual || dotacaoAtual >= minDotacaoAtual;
    
    return ministryMatch && yearMatch && rpMatch && modalidadeMatch && ufMatch && partidoMatch && dotacaoMatch;
  });

  // Aplicar filtro de relacionamento
  const relationshipFilteredData = showOnlyRelatedMinistries ? filteredAllData.filter((o) => o.hasRelationship) : filteredAllData;
  
  // Aplicar ordenação global
  const displayAllData = useMemo(() => {
    if (relationshipFilteredData.length === 0) return [];
    
    const sortedData = [...relationshipFilteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Extrair valores baseados no campo de ordenação
      switch (sortField) {
        case 'ano':
          aValue = a.ano;
          bValue = b.ano;
          break;
        case 'acao':
          aValue = a.acao?.toLowerCase() || '';
          bValue = b.acao?.toLowerCase() || '';
          break;
        case 'autor':
          aValue = a.autor?.toLowerCase() || '';
          bValue = b.autor?.toLowerCase() || '';
          break;
        case 'dotacao_atual':
          aValue = a.dotacao_atual || a['Dotação Atual Emenda'] || 0;
          bValue = b.dotacao_atual || b['Dotação Atual Emenda'] || 0;
          break;
        case 'valor_empenhado':
          aValue = a.valor_empenhado || 0;
          bValue = b.valor_empenhado || 0;
          break;
        case 'valor_pago':
          aValue = a.valor_pago || 0;
          bValue = b.valor_pago || 0;
          break;
        case 'orgao_orcamentario':
          aValue = a.orgao_orcamentario?.toLowerCase() || '';
          bValue = b.orgao_orcamentario?.toLowerCase() || '';
          break;
        case 'modalidade_de_aplicacao':
          aValue = a.modalidade_de_aplicacao?.toLowerCase() || '';
          bValue = b.modalidade_de_aplicacao?.toLowerCase() || '';
          break;
        case 'resultado_primario':
          aValue = a.resultado_primario?.toLowerCase() || '';
          bValue = b.resultado_primario?.toLowerCase() || '';
          break;
        case 'uf_favorecida':
          aValue = a.uf_favorecida?.toLowerCase() || '';
          bValue = b.uf_favorecida?.toLowerCase() || '';
          break;
        case 'partido':
          aValue = a.partido?.toLowerCase() || '';
          bValue = b.partido?.toLowerCase() || '';
          break;
        default:
          aValue = a.ano;
          bValue = b.ano;
      }
      
      // Aplicar ordenação
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }
    });
    
    return sortedData;
  }, [relationshipFilteredData, sortField, sortDirection]);

  // Paginação (apenas para cards, tabela gerencia sua própria ordenação)
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = displayAllData.slice(startIndex, endIndex);

  // Total filtrado
  const totalFiltered = displayAllData.length;

  // Calcular estatísticas dinâmicas
  const derivedSummary = useMemo(() => {
    if (isSearchMode && searchStats) {
      return {
        total_opportunities: searchStats.total_opportunities,
        total_value: searchStats.total_value,
        ministries_count: searchStats.unique_ministries,
        years_covered: [searchStats.unique_years]
      };
    }
    
    const total_opportunities = displayAllData.length;
    const total_value = displayAllData.reduce((acc: number, o: any) => acc + calculateAvailableValue(o), 0);
    const ministriesSet = new Set(displayAllData.map((o: any) => o.orgao_orcamentario));
    const yearsSet = new Set(displayAllData.map((o: any) => o.ano));
    
    return { 
      total_opportunities, 
      total_value, 
      ministries_count: ministriesSet.size, 
      years_covered: Array.from(yearsSet) 
    };
  }, [displayAllData, isSearchMode, searchStats]);

  // Exibir loader de autenticação após todos os hooks
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-institutional mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header Institucional */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 animate-fade-in-up">
              <img 
                src="https://www.innovatismc.com.br/wp-content/uploads/2023/12/logo-innovatis-flatico-150x150.png"
                alt="Innovatis" 
                className="w-16 h-16 object-contain"
              />
              <div>
                <div className="flex items-start">
                  <div className="flex flex-col">
                    <h1 className="text-2xl font-semibold text-gray-900 leading-none mb-1">
                      Sistema de Análise de Emendas Parlamentares
                    </h1>
                    <div className="flex items-center space-x-4 ml-[2px]">
                      <span className="text-sm text-gray-600 font-medium">
                        Innovatis - Inteligência em Gestão
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        v1.0 • Última Atualização do Sistema: 22/07/2025
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status do Sistema */}
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Sistema Online</span>
              </div>
              
              {/* Botão de Exportação Rápida - Header */}
              <button
                onClick={() => setIsExportModalOpen(true)}
                disabled={!derivedSummary || derivedSummary.total_opportunities === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                title="Exportação rápida dos dados filtrados"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar</span>
              </button>
              
              {/* Botão de Atualização */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="btn-institutional px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
              </button>
              
              {/* Botão de Logout */}
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm hover:shadow-md"
                title="Sair do sistema"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Painel de Filtros Institucional */}
          <div className="xl:col-span-1 filter-sidebar">
            <FilterPanelInstitutional
              loading={loading}
              summary={summary}
              selectedYears={selectedYears}
              setSelectedYears={setSelectedYears}
              selectedRP={selectedRP}
              setSelectedRP={setSelectedRP}
              selectedModalidades={selectedModalidades}
              setSelectedModalidades={setSelectedModalidades}
              selectedMinistries={selectedMinistries}
              setSelectedMinistries={setSelectedMinistries}
              showOnlyRelatedMinistries={showOnlyRelatedMinistries}
              setShowOnlyRelatedMinistries={setShowOnlyRelatedMinistries}
              selectedUFs={selectedUFs}
              setSelectedUFs={setSelectedUFs}
              selectedPartidos={selectedPartidos}
              setSelectedPartidos={setSelectedPartidos}
              minDotacaoAtual={tempMinDotacao}
              setMinDotacaoAtual={setTempMinDotacao}
              onApplyFilter={() => setMinDotacaoAtual(tempMinDotacao)}
              onClearFilter={() => {
                setMinDotacaoAtual(0);
                setTempMinDotacao(0);
              }}
              onExportData={() => setIsExportModalOpen(true)}
              totalFilteredRecords={displayAllData.length}
              // Ordenação global
              sortField={sortField}
              setSortField={setSortField}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
            />
          </div>

          {/* Área Principal */}
          <div className="xl:col-span-3 main-content">
            {/* Estatísticas Institucionais */}
            <SummaryStatsInstitucional
              loading={loading}
              summary={derivedSummary}
              isSearchMode={isSearchMode}
              searchStats={searchStats}
            />

            {/* Barra de Busca Global */}
            <div className="mb-8">
              <SearchBarInstitutional
                onSearch={handleSearch}
                isSearching={isSearching}
                placeholder="Buscar em todas as emendas... (autor, valor, código, ministério, etc.)"
                className="relative z-20"
                clearTrigger={clearSearchTrigger}
              />
              
              {/* Feedback Visual da Busca */}
              {isSearchMode && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <span>Modo de Busca Ativo</span>
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Exibindo resultados para <strong>"{searchTerm}"</strong>. 
                        Os filtros laterais continuam ativos e são aplicados sobre os resultados da busca.
                      </p>
                      <button 
                        onClick={() => {
                          setIsSearchMode(false);
                          setSearchTerm('');
                          setSearchStats(null);
                          setOriginalSearchResults([]); // Limpar dados originais
                          setClearSearchTrigger(prev => !prev); // Acionar limpeza do campo
                          
                          // NOVO: Recarregar dados normais + filtros após limpar busca
                          if (isInitialized && summary) {
                            setTimeout(() => loadAllData(), 100);
                          }
                        }}
                        className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Limpar busca</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Oportunidades */}
            {displayAllData.length > 0 ? (
              <div>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Oportunidades Identificadas
                        </h2>
                        <p className="text-gray-600 text-sm">
                          {isSearchMode ? `Resultados da busca por "${searchTerm}"` : 'Emendas parlamentares filtradas pelos critérios Innovatis'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Controles de Visualização */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('cards')}
                          className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'cards'
                              ? 'bg-white text-[#003366] shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                          </svg>
                          Cards
                        </button>
                        <button
                          onClick={() => setViewMode('table')}
                          className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'table'
                              ? 'bg-white text-[#003366] shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                          </svg>
                          Tabela
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {isSearchMode ? 'Encontrado' : 'Total encontrado'}
                        </div>
                        <div className="text-2xl font-bold text-[#003366]">
                          {loading ? 'Carregando...' : formatNumber(derivedSummary.total_opportunities)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visualização condicional: Cards ou Tabela */}
                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8 items-stretch">
                      {paginatedData.map((opportunity: any, index: number) => (
                        <EmendaCardCompact
                          key={`${opportunity.ano}-${opportunity.numero_sequencial}-${index}`} 
                          emenda={opportunity}
                          onClick={handleCardClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mb-8">
                      <EmendaTableView
                        emendas={displayAllData}
                        onRowClick={handleCardClick}
                      />
                    </div>
                  )}
                  
                  {/* Paginação - apenas para modo cards */}
                  {viewMode === 'cards' && totalFiltered > ITEMS_PER_PAGE && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-gray-600">
                          <span className="text-sm">Mostrando </span>
                          <span className="font-bold text-institutional">
                            {currentPage * ITEMS_PER_PAGE + 1} - {Math.min((currentPage + 1) * ITEMS_PER_PAGE, displayAllData.length)}
                          </span>
                          <span className="text-sm"> de </span>
                          <span className="font-bold text-institutional">{formatNumber(displayAllData.length)}</span>
                          <span className="text-sm"> oportunidades</span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            ← Anterior
                          </button>
                          
                          <div className="px-4 py-2 bg-institutional text-white rounded-lg font-bold">
                            {currentPage + 1} / {Math.ceil(displayAllData.length / ITEMS_PER_PAGE)}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={(currentPage + 1) * ITEMS_PER_PAGE >= displayAllData.length}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            Próxima →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Dados SIOP indisponíveis
                </h3>
                <div className="max-w-lg mx-auto text-gray-600 mb-6 space-y-2">
                  <p className="font-medium text-orange-600">
                    Não foi possível carregar dados reais do SIOP
                  </p>
                  <p className="text-sm">
                    • Verifique se o backend está rodando e conectado ao S3<br/>
                    • Confirme se há dados SIOP atualizados no bucket S3<br/>
                    • Tente atualizar os dados manualmente
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-institutional text-white rounded-lg font-medium hover:bg-institutional-dark transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Atualizar Dados SIOP</span>
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Recarregar Página</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Expandido com Detalhes Completos */}
      {selectedEmendaModal && (
        <EmendaModalExpanded
          emenda={selectedEmendaModal}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Modal de Exportação */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={displayAllData}
        summary={derivedSummary}
        appliedFilters={getAppliedFiltersList}
        isSearchMode={isSearchMode}
        searchTerm={searchTerm}
      />
    </div>
  );
}
