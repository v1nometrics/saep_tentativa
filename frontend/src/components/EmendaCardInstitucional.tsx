'use client';

import React from 'react';
import { Opportunity } from '../lib/api';

interface Em            <span className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md font-medium">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
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
              Relacionamento
            </span>rdProps {
  emenda: Opportunity & { hasRelationship: boolean };
  onClick: (emenda: Opportunity & { hasRelationship: boolean }) => void;
}

export function EmendaCardInstitucional({ emenda, onClick }: EmendaCardProps) {
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

  const getMinistryInfo = (ministry: string) => {
    // Cores institucionais baseadas no tipo de ministério com SVGs
    if (ministry.toLowerCase().includes('saúde')) return { 
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
    };
    if (ministry.toLowerCase().includes('educação')) return { 
      color: 'bg-blue-50 border-blue-200 text-blue-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>
    };
    if (ministry.toLowerCase().includes('infraestrutura')) return { 
      color: 'bg-orange-50 border-orange-200 text-orange-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
    };
    if (ministry.toLowerCase().includes('agricultura')) return { 
      color: 'bg-green-50 border-green-200 text-green-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>
    };
    if (ministry.toLowerCase().includes('desenvolvimento')) return { 
      color: 'bg-purple-50 border-purple-200 text-purple-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
    };
    if (ministry.toLowerCase().includes('cultura')) return { 
      color: 'bg-pink-50 border-pink-200 text-pink-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
    };
    if (ministry.toLowerCase().includes('meio ambiente')) return { 
      color: 'bg-teal-50 border-teal-200 text-teal-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
    };
    return { 
      color: 'bg-gray-50 border-gray-200 text-gray-800', 
      svg: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/></svg>
    };
  };

  const getModalityInfo = (modalidade: string) => {
    if (modalidade.includes('99')) return { text: 'A Definir', color: 'bg-amber-50 border-amber-200 text-amber-800' };
    if (modalidade.includes('90')) return { text: 'Aplicação Direta', color: 'bg-green-50 border-green-200 text-green-800' };
    if (modalidade.includes('31')) return { text: 'Estados e DF', color: 'bg-blue-50 border-blue-200 text-blue-800' };
    if (modalidade.includes('41')) return { text: 'Municípios', color: 'bg-purple-50 border-purple-200 text-purple-800' };
    if (modalidade.includes('50')) return { text: 'Instituições', color: 'bg-cyan-50 border-cyan-200 text-cyan-800' };
    return { text: 'Modalidade', color: 'bg-gray-50 border-gray-200 text-gray-800' };
  };

  const getRPInfo = (rp: string) => {
    if (rp.includes('6')) return { text: 'RP6 - Individual', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' };
    if (rp.includes('7')) return { text: 'RP7 - Bancada', color: 'bg-violet-50 border-violet-200 text-violet-800' };
    if (rp.includes('8')) return { text: 'RP8 - Comissão', color: 'bg-pink-50 border-pink-200 text-pink-800' };
    return { text: 'RP', color: 'bg-gray-50 border-gray-200 text-gray-800' };
  };

  const modalityInfo = getModalityInfo(emenda.modalidade_de_aplicacao);
  const rpInfo = getRPInfo(emenda.resultado_primario);
  const ministryInfo = getMinistryInfo(emenda.orgao_orcamentario);

  // Formatação do nome do ministério (remover códigos)
  const formatMinistryName = (name: string) => {
    return name.replace(/^\d+\s*-\s*/, '').trim();
  };

  return (
    <div 
      onClick={() => onClick(emenda)}
      className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-pointer animate-fade-in-up"
    >
      {/* Header com tags e valor */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {emenda.hasRelationship && (
            <span className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md font-medium">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              Relacionamento
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-md font-medium border ${rpInfo.color}`}>
            {rpInfo.text}
          </span>
          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-md font-medium border ${modalityInfo.color}`}>
            {modalityInfo.text}
          </span>
        </div>
        
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-slate-800">
            {formatCurrencyCompact(emenda.valor_empenhado)}
          </div>
          <div className="text-xs text-gray-500">
            Pago: {formatCurrencyCompact(emenda.valor_pago)}
          </div>
        </div>
      </div>

      {/* Título da Emenda */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 group-hover:text-slate-700 transition-colors line-clamp-2">
          {emenda.acao}
        </h3>
        
        {/* Informações do ministério */}
        <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium border ${ministryInfo.color}`}>
          {ministryInfo.svg}
          <span>{formatMinistryName(emenda.orgao_orcamentario)}</span>
        </div>
      </div>

      {/* Informações do Autor */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{emenda.autor || 'N/A'}</div>
            <div className="text-xs text-gray-600">
              {emenda.modalidade_de_aplicacao} • {emenda.ano}
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
            {emenda.resultado_primario}
          </div>
        </div>
      </div>

      {/* Localização e Detalhes */}
      {emenda.localizador && (
        <div className="mb-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Localização:</span> {emenda.localizador}
          </div>
        </div>
      )}

      {/* Footer com ação */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Código: {emenda.identificacao_emenda || 'N/A'}
        </div>
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
