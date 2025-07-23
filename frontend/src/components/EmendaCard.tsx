'use client';

import React from 'react';
import { getMinistryInfo } from './icons/ministryIcons';
import { Opportunity } from '../lib/api';

interface EmendaCardProps {
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
            <span className="inline-flex items-center px-2 py-1 bg-green-50 border border-green-200 text-green-800 text-xs rounded-md font-medium">
              ✓ Oportunidade
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
          <span>{ministryInfo.icon}</span>
          <span>{formatMinistryName(emenda.orgao_orcamentario)}</span>
        </div>
      </div>

      {/* Informações do Autor */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{emenda.autor}</div>
            <div className="text-xs text-gray-600">
              {emenda.partido} - {emenda.uf_favorecida} • {emenda.ano}
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
            {emenda.tipo_autor || 'Individual'}
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
          Código: {emenda.identificacao_emenda}
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