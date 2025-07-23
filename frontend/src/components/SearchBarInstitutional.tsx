import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
  clearTrigger?: boolean; // Nova prop para limpar externamente
}

export default function SearchBarInstitutional({ 
  onSearch, 
  placeholder = "Buscar emendas parlamentares...", 
  isSearching = false,
  className = "",
  clearTrigger = false
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Efeito para limpar o campo quando clearTrigger muda
  useEffect(() => {
    if (clearTrigger) {
      setSearchTerm('');
    }
  }, [clearTrigger]);

  const handleSearch = () => {
    onSearch(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Barra de busca institucional */}
      <div className="relative w-full flex space-x-3">
        {/* Container do input com ícone */}
        <div className="relative flex-1">
          {/* Ícone de busca */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg 
              className={`h-5 w-5 transition-colors duration-200 ${
                isSearching ? 'text-slate-600' : 'text-gray-400'
              }`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>

          {/* Input de busca */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-base shadow-sm hover:border-gray-400"
          />

          {/* Botão de limpar */}
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Botão de buscar */}
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchTerm.trim()}
          className="px-6 py-4 btn-institutional disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 shadow-sm whitespace-nowrap flex items-center space-x-2"
        >
          {isSearching ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar</span>
            </>
          )}
        </button>
      </div>

      {/* Dicas de busca sutil */}
      {!searchTerm && (
        <div className="mt-3 text-xs text-gray-500">
          <span className="font-medium">Dicas:</span> Busque por autor, órgão, valor ou código da emenda
        </div>
      )}
    </div>
  );
}
