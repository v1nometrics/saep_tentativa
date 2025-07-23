'use client';

import React from 'react';
import { getMinistryInfo } from './icons/ministryIcons';
import { Opportunity } from '@/lib/api';

interface EmendaCardCompactProps {
  emenda: Opportunity & { hasRelationship: boolean };
  onClick: (emenda: Opportunity & { hasRelationship: boolean }) => void;
}

export function EmendaCardCompact({ emenda, onClick }: EmendaCardCompactProps) {
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

  // Formatação do nome do ministério (remover códigos)
  const formatMinistryName = (name: string) => {
    return name.replace(/^\d+\s*-\s*/, '').trim();
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

  const getModalityInfo = (modalidade: string) => {
    if (modalidade.includes('99')) return { text: 'A Definir', color: 'bg-amber-100 text-amber-800' };
    if (modalidade.includes('90')) return { text: 'Aplicação Direta', color: 'bg-green-100 text-green-800' };
    if (modalidade.includes('31')) return { text: 'Estados/DF', color: 'bg-blue-100 text-blue-800' };
    if (modalidade.includes('41')) return { text: 'Municípios', color: 'bg-purple-100 text-purple-800' };
    if (modalidade.includes('50')) return { text: 'Instituições', color: 'bg-cyan-100 text-cyan-800' };
    return { text: 'Modalidade', color: 'bg-gray-100 text-gray-800' };
  };

  const getRPInfo = (rp: string) => {
    if (rp.includes('6')) return { text: 'RP6', color: 'bg-indigo-100 text-indigo-800' };
    if (rp.includes('7')) return { text: 'RP7', color: 'bg-violet-100 text-violet-800' };
    if (rp.includes('8')) return { text: 'RP8', color: 'bg-pink-100 text-pink-800' };
    return { text: 'RP', color: 'bg-gray-100 text-gray-800' };
  };

  const ministryInfo = getMinistryInfo(emenda.orgao_orcamentario);
  const modalityInfo = getModalityInfo(emenda.modalidade_de_aplicacao);
  const rpInfo = getRPInfo(emenda.resultado_primario);
  const actionDescription = getActionDescription(emenda.acao, emenda.objeto_da_emenda);

  return (
    <div 
      onClick={() => onClick(emenda)}
      className="group bg-white border border-gray-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in-up h-80 flex flex-col"
    >
      {/* Header compacto: Ano + RP + Modalidade + Relacionamento + Valor */}
      <div className="flex justify-between items-start mb-3 flex-shrink-0">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium text-gray-600 bg-slate-50 px-2 py-1 rounded">
              {emenda.ano}
            </div>
            {/* Tags RP e Modalidade */}
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-md font-medium ${rpInfo.color}`}>
              {rpInfo.text}
            </span>
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-md font-medium ${modalityInfo.color}`}>
              {modalityInfo.text}
            </span>
          </div>
          
          {/* Tag de relacionamento logo abaixo */}
          <div className="whitespace-nowrap">
            {emenda.hasRelationship ? (
              <span className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md font-medium whitespace-nowrap">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  {/* Pessoa da frente (centralizada) */}
                  <circle cx="10" cy="5" r="2.5"/>
                  <path d="M10 9c-2.5 0-4.5 1.5-4.5 3.5v2.5h9v-2.5c0-2-2-3.5-4.5-3.5z"/>
                  {/* Pessoa da esquerda (atrás) */}
                  <circle cx="5" cy="4" r="2" opacity="0.6"/>
                  <path d="M5 7.5c-2 0-3.5 1.2-3.5 2.8v2.2h3.5v-1.5c0-1.2 0.8-2.2 2-2.8h-2z" opacity="0.6"/>
                  {/* Pessoa da direita (atrás) */}
                  <circle cx="15" cy="4" r="2" opacity="0.6"/>
                  <path d="M15 7.5c2 0 3.5 1.2 3.5 2.8v2.2h-3.5v-1.5c0-1.2-0.8-2.2-2-2.8h2z" opacity="0.6"/>
                </svg>
                <span className="flex-shrink-0">Relacionamento</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-md font-medium whitespace-nowrap">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                </svg>
                <span className="flex-shrink-0">Sem Relacionamento</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right flex-shrink-0 ml-2">
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
            <div className="text-base font-bold text-slate-800">
              {formatCurrencyCompact(emenda.dotacao_atual || 0)}
            </div>
            <div className="text-xs text-gray-500 text-center">
              Dotação Atual
            </div>
          </div>
        </div>
      </div>

      {/* Content area com grid para garantir posicionamento fixo */}
      <div className="flex-1 grid grid-rows-[40px,auto,auto] gap-3 max-w-full overflow-hidden">
        {/* Título da Ação - Container com altura fixa de 40px (2 linhas) */}
        <div className="flex-shrink-0 h-[40px] overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-900 leading-5 group-hover:text-slate-700 transition-colors line-clamp-2">
            {actionDescription}
          </h3>
        </div>

        {/* Ministério - Posição fixa na grid com truncamento otimizado */}
        <div className="flex-shrink-0 self-start">
          <div 
            className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${ministryInfo.color}`}
            style={{ maxWidth: '100%' }}
          >
            {/* Wrapper flex para garantir alinhamento vertical */}
            <div className="flex items-center">
              {/* Ícone sempre visível */}
              <div className="flex-shrink-0 mr-1.5">
                {ministryInfo.icon}
              </div>
              
              {/* Texto com limite restrito e overflow visível */}
              <div 
                className="truncate"
                style={{ 
                  maxWidth: '194.3px', // Valor limitado para forçar truncamento em nomes longos
                  display: 'block',
                }}
              >
                {formatMinistryName(emenda.orgao_orcamentario)}
              </div>
            </div>
          </div>
        </div>

        {/* Autor completo com partido e cargo - Posição fixa na grid */}
        <div className="flex-shrink-0 self-start w-full overflow-hidden mb-4">
          <div className="text-sm font-medium text-gray-900 truncate leading-tight max-w-full">
            {emenda.autor}
          </div>
          <div className="text-xs text-gray-600 truncate leading-tight whitespace-nowrap overflow-hidden">
            <span className="inline-flex items-center space-x-1">
              <span className="truncate">{emenda.uf_favorecida}</span>
              <span className="flex-shrink-0"> • </span>
              <span className="truncate">{emenda.partido || emenda.codigo_funcional_autor}</span>
              <span className="flex-shrink-0"> • </span>
              <span className="truncate">{emenda.tipo_autor || emenda.tipo_emenda}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer fixo com altura padronizada */}
      <div className="flex items-center justify-end pt-2 border-t border-gray-100 flex-shrink-0 h-8">
        <button className="text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors flex items-center space-x-1">
          <span>Ver detalhes</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
