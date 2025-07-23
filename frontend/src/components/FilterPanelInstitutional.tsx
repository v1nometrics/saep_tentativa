'use client';

import React, { useState, useEffect } from 'react';

interface Ministry {
  ministry: string;
  sigla?: string;
  count: number;
  has_relationship?: boolean;
}

interface FilterPanelProps {
  loading: boolean;
  summary: any;
  selectedYears: number[];
  setSelectedYears: (years: number[]) => void;
  selectedRP: number[];
  setSelectedRP: (rp: number[]) => void;
  selectedModalidades: string[];
  setSelectedModalidades: (modalidades: string[]) => void;
  selectedMinistries: string[];
  setSelectedMinistries: (ministries: string[]) => void;
  showOnlyRelatedMinistries: boolean;
  setShowOnlyRelatedMinistries: (show: boolean) => void;
  selectedUFs: string[];
  setSelectedUFs: (ufs: string[]) => void;
  selectedPartidos: string[];
  setSelectedPartidos: (partidos: string[]) => void;
  minDotacaoAtual: number;
  setMinDotacaoAtual: (value: number) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onExportData?: () => void;
  totalFilteredRecords?: number;
  // Ordenação global
  sortField: string;
  setSortField: (field: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
}

export function FilterPanelInstitutional({
  loading,
  summary,
  selectedYears,
  setSelectedYears,
  selectedRP,
  setSelectedRP,
  selectedModalidades,
  setSelectedModalidades,
  selectedMinistries,
  setSelectedMinistries,
  showOnlyRelatedMinistries,
  setShowOnlyRelatedMinistries,
  selectedUFs,
  setSelectedUFs,
  selectedPartidos,
  setSelectedPartidos,
  minDotacaoAtual,
  setMinDotacaoAtual,
  onApplyFilter,
  onClearFilter,
  onExportData,
  totalFilteredRecords = 0,
  // Ordenação global
  sortField,
  setSortField,
  sortDirection,
  setSortDirection
}: FilterPanelProps) {
  const [yearsDropdownOpen, setYearsDropdownOpen] = useState(false);
  const [rpDropdownOpen, setRpDropdownOpen] = useState(false);
  const [modalidadesDropdownOpen, setModalidadesDropdownOpen] = useState(false);
  const [ministriesDropdownOpen, setMinistriesDropdownOpen] = useState(false);
  const [ufDropdownOpen, setUfDropdownOpen] = useState(false);
  const [partidoDropdownOpen, setPartidoDropdownOpen] = useState(false);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const updateDropdownState = (type: string, state: boolean) => {
        const container = document.querySelector(`[data-dropdown-type="${type}"]`);
        if (container) {
          container.setAttribute('data-dropdown-active', state.toString());
        }
      };
      
      if (!target.closest('[data-dropdown-type="years"]')) {
        setYearsDropdownOpen(false);
        updateDropdownState('years', false);
      }
      if (!target.closest('[data-dropdown-type="rp"]')) {
        setRpDropdownOpen(false);
        updateDropdownState('rp', false);
      }
      if (!target.closest('[data-dropdown-type="modalidades"]')) {
        setModalidadesDropdownOpen(false);
        updateDropdownState('modalidades', false);
      }
      if (!target.closest('[data-dropdown-type="ministries"]')) {
        setMinistriesDropdownOpen(false);
        updateDropdownState('ministries', false);
      }
      if (!target.closest('[data-dropdown-type="ufs"]')) {
        setUfDropdownOpen(false);
        updateDropdownState('ufs', false);
      }
      if (!target.closest('[data-dropdown-type="partidos"]')) {
        setPartidoDropdownOpen(false);
        updateDropdownState('partidos', false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Fechar todos os dropdowns e remover estado ativo
        ['years', 'rp', 'modalidades', 'ministries', 'ufs', 'partidos'].forEach(type => {
          const container = document.querySelector(`[data-dropdown-type="${type}"]`);
          if (container) {
            container.setAttribute('data-dropdown-active', 'false');
          }
        });
        setYearsDropdownOpen(false);
        setRpDropdownOpen(false);
        setModalidadesDropdownOpen(false);
        setMinistriesDropdownOpen(false);
        setUfDropdownOpen(false);
        setPartidoDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const modalidadeOptions = [
    { value: '99', name: '99 - A Definir', description: 'Modalidade a ser definida' },
    { value: '90', name: '90 - Aplicação Direta', description: 'Aplicação direta pelo órgão' },
    { value: '31', name: '31 - Estados e DF', description: 'Transferência para estados' },
    { value: '41', name: '41 - Municípios', description: 'Transferência para municípios' },
    { value: '50', name: '50 - Instituições', description: 'Transferência para instituições' }
  ];

  const rpOptions = [
    { value: 6, name: 'RP6 - Individual', description: 'Emendas individuais' },
    { value: 7, name: 'RP7 - Bancada', description: 'Emendas de bancada estadual' },
    { value: 8, name: 'RP8 - Comissão', description: 'Emendas de comissão' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-6 w-32"></div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded mb-3 w-24"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Filtros de Análise</h2>
      </div>

      <div className="space-y-6">
        {/* Ordenação Global */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{marginTop: '1px'}}>
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3z" clipRule="evenodd" />
              </svg>
              <span>Ordenação Global</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Campo de Ordenação */}
            <div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              >
                <option value="ano">Ano</option>
                <option value="acao">Ação</option>
                <option value="autor">Autor</option>
                <option value="dotacao_atual">Dotação Atual</option>
                <option value="orgao_orcamentario">Ministério</option>
                <option value="modalidade_de_aplicacao">Modalidade</option>
                <option value="resultado_primario">RP</option>
                <option value="uf_favorecida">UF</option>
                <option value="partido">Partido</option>
              </select>
            </div>
            
            {/* Direção da Ordenação */}
            <div>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              >
                {/* Opções dinâmicas baseadas no tipo de campo */}
                {['dotacao_atual', 'ano'].includes(sortField) ? (
                  <>
                    <option value="desc">Maior → Menor</option>
                    <option value="asc">Menor → Maior</option>
                  </>
                ) : (
                  <>
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          {/* Indicador visual da ordenação ativa */}
          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-300">
            <span className="flex items-center space-x-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              <span>
                Ordenando por: <strong>
                  {sortField === 'ano' && 'Ano'}
                  {sortField === 'acao' && 'Ação'}
                  {sortField === 'autor' && 'Autor'}
                  {sortField === 'dotacao_atual' && 'Dotação Atual'}
                  {sortField === 'orgao_orcamentario' && 'Ministério'}
                  {sortField === 'modalidade_de_aplicacao' && 'Modalidade'}
                  {sortField === 'resultado_primario' && 'RP'}
                  {sortField === 'uf_favorecida' && 'UF'}
                  {sortField === 'partido' && 'Partido'}
                </strong> ({['dotacao_atual', 'ano'].includes(sortField) 
                  ? (sortDirection === 'desc' ? 'Maior → Menor' : 'Menor → Maior')
                  : (sortDirection === 'asc' ? 'A → Z' : 'Z → A')
                })
              </span>
            </span>
          </div>
        </div>

        {/* Filtro Anos */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>Anos de Exercício</span>
            </span>
          </label>
          <div className="relative dropdown-container" data-dropdown-type="years">
            <button
              onClick={() => {
                const newState = !yearsDropdownOpen;
                setYearsDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="years"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedYears.length === 0 
                  ? "Selecione os anos" 
                  : selectedYears.length === summary?.years_covered?.length 
                    ? `Todos selecionados (${summary?.years_covered?.length || 0})` 
                    : `${selectedYears.length} ano(s) selecionado(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${yearsDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {yearsDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {summary?.years_covered?.map((year: number) => (
                    <label key={year} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedYears.includes(year)} 
                          onChange={() => {
                            setSelectedYears(
                              selectedYears.includes(year) 
                                ? selectedYears.filter(y => y !== year) 
                                : [...selectedYears, year]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedYears.includes(year) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedYears.includes(year) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="flex-1 font-medium">{year}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedYears(summary?.years_covered || [])}
            >
              Marcar todos
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedYears([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro RP */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
              <span>Resultado Primário</span>
            </span>
          </label>
          <div className="relative dropdown-container" data-dropdown-type="rp">
            <button
              onClick={() => {
                const newState = !rpDropdownOpen;
                setRpDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="rp"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedRP.length === 0 
                  ? "Selecione o RP" 
                  : selectedRP.length === rpOptions.length 
                    ? `Todos selecionados (${rpOptions.length})` 
                    : `${selectedRP.length} RP(s) selecionado(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${rpDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {rpDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {rpOptions.map((rp) => (
                    <label key={rp.value} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedRP.includes(rp.value)} 
                          onChange={() => {
                            setSelectedRP(
                              selectedRP.includes(rp.value) 
                                ? selectedRP.filter(r => r !== rp.value) 
                                : [...selectedRP, rp.value]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedRP.includes(rp.value) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedRP.includes(rp.value) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{rp.name}</div>
                        <div className="text-xs text-gray-500">{rp.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedRP(rpOptions.map(rp => rp.value))}
            >
              Marcar todos
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedRP([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro Modalidades */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <span>Modalidade de Aplicação</span>
            </span>
          </label>
          <div className="relative dropdown-container" data-dropdown-type="modalidades">
            <button
              onClick={() => {
                const newState = !modalidadesDropdownOpen;
                setModalidadesDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="modalidades"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedModalidades.length === 0 
                  ? "Selecione as modalidades" 
                  : selectedModalidades.length === modalidadeOptions.length 
                    ? `Todos selecionados (${modalidadeOptions.length})` 
                    : `${selectedModalidades.length} modalidade(s) selecionada(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${modalidadesDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {modalidadesDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {modalidadeOptions.map((modalidade) => (
                    <label key={modalidade.value} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedModalidades.includes(modalidade.value)} 
                          onChange={() => {
                            setSelectedModalidades(
                              selectedModalidades.includes(modalidade.value) 
                                ? selectedModalidades.filter(m => m !== modalidade.value) 
                                : [...selectedModalidades, modalidade.value]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedModalidades.includes(modalidade.value) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedModalidades.includes(modalidade.value) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{modalidade.name}</div>
                        <div className="text-xs text-gray-500">{modalidade.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedModalidades(modalidadeOptions.map(m => m.value))}
            >
              Marcar todos
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedModalidades([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro Ministérios */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
              </svg>
              <span>Órgãos Orçamentários</span>
            </span>
          </label>
          
          {/* Toggle para relacionamento */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="relative">
              <input 
                type="checkbox" 
                id="relacionamento-toggle"
                className="sr-only" 
                checked={showOnlyRelatedMinistries}
                onChange={(e) => setShowOnlyRelatedMinistries(e.target.checked)}
              />
              <div className={`w-4 h-4 rounded border-2 transition-all ${
                showOnlyRelatedMinistries 
                  ? 'bg-slate-600 border-slate-600' 
                  : 'border-gray-300 hover:border-slate-400'
              }`}>
                {showOnlyRelatedMinistries && (
                  <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <label htmlFor="relacionamento-toggle" className="text-sm text-gray-700 font-medium cursor-pointer">
              Apenas órgãos com relacionamento prévio
            </label>
          </div>
          
          <div className="relative dropdown-container" data-dropdown-type="ministries">
            <button
              onClick={() => {
                const newState = !ministriesDropdownOpen;
                setMinistriesDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="ministries"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedMinistries.length === 0 
                  ? "Selecione os órgãos" 
                  : selectedMinistries.length === (summary?.all_ministries?.length || 0)
                    ? `Todos selecionados (${summary?.all_ministries?.length || 0})`
                    : `${selectedMinistries.length} órgão(s) selecionado(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${ministriesDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {ministriesDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {(summary?.all_ministries || [])
                    .filter((ministry: any) => !showOnlyRelatedMinistries || ministry.has_relationship)
                    .map((ministry: any) => (
                    <label key={ministry.ministry} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedMinistries.includes(ministry.ministry)} 
                          onChange={() => {
                            setSelectedMinistries(
                              selectedMinistries.includes(ministry.ministry) 
                                ? selectedMinistries.filter(m => m !== ministry.ministry) 
                                : [...selectedMinistries, ministry.ministry]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedMinistries.includes(ministry.ministry) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedMinistries.includes(ministry.ministry) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {ministry.sigla ? `${ministry.sigla} - ` : ''}{ministry.ministry}
                        </div>
                        <div className="text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>{ministry.count} emenda(s)</span>
                            {ministry.has_relationship ? (
                              <span className="flex items-center space-x-1 text-emerald-600">
                                <span>•</span>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
                                <span>Relacionamento</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-gray-500">
                                <span>•</span>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                                </svg>
                                <span>Sem Relacionamento</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => {
                // Desmarcar "relacionamento prévio" quando marcar todos
                setShowOnlyRelatedMinistries(false);
                // Selecionar todos os ministérios
                setSelectedMinistries(
                  (summary?.all_ministries || []).map((m: Ministry) => m.ministry)
                );
              }}
            >
              Marcar todos
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedMinistries([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro UF Favorecida */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              <span>UF Favorecida</span>
            </span>
          </label>
          <div className="relative dropdown-container" data-dropdown-type="ufs">
            <button
              onClick={() => {
                const newState = !ufDropdownOpen;
                setUfDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="ufs"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedUFs.length === 0 
                  ? "Selecione as UFs" 
                  : selectedUFs.length === (summary?.unique_ufs?.length || 0)
                    ? `Todos selecionados (${summary?.unique_ufs?.length || 0})` 
                    : `${selectedUFs.length} UF(s) selecionada(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${ufDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {ufDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {(summary?.unique_ufs || []).sort().map((uf: string) => (
                    <label key={uf} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedUFs.includes(uf)} 
                          onChange={() => {
                            setSelectedUFs(
                              selectedUFs.includes(uf) 
                                ? selectedUFs.filter(u => u !== uf) 
                                : [...selectedUFs, uf]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedUFs.includes(uf) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedUFs.includes(uf) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">{uf}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedUFs(summary?.unique_ufs || [])}
            >
              Marcar todas
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedUFs([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro Partido do Autor */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a1 1 0 00-2 0v14a1 1 0 002 0V3z"/>
                <path d="M4 4h10a1 1 0 01.8 1.6L12 8l2.8 2.4A1 1 0 0114 12H4V4z"/>
              </svg>
              <span>Partido do Autor</span>
            </span>
          </label>
          <div className="relative dropdown-container" data-dropdown-type="partidos">
            <button
              onClick={() => {
                const newState = !partidoDropdownOpen;
                setPartidoDropdownOpen(newState);
                const container = document.querySelector('[data-dropdown-type="partidos"]');
                if (container) {
                  container.setAttribute('data-dropdown-active', newState.toString());
                }
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all flex items-center justify-between hover:bg-gray-100"
            >
              <span className="text-sm">
                {selectedPartidos.length === 0 
                  ? "Selecione os partidos" 
                  : selectedPartidos.length === (summary?.unique_partidos?.length || 0)
                    ? `Todos selecionados (${summary?.unique_partidos?.length || 0})` 
                    : `${selectedPartidos.length} partido(s) selecionado(s)`
                }
              </span>
              <svg className={`w-4 h-4 transition-transform ${partidoDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {partidoDropdownOpen && (
              <div className="dropdown-menu">
                <div className="space-y-2">
                  {(summary?.unique_partidos || []).sort().map((partido: string) => (
                    <label key={partido} className="flex items-center space-x-3 text-gray-700 text-sm cursor-pointer hover:text-slate-800 transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={selectedPartidos.includes(partido)} 
                          onChange={() => {
                            setSelectedPartidos(
                              selectedPartidos.includes(partido) 
                                ? selectedPartidos.filter(p => p !== partido) 
                                : [...selectedPartidos, partido]
                            );
                          }}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          selectedPartidos.includes(partido) 
                            ? 'bg-slate-600 border-slate-600' 
                            : 'border-gray-300 hover:border-slate-400'
                        }`}>
                          {selectedPartidos.includes(partido) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">{partido}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedPartidos(summary?.unique_partidos || [])}
            >
              Marcar todos
            </button>
            <button 
              className="text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded flex-1 font-medium" 
              onClick={() => setSelectedPartidos([])}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Filtro Financeiro - Dotação Atual */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
              <span>Valor Mínimo da Dotação Atual</span>
            </span>
          </label>
          
          <div className="space-y-3">
            {/* Campo de valor mínimo */}
            <div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                <input
                  type="text"
                  value={minDotacaoAtual > 0 ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minDotacaoAtual) : ''}
                  onChange={(e) => {
                    // Remove formatação e converte para número
                    const cleanValue = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                    const value = parseFloat(cleanValue);
                    setMinDotacaoAtual(isNaN(value) ? 0 : value);
                  }}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all text-sm"
                  placeholder="0,00"
                  min="0"
                />
              </div>
            </div>

            {/* Botões de sugestão compactos - ADITIVOS */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 100000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 100k ao valor atual"
              >
                +100k
              </button>
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 500000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 500k ao valor atual"
              >
                +500k
              </button>
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 1000000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 1M ao valor atual"
              >
                +1M
              </button>
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 5000000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 5M ao valor atual"
              >
                +5M
              </button>
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 10000000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 10M ao valor atual"
              >
                +10M
              </button>
              <button
                onClick={() => setMinDotacaoAtual(minDotacaoAtual + 50000000)}
                className="text-xs bg-gray-100 hover:bg-slate-200 text-gray-700 px-2 py-1 rounded-md transition-all"
                title="Adicionar 50M ao valor atual"
              >
                +50M
              </button>
            </div>

            {/* Botões de ação compactos */}
            <div className="flex space-x-1">
              <button 
                className="text-xs bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md transition-all flex-1 font-medium"
                onClick={onApplyFilter}
              >
                Aplicar
              </button>
              <button 
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-all"
                onClick={onClearFilter}
              >
                Limpar
              </button>
            </div>

            {/* Botão de Exportação no Painel de Filtros */}
            {onExportData && totalFilteredRecords > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={onExportData}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Exportar</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
