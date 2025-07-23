'use client';

import React from 'react';
import { Opportunity } from '../lib/api';

interface Emen              {emenda.hasRelationship && (
                <span className="inline-flex items-center px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg font-semibold shadow-sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                  Relacionamento Identificado
                </span>
              )}edModalProps {
  emenda: Opportunity & { hasRelationship: boolean };
  isOpen: boolean;
  onClose: () => void;
}

export function EmendaExpandedModal({ emenda, isOpen, onClose }: EmendaExpandedModalProps) {
  // Bloqueia scroll do body ao abrir o modal
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  // Formatação do nome do ministério (remover códigos)
  const formatMinistryName = (name: string) => {
    return name.replace(/^\d+\s*-\s*/, '').trim();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/50 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Detalhes da Emenda</h2>
              <p className="text-sm text-gray-600 font-medium">{emenda.identificacao_emenda}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Tags e Status - Layout melhorado */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {emenda.hasRelationship && (
                <span className="inline-flex items-center px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg font-semibold shadow-sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                  Relacionamento Identificado
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-2 text-sm rounded-lg font-semibold border shadow-sm ${rpInfo.color}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
                {rpInfo.text}
              </span>
              <span className={`inline-flex items-center px-3 py-2 text-sm rounded-lg font-semibold border shadow-sm ${modalityInfo.color}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                </svg>
                {modalityInfo.text}
              </span>
            </div>

            {/* Título e Descrição - Layout melhorado */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2">{emenda.acao}</h3>
                    {emenda.objeto_da_emenda && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Objeto da Emenda:</h4>
                        <p className="text-sm text-gray-600 leading-relaxed bg-white/50 rounded-lg p-3 border border-gray-200/50">{emenda.objeto_da_emenda}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de Informações - Layout moderno em cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Identificação */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2C5.477 2 2 5.477 2 10s3.477 8 8 8 8-3.477 8-8-3.477-8-8-8zM8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2h.01a1 1 0 100-2H9z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-blue-900">Identificação</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-200/30">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">ID Emenda</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.identificacao_emenda}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-200/30">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Ano</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.ano}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-200/30">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Número Sequencial</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.numero_sequencial}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-200/30">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Resultado Primário</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.resultado_primario}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Autor */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-green-900">Autor da Emenda</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-green-200/30">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Nome</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.autor || 'Não informado'}</p>
                  </div>
                  {emenda.partido && (
                    <div className="bg-white/60 rounded-lg p-3 border border-green-200/30">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Partido</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.partido}</p>
                    </div>
                  )}
                  {emenda.codigo_funcional_autor && (
                    <div className="bg-white/60 rounded-lg p-3 border border-green-200/30">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Código Funcional</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.codigo_funcional_autor}</p>
                    </div>
                  )}
                  {emenda.uf_favorecida && (
                    <div className="bg-white/60 rounded-lg p-3 border border-green-200/30">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">UF Favorecida</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.uf_favorecida}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Valores Financeiros */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200/50 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-purple-900">Valores Financeiros</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg p-4 border border-purple-300/50">
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Dotação Atual</span>
                    <p className="text-lg font-bold text-purple-800 mt-1">{formatCurrency(emenda.dotacao_atual || 0)}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/60 rounded-lg p-3 border border-purple-200/30">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Dotação Inicial</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(emenda.dotacao_inicial || 0)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 border border-purple-200/30">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Empenhado</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(emenda.valor_empenhado || 0)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 border border-purple-200/30">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Liquidado</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(emenda.valor_liquidado || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção adicional: Órgão e Localização */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Card 4: Órgão Destinatário */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200/50 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-amber-900">Órgão Destinatário</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-amber-200/30">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Órgão Orçamentário</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatMinistryName(emenda.orgao_orcamentario)}</p>
                  </div>
                  {emenda.codigo_orgao_orcamentario && (
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-200/30">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Código do Órgão</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.codigo_orgao_orcamentario}</p>
                    </div>
                  )}
                  {emenda.unidade_orcamentaria && (
                    <div className="bg-white/60 rounded-lg p-3 border border-amber-200/30">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Unidade Orçamentária</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.unidade_orcamentaria}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 5: Localização */}
              <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 border border-cyan-200/50 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-cyan-900">Localização</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-cyan-200/30">
                    <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Modalidade de Aplicação</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{emenda.modalidade_de_aplicacao}</p>
                  </div>
                  {emenda.localizador && (
                    <div className="bg-white/60 rounded-lg p-3 border border-cyan-200/30">
                      <span className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Localizador</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{emenda.localizador}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer com ações melhorado */}
            <div className="mt-8 pt-6 border-t border-gray-200/50 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 font-medium"
                >
                  Fechar
                </button>
                <button className="px-5 py-2.5 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 font-medium shadow-sm">
                  Exportar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
