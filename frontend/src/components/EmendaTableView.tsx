'use client';

import React, { useState, useMemo } from 'react';
import { getMinistryInfo } from './icons/ministryIcons';
import { Opportunity } from '../lib/api';

interface EmendaTableViewProps {
  emendas: (Opportunity & { hasRelationship: boolean })[];
  onRowClick: (emenda: Opportunity & { hasRelationship: boolean }) => void;
}

const ITEMS_PER_PAGE = 10; // 10 itens por página para tabela

export function EmendaTableView({ emendas, onRowClick }: EmendaTableViewProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(1)}bi`;
    } else if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}mi`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  // Extrair apenas a descrição da ação (sem código da emenda)
  const getActionDescription = (action: string, objetoEmenda?: string) => {
    // Primeiro, tentar usar o objeto_da_emenda se disponível e diferente da ação completa
    if (objetoEmenda && objetoEmenda.trim() !== '' && objetoEmenda !== action) {
      // Remover códigos alfanuméricos e numéricos seguidos de hífen no início
      const cleanObjeto = objetoEmenda
        .replace(/^[A-Z0-9]+\s*-\s*/, '')  // Remove códigos como "20WG - ", "20RK - "
        .replace(/^\d+\s*-\s*/, '')        // Remove códigos numéricos como "1234 - "
        .trim();
      return cleanObjeto;
    }
    
    // Se a ação contém " • ", pegar apenas a parte após o primeiro separador (que é a descrição limpa)
    if (action.includes(' • ')) {
      const parts = action.split(' • ');
      // Pegar a segunda parte que geralmente é a descrição da ação
      if (parts.length > 1) {
        let cleanAction = parts[1];
        // Remover códigos alfanuméricos e numéricos seguidos de hífen se existirem
        cleanAction = cleanAction
          .replace(/^[A-Z0-9]+\s*-\s*/, '')  // Remove códigos como "20WG - ", "20RK - "
          .replace(/^\d+\s*-\s*/, '')        // Remove códigos numéricos como "1234 - "
          .trim();
        return cleanAction;
      }
    }
    
    // Se não tem separador, verificar se começa com código (formato AAAA-BBBB-CCCC)
    const codigoRegex = /^\d{4}-\d{4}-\d{4}\s*/;
    if (codigoRegex.test(action)) {
      let cleanAction = action.replace(codigoRegex, '').trim();
      // Remover códigos alfanuméricos e numéricos seguidos de hífen se existirem
      cleanAction = cleanAction
        .replace(/^[A-Z0-9]+\s*-\s*/, '')  // Remove códigos como "20WG - ", "20RK - "
        .replace(/^\d+\s*-\s*/, '')        // Remove códigos numéricos como "1234 - "
        .trim();
      return cleanAction;
    }
    
    // Como último recurso, limpar códigos alfanuméricos e numéricos e usar a ação
    const cleanAction = action
      .replace(/^[A-Z0-9]+\s*-\s*/, '')  // Remove códigos como "20WG - ", "20RK - "
      .replace(/^\d+\s*-\s*/, '')        // Remove códigos numéricos como "1234 - "
      .trim();
    return cleanAction || action;
  };

  // Paginação simples (ordenação global já aplicada)
  const paginatedEmendas = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = emendas.slice(startIndex, endIndex);

    return {
      data: paginated,
      totalPages: Math.ceil(emendas.length / ITEMS_PER_PAGE),
      currentPage,
      totalItems: emendas.length
    };
  }, [emendas, currentPage]);

  // Formatação do nome do ministério (remover códigos)
  const formatMinistryName = (name: string) => {
    return name.replace(/^\d+\s*-\s*/, '').trim();
  };

  // Extrair apenas a sigla do ministério para a tabela
  const getMinistryAcronym = (name: string) => {
    const cleanName = name.replace(/^\d+\s*-\s*/, '').trim();
    
    // Mapeamento de ministérios para suas siglas
    if (cleanName.toLowerCase().includes('saúde')) return 'MS';
    if (cleanName.toLowerCase().includes('educação')) return 'MEC';
    if (cleanName.toLowerCase().includes('infraestrutura')) return 'MINFRA';
    if (cleanName.toLowerCase().includes('agricultura')) return 'MAPA';
    if (cleanName.toLowerCase().includes('desenvolvimento social')) return 'MDS';
    if (cleanName.toLowerCase().includes('desenvolvimento regional')) return 'MDR';
    if (cleanName.toLowerCase().includes('cultura')) return 'MinC';
    if (cleanName.toLowerCase().includes('meio ambiente')) return 'MMA';
    if (cleanName.toLowerCase().includes('justiça')) return 'MJ';
    if (cleanName.toLowerCase().includes('defesa')) return 'MD';
    if (cleanName.toLowerCase().includes('economia')) return 'ME';
    if (cleanName.toLowerCase().includes('relações exteriores')) return 'MRE';
    if (cleanName.toLowerCase().includes('ciência')) return 'MCTI';
    if (cleanName.toLowerCase().includes('turismo')) return 'MTur';
    if (cleanName.toLowerCase().includes('trabalho')) return 'MTE';
    if (cleanName.toLowerCase().includes('comunicações')) return 'MCom';
    if (cleanName.toLowerCase().includes('integração')) return 'MI';
    
    // Se não encontrar sigla específica, pega as primeiras letras das palavras principais
    const words = cleanName.split(' ').filter(word => 
      word.length > 2 && 
      !['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'para', 'pela', 'pelo'].includes(word.toLowerCase())
    );
    
    if (words.length >= 2) {
      return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
    } else if (words.length === 1) {
      return words[0].substring(0, 3).toUpperCase();
    }
    
    return cleanName.substring(0, 4).toUpperCase();
  };

  const getModalityInfo = (modalidade: string) => {
    if (modalidade.includes('99')) return { text: '99 - A Definir', color: 'bg-amber-100 text-amber-800' };
    if (modalidade.includes('90')) return { text: '90 - Aplicação Direta', color: 'bg-green-100 text-green-800' };
    if (modalidade.includes('31')) return { text: '31 - Estados/DF', color: 'bg-blue-100 text-blue-800' };
    if (modalidade.includes('41')) return { text: '41 - Municípios', color: 'bg-purple-100 text-purple-800' };
    if (modalidade.includes('50')) return { text: '50 - Instituições', color: 'bg-cyan-100 text-cyan-800' };
    return { text: 'Modalidade', color: 'bg-gray-100 text-gray-800' };
  };

  const getRPInfo = (rp: string) => {
    if (rp.includes('6')) return { text: 'RP6', color: 'bg-indigo-100 text-indigo-800' };
    if (rp.includes('7')) return { text: 'RP7', color: 'bg-violet-100 text-violet-800' };
    if (rp.includes('8')) return { text: 'RP8', color: 'bg-pink-100 text-pink-800' };
    return { text: 'RP', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Indicador de scroll horizontal */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center justify-center text-xs text-blue-700">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span>Role horizontalmente para ver todas as colunas</span>
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                Ano
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                Ação / Projeto
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Dotação
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Ministério
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Autor
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                RP
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Modalidade
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Relacionamento
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEmendas.data.map((emenda, index) => {
              const ministryInfo = getMinistryInfo(emenda.orgao_orcamentario);
              const modalityInfo = getModalityInfo(emenda.modalidade_de_aplicacao);
              const rpInfo = getRPInfo(emenda.resultado_primario);
              const actionDescription = getActionDescription(emenda.acao, emenda.objeto_da_emenda);

              return (
                <tr 
                  key={`${emenda.ano}-${emenda.numero_sequencial}-${index}`}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                  onClick={() => onRowClick(emenda)}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-600 bg-slate-50 px-1 py-1 rounded text-center">
                      {emenda.ano}
                    </div>
                  </td>
                  
                  <td className="px-3 py-2">
                    <div className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                      {actionDescription}
                    </div>
                  </td>
                  
                  <td className="px-2 py-2 whitespace-nowrap text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {formatCurrencyCompact(emenda.dotacao_atual || 0)}
                    </div>
                  </td>
                  
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center justify-center px-1 py-1 rounded text-xs font-medium border ${ministryInfo.color} min-w-[40px] gap-1`}>
                      <span className="flex-shrink-0">{ministryInfo.icon}</span>
                      <span className="truncate">{getMinistryAcronym(emenda.orgao_orcamentario)}</span>
                    </span>
                  </td>
                  
                  <td className="px-2 py-2">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {emenda.autor}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {emenda.uf_favorecida} • {emenda.partido || emenda.codigo_funcional_autor}
                    </div>
                  </td>
                  
                  <td className="px-2 py-2 whitespace-nowrap text-center">
                    <span className={`inline-block px-1 py-1 text-xs rounded font-medium ${rpInfo.color} w-full`}>
                      {rpInfo.text}
                    </span>
                  </td>
                  
                  <td className="px-2 py-2 whitespace-nowrap text-center">
                    <span className={`inline-block px-1 py-1 text-xs rounded font-medium ${modalityInfo.color} w-full truncate`}>
                      {modalityInfo.text}
                    </span>
                  </td>
                  
                  <td className="px-2 py-2 whitespace-nowrap text-center">
                    {emenda.hasRelationship ? (
                      <span className="inline-flex items-center px-1 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded font-medium">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="5" r="2.5"/>
                          <path d="M10 9c-2.5 0-4.5 1.5-4.5 3.5v2.5h9v-2.5c0-2-2-3.5-4.5-3.5z"/>
                          <circle cx="5" cy="4" r="2" opacity="0.6"/>
                          <path d="M5 7.5c-2 0-3.5 1.2-3.5 2.8v2.2h3.5v-1.5c0-1.2 0.8-2.2 2-2.8h-2z" opacity="0.6"/>
                          <circle cx="15" cy="4" r="2" opacity="0.6"/>
                          <path d="M15 7.5c2 0 3.5 1.2 3.5 2.8v2.2h-3.5v-1.5c0-1.2-0.8-2.2-2-2.8h2z" opacity="0.6"/>
                        </svg>
                        Relacionamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1 py-1 bg-gray-50 border border-gray-200 text-gray-500 text-xs rounded font-medium">
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Sem Relacionamento
                      </span>
                    )}
                  </td>
                  
                  <td className="px-2 py-2 whitespace-nowrap text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(emenda);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      title="Ver detalhes"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Paginação da tabela */}
      {paginatedEmendas.totalPages > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {currentPage * ITEMS_PER_PAGE + 1} - {Math.min((currentPage + 1) * ITEMS_PER_PAGE, paginatedEmendas.totalItems)} de {paginatedEmendas.totalItems} emendas
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <div className="flex space-x-1">
                {Array.from({ length: paginatedEmendas.totalPages }, (_, i) => {
                  // Mostrar apenas algumas páginas próximas à atual
                  const shouldShow = paginatedEmendas.totalPages <= 7 || 
                                   i === 0 || 
                                   i === paginatedEmendas.totalPages - 1 ||
                                   Math.abs(i - currentPage) <= 2;
                  
                  if (!shouldShow) {
                    // Mostrar "..." se necessário
                    if (i === currentPage - 3 && currentPage > 3) {
                      return <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-500">...</span>;
                    }
                    if (i === currentPage + 3 && currentPage < paginatedEmendas.totalPages - 4) {
                      return <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-500">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-2 py-1 text-xs rounded min-w-[28px] ${
                        currentPage === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(paginatedEmendas.totalPages - 1, currentPage + 1))}
                disabled={currentPage === paginatedEmendas.totalPages - 1}
                className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Indicador de linhas vazias se houver poucas emendas */}
      {emendas.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma emenda encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros para encontrar resultados.</p>
        </div>
      )}
    </div>
  );
}
