'use client';

import React from 'react';

interface StatCard {
  title: string;
  value: string;
  icon: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  subtitle?: string;
}

interface SummaryStatsInstitucionalProps {
  loading: boolean;
  summary: any;
  isSearchMode?: boolean;
  searchStats?: any;
}

export function SummaryStatsInstitucional({ 
  loading, 
  summary, 
  isSearchMode = false, 
  searchStats 
}: SummaryStatsInstitucionalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(1)}bi`;
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}mi`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    } else {
      return formatCurrency(value);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  // Usar dados da busca se estivermos em modo busca, senão usar summary
  const data = isSearchMode && searchStats ? searchStats : summary;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  const getIconSvg = (type: string) => {
    switch (type) {
      case 'opportunities':
        return (
          <svg className="w-5 h-5 text-[#003366]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
          </svg>
        );
      case 'value':
        return (
          <svg className="w-5 h-5 text-[#003366]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
          </svg>
        );
      case 'ministries':
        return (
          <svg className="w-5 h-5 text-[#003366]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
          </svg>
        );
      case 'years':
        return (
          <svg className="w-5 h-5 text-[#003366]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Oportunidades',
      value: formatNumber(data?.total_opportunities || 0),
      icon: 'opportunities',
      subtitle: 'Emendas mapeadas',
    },
    {
      title: 'Valor Disponível',
      value: formatCurrencyCompact(data?.total_value || 0),
      icon: 'value',
      subtitle: 'Recursos para captação',
    },
    {
      title: 'Órgãos Envolvidos',
      value: formatNumber(data?.ministries_count || data?.unique_ministries || 0),
      icon: 'ministries',
      subtitle: 'Ministérios e órgãos',
    },
    {
      title: 'Anos Analisados',
      value: formatNumber(data?.years_covered?.length || data?.unique_years || 0),
      icon: 'years',
      subtitle: 'Período de exercício',
    }
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Header das estatísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isSearchMode ? 'Resultados da Busca' : 'Resumo Geral'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isSearchMode 
              ? 'Estatísticas baseadas nos critérios de busca aplicados' 
              : 'Análise completa das emendas parlamentares disponíveis'
            }
          </p>
        </div>
        
        {/* Indicador de status */}
        <div className="flex items-center">
          <span className="inline-flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-full text-xs font-medium text-green-600 animate-pulse-bg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Dados SIOP em Tempo Real</span>
          </span>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div 
            key={card.title}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 modern-hover animate-fade-in-up min-h-[150px] flex flex-col justify-between"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Header - Título e Ícone */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                  {getIconSvg(card.icon)}
                </div>
                <h3 className="text-sm font-medium text-gray-600 leading-tight">{card.title}</h3>
              </div>
            </div>
            
            {/* Valor Principal */}
            <div className="text-2xl font-bold text-gray-900 flex items-center justify-center mb-2">
              {card.value}
            </div>
            
            {/* Subtítulo e Trend */}
            <div className="flex items-center justify-center">
              {card.subtitle && (
                <p className="text-xs text-gray-500 text-center">{card.subtitle}</p>
              )}
              {card.trend && (
                <div className={`flex items-center justify-center space-x-1 text-xs font-medium ${
                  card.trend.isPositive ? 'text-[#003366]' : 'text-red-600'
                }`}>
                  <span>{card.trend.isPositive ? '↗' : '↘'}</span>
                  <span>{card.trend.value}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Informações adicionais - SEMPRE MOSTRAR SE HÁ FILTROS ATIVOS */}
      {(isSearchMode && searchStats) || (!isSearchMode && summary) ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Filtros Aplicados</h4>
              <p className="text-sm text-blue-700 mt-1">
                Os resultados mostrados refletem {isSearchMode ? 'apenas as emendas que atendem aos critérios de busca e filtros selecionados' : 'todas as emendas compatíveis com os filtros atualmente selecionados'}.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
