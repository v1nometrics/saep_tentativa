'use client';

import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportIcon } from './icons/ExportIcon'; // Importando o novo ícone

interface ExportConfig {
  // Formatos de arquivo
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  
  // Configurações de dados
  includeAllFields: boolean;
  selectedFields: string[];
  
  // Filtros de dados
  dateRange: {
    enabled: boolean;
    start: string;
    end: string;
  };
  
  // Configurações de ordenação
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Configurações visuais (para PDF)
  includeLogo: boolean;
  includeStats: boolean;
  includeFilters: boolean;
  
  // Configurações de conteúdo
  maxRecords: number;
  includeHeaders: boolean;
  
  // Configurações avançadas
  encoding: 'UTF-8' | 'ISO-8859-1';
  delimiter: ',' | ';' | '\t';
  
  // Nome personalizado
  customFileName: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  summary: any;
  appliedFilters: string[];
  isSearchMode: boolean;
  searchTerm: string;
}

export function ExportModal({
  isOpen,
  onClose,
  data,
  summary,
  appliedFilters,
  isSearchMode,
  searchTerm
}: ExportModalProps) {
  // Bloqueia scroll do body ao abrir o modal
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  const [config, setConfig] = useState<ExportConfig>({
    format: 'xlsx',
    includeAllFields: true,
    selectedFields: [],
    dateRange: {
      enabled: false,
      start: '',
      end: ''
    },
    sortBy: 'dotacao_atual',
    sortOrder: 'desc',
    includeLogo: true,
    includeStats: true,
    includeFilters: true,
    maxRecords: 0, // 0 = todos
    includeHeaders: true,
    encoding: 'UTF-8',
    delimiter: ',',
    customFileName: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // Campos disponíveis para seleção
  const availableFields = [
    { key: 'codigo_emenda', label: 'Código da Emenda', essential: true },
    { key: 'ano', label: 'Ano', essential: true },
    { key: 'numero_sequencial', label: 'N.º Emenda', essential: true },
    { key: 'autor', label: 'Autor', essential: true },
    { key: 'partido', label: 'Partido', essential: false },
    { key: 'uf_favorecida', label: 'UF', essential: false },
    { key: 'orgao_orcamentario', label: 'Órgão Orçamentário', essential: true },
    { key: 'acao', label: 'Ação', essential: true },
    { key: 'dotacao_inicial', label: 'Dotação Inicial', essential: true },
    { key: 'dotacao_atual', label: 'Dotação Atual', essential: true },
    { key: 'valor_empenhado', label: 'Empenhado', essential: true },
    { key: 'modalidade_de_aplicacao', label: 'Modalidade', essential: false },
    { key: 'resultado_primario', label: 'RP', essential: false },
    { key: 'localizador_gasto', label: 'Localizador de Gasto', essential: false },
    { key: 'relacionamento', label: 'Relação', essential: false }
  ];

  // Inicializar campos selecionados
  useEffect(() => {
    if (config.includeAllFields) {
      setConfig(prev => ({
        ...prev,
        selectedFields: availableFields.map(field => field.key)
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        selectedFields: availableFields.filter(field => field.essential).map(field => field.key)
      }));
    }
  }, [config.includeAllFields]);

  // Gerar nome do arquivo automaticamente
  const generateFileName = () => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    
    let baseName = 'emendas_parlamentares';
    
    if (isSearchMode && searchTerm) {
      baseName += `_busca_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`;
    }
    
    if (appliedFilters.length > 0) {
      baseName += '_filtradas';
    }
    
    return `${baseName}_${timestamp}_${time}`;
  };

  // Calcular valor disponível
  const calculateAvailableValue = (record: any) => {
    const dotacao = record.dotacao_atual || record['Dotação Atual Emenda'] || 0;
    const empenhado = record.valor_empenhado || record['Empenhado'] || 0;
    return Math.max(0, dotacao - empenhado);
  };

  // Processar dados para exportação
  const processDataForExport = () => {
    let processedData = [...data];

    // Adicionar campos calculados
    processedData = processedData.map(record => ({
      ...record,
      valor_disponivel: calculateAvailableValue(record),
      relacionamento: record.hasRelationship ? 'Sim' : 'Não'
    }));

    // Aplicar filtro de data se habilitado
    if (config.dateRange.enabled && config.dateRange.start && config.dateRange.end) {
      const startYear = parseInt(config.dateRange.start);
      const endYear = parseInt(config.dateRange.end);
      processedData = processedData.filter(record => 
        record.ano >= startYear && record.ano <= endYear
      );
    }

    // Aplicar ordenação
    processedData.sort((a, b) => {
      const aValue = a[config.sortBy] || 0;
      const bValue = b[config.sortBy] || 0;
      
      if (config.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Limitar registros se especificado
    if (config.maxRecords > 0) {
      processedData = processedData.slice(0, config.maxRecords);
    }

    // Filtrar apenas campos selecionados
    if (!config.includeAllFields) {
      processedData = processedData.map(record => {
        const filteredRecord: any = {};
        config.selectedFields.forEach(field => {
          filteredRecord[field] = record[field];
        });
        return filteredRecord;
      });
    }

    return processedData;
  };

  // Simular progresso de exportação
  const simulateProgress = async () => {
    setCurrentStep('Processando dados...');
    setExportProgress(10);
    await new Promise(resolve => setTimeout(resolve, 500));

    setCurrentStep('Aplicando filtros...');
    setExportProgress(30);
    await new Promise(resolve => setTimeout(resolve, 500));

    setCurrentStep('Formatando arquivo...');
    setExportProgress(60);
    await new Promise(resolve => setTimeout(resolve, 800));

    setCurrentStep('Gerando arquivo...');
    setExportProgress(85);
    await new Promise(resolve => setTimeout(resolve, 600));

    setCurrentStep('Finalizando...');
    setExportProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  // Função principal de exportação
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      await simulateProgress();

      const processedData = processDataForExport();
      const fileName = config.customFileName || generateFileName();

      // Metadados para incluir no arquivo
      const metadata = {
        gerado_em: new Date().toLocaleString('pt-BR'),
        total_registros: processedData.length,
        total_original: data.length,
        filtros_aplicados: appliedFilters,
        busca_ativa: isSearchMode ? searchTerm : null,
        estatisticas: summary,
        configuracao_exportacao: {
          formato: config.format,
          campos_incluidos: config.selectedFields.length,
          ordenacao: `${config.sortBy} (${config.sortOrder})`,
          encoding: config.encoding
        }
      };

      switch (config.format) {
        case 'csv':
          await exportToCSV(processedData, fileName, metadata);
          break;
        case 'xlsx':
          await exportToExcel(processedData, fileName, metadata);
          break;
        case 'json':
          await exportToJSON(processedData, fileName, metadata);
          break;
        case 'pdf':
          await exportToPDF(processedData, fileName, metadata);
          break;
      }

      // Fechar modal após exportação bem-sucedida
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Erro na exportação:', error);
      setIsExporting(false);
      setExportProgress(0);
      alert('Erro durante a exportação. Tente novamente.');
    }
  };

  // Exportar para CSV
  const exportToCSV = async (data: any[], fileName: string, metadata: any) => {
    const BOM = '\uFEFF'; // UTF-8 BOM para Excel
    let csvContent = BOM;

    // Adicionar metadados como comentários
    if (config.includeStats) {
      csvContent += `# Relatório de Emendas Parlamentares\n`;
      csvContent += `# Gerado em: ${metadata.gerado_em}\n`;
      csvContent += `# Total de registros: ${metadata.total_registros}\n`;
      if (metadata.filtros_aplicados.length > 0) {
        csvContent += `# Filtros aplicados: ${metadata.filtros_aplicados.join('; ')}\n`;
      }
      if (metadata.busca_ativa) {
        csvContent += `# Busca ativa: "${metadata.busca_ativa}"\n`;
      }
      csvContent += `\n`;
    }

    // Headers
    if (config.includeHeaders) {
      const headers = config.selectedFields.map(field => {
        const fieldInfo = availableFields.find(f => f.key === field);
        return fieldInfo ? fieldInfo.label : field;
      });
      csvContent += headers.join(config.delimiter) + '\n';
    }

    // Dados
    data.forEach(record => {
      const row = config.selectedFields.map(field => {
        let value = record[field] || '';
        
        // Formatação especial para valores monetários
        if (field.includes('valor') || field.includes('dotacao')) {
          value = typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : value;
        }
        
        // Escapar valores que contêm o delimitador
        if (typeof value === 'string' && value.includes(config.delimiter)) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      });
      csvContent += row.join(config.delimiter) + '\n';
    });

    // Download
    const blob = new Blob([csvContent], { 
      type: `text/csv;charset=${config.encoding === 'UTF-8' ? 'utf-8' : 'iso-8859-1'}` 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Exportar para Excel (XLSX real)
  const exportToExcel = async (data: any[], fileName: string, metadata: any) => {
    // Filtrar dados com base nos campos selecionados
    const excelData = data.map(record => {
      const filteredRecord: any = {};
      config.selectedFields.forEach(field => {
        filteredRecord[field] = record[field];
      });
      return filteredRecord;
    });

    // Criar uma nova planilha
    const workbook = XLSX.utils.book_new();

    // Adicionar metadados como uma aba separada (se includeStats estiver habilitado)
    if (config.includeStats) {
      const metadataWs = XLSX.utils.aoa_to_sheet([
        ['Relatório de Emendas Parlamentares'],
        [],
        ['Gerado em:', metadata.gerado_em],
        ['Total de registros:', metadata.total_registros],
        ['Filtros aplicados:', metadata.filtros_aplicados?.join('; ') || 'Nenhum'],
        ['Busca ativa:', metadata.busca_ativa || 'Nenhuma'],
        [],
        ['Campos exportados:', config.selectedFields.join(', ')]
      ]);
      XLSX.utils.book_append_sheet(workbook, metadataWs, 'Informações');
    }

    // Criar aba principal com dados
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar largura das colunas automaticamente
    const columnWidths = config.selectedFields.map(field => {
      const maxLength = Math.max(
        field.length,
        ...excelData.map(row => String(row[field] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Limitar a 50 caracteres
    });
    worksheet['!cols'] = columnWidths;

    // Adicionar aba de dados
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    // Gerar arquivo Excel binário
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    // Criar Blob com tipo XLSX correto
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar para JSON
  const exportToJSON = async (data: any[], fileName: string, metadata: any) => {
    const exportData = {
      metadata,
      data: data.map(record => {
        const filteredRecord: any = {};
        config.selectedFields.forEach(field => {
          filteredRecord[field] = record[field];
        });
        return filteredRecord;
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Exportar para PDF com jsPDF usando autoTable para layout otimizado
  const exportToPDF = async (data: any[], fileName: string, metadata: any) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 30;
    const marginY = 30;
    
    // --- Cabeçalho estilizado ---
    doc.setFillColor('#e8f0fe');
    doc.rect(0, 0, pageWidth, 110, 'F');

    // Logo Innovatis (local)
    if (config.includeLogo) {
      try {
        const img = new Image();
        img.src = '/logo-innovatis.png';
        await new Promise<void>(res => {
          img.onload = () => res();
          img.onerror = () => res();
        });
        if (img.naturalWidth && img.naturalHeight) {
          doc.addImage(img, 'PNG', marginX, 25, 60, 60);
        }
      } catch {
        // fallback: texto
        doc.setFontSize(10);
        doc.setTextColor('#666');
        doc.text('INNOVATIS', marginX, 45);
      }
    }

    // Título e subtítulo
    doc.setFontSize(22);
    doc.setTextColor('#003366');
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Emendas Parlamentares', marginX + 80, 50);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#555');
    doc.text(`Gerado em: ${metadata.gerado_em}`, marginX + 80, 70);

    let cursorY = 140;

    // Função para adicionar seções
    const addSection = (title: string, rows: [string, string | number][]) => {
      doc.setFontSize(14);
      doc.setTextColor('#003366');
      doc.text(title, marginX, cursorY);
      cursorY += 12;
      doc.setDrawColor('#003366');
      doc.setLineWidth(0.5);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 15;

      doc.setFontSize(11);
      doc.setTextColor('#000');
      const lineHeight = 16;
      const maxValueWidth = pageWidth - (marginX + 150) - 40;
      rows.forEach(([label, value]) => {
        const valueStr = String(value ?? '');
        const wrapped = doc.splitTextToSize(valueStr, maxValueWidth);

        doc.text(`${label}:`, marginX, cursorY);
        doc.text(wrapped[0], marginX + 150, cursorY);

        for (let i = 1; i < wrapped.length; i++) {
          cursorY += lineHeight;
          doc.text(wrapped[i], marginX + 150, cursorY);
        }
        cursorY += lineHeight;

        if (cursorY > pageHeight - 80) { doc.addPage(); cursorY = 40; }
      });
      cursorY += 20;
    };

    // Metadados do relatório
    if (config.includeStats) {
      addSection('Informações do Relatório', [
        ['Total de registros', metadata.total_registros],
        ['Registros no arquivo original', metadata.total_original],
        ['Filtros aplicados', metadata.filtros_aplicados.join('; ') || 'Nenhum'],
        ['Busca ativa', metadata.busca_ativa || 'Não'],
        ['Formato de exportação', metadata.configuracao_exportacao.formato.toUpperCase()],
        ['Campos incluídos', metadata.configuracao_exportacao.campos_incluidos]
      ]);
    }

    // Dados das emendas
    addSection(`Dados das Emendas (${data.length} registros)`, []);

    // Filtrar apenas campos válidos que existem nos dados
    const validFields = config.selectedFields.filter(field => {
      const fieldInfo = availableFields.find(f => f.key === field);
      if (!fieldInfo) return false;
      
      // Verificar se pelo menos um registro tem esse campo com valor válido
      return data.some(record => {
        const value = record[field];
        return value !== undefined && value !== null && value !== '';
      });
    });

    // Preparar cabeçalhos da tabela
    const tableHeaders = validFields.map(field => {
      const fieldInfo = availableFields.find(f => f.key === field);
      return fieldInfo ? fieldInfo.label : field;
    });

    // Preparar dados da tabela
    const tableBody = data.map(record => {
      return validFields.map(field => {
        let value = record[field];
        
        // Tratar valores undefined/null
        if (value === undefined || value === null) {
          return '';
        }
        
        // Formatação de valores monetários
        if (typeof value === 'number' && (field.includes('valor') || field.includes('dotacao'))) {
          return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        
        // Converter para string
        const stringValue = String(value);
        return stringValue;
      });
    });

    // Verificar se temos dados válidos para a tabela
    if (tableHeaders.length === 0 || tableBody.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor('#ff0000');
      doc.text('Nenhum dado válido encontrado para exportação.', marginX, cursorY + 20);
      doc.save(`${fileName}.pdf`);
      return;
    }

    // Usar autoTable com configuração otimizada para ajuste automático
    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: cursorY,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      tableWidth: 'auto', // Ajuste automático da largura da tabela
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak', // Quebra de linha automática
        lineColor: '#cccccc',
        lineWidth: 0.1,
        textColor: '#333333'
      },
      headStyles: {
        fillColor: '#003366',
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 4, right: 2, bottom: 4, left: 2 },
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
        valign: 'top'
      },
      alternateRowStyles: {
        fillColor: '#f8f9fa'
      },
      didDrawPage: (data) => {
        // Adiciona numeração de página no rodapé
        doc.setFontSize(9);
        doc.setTextColor('#666');
        doc.text(
          `Página ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 15,
          { align: 'center' }
        );
      }
    });

    doc.save(`${fileName}.pdf`);
  };

  if (!isOpen) return null;

  const backdropStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={backdropStyle}
      onClick={onClose}
    >
      {/* Modal */}
      <div 
        className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <h2 className="text-xl font-bold text-white">Exportar Dados</h2>
                  <p className="text-green-100 text-sm">
                    {data.length.toLocaleString('pt-BR')} registros disponíveis para exportação
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar (durante exportação) */}
          {isExporting && (
            <div className="px-6 py-4 bg-green-50 border-b">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-green-700 mb-1">
                    <span>{currentStep}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
                <div className="animate-spin">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Resumo dos dados */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                </svg>
                Dados que serão exportados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-medium">Total de registros:</span>
                  <div className="text-lg font-bold text-green-900">{data.length.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <span className="text-green-600 font-medium">Valor total:</span>
                  <div className="text-lg font-bold text-green-900">
                    {(data.reduce((acc, item) => acc + calculateAvailableValue(item), 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <span className="text-green-600 font-medium">Busca ativa:</span>
                  <div className="text-sm text-green-800">{isSearchMode ? `"${searchTerm}"` : 'Não'}</div>
                </div>
                <div>
                  <span className="text-green-600 font-medium">Filtros ativos:</span>
                  <div className="text-sm text-green-800">{appliedFilters.length || 'Nenhum'}</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Coluna esquerda - Formato e dados */}
              <div className="space-y-6">
                {/* Formato do arquivo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Formato do arquivo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { 
                        value: 'xlsx', 
                        label: 'Excel (.xlsx)', 
                        svg: (
                          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      },
                      { 
                        value: 'csv', 
                        label: 'CSV (.csv)', 
                        svg: (
                          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      },
                      { 
                        value: 'json', 
                        label: 'JSON (.json)', 
                        svg: (
                          <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      },
                      { 
                        value: 'pdf', 
                        label: 'PDF (.pdf)', 
                        svg: (
                          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )
                      }
                    ].map((format) => (
                      <label key={format.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="format"
                          value={format.value}
                          checked={config.format === format.value}
                          onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 transition-colors ${
                          config.format === format.value
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="text-center">
                            <div className="mb-1 flex justify-center">{format.svg}</div>
                            <div className="text-sm font-medium">{format.label}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Seleção de campos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Campos a incluir
                  </label>
                  <div className="mb-3">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeAllFields}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeAllFields: e.target.checked }))}
                        className="checkbox-green"
                      />
                      <span className="ml-2 text-sm">Incluir todos os campos</span>
                    </label>
                  </div>
                  
                  {!config.includeAllFields && (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                      {availableFields.map((field) => (
                        <label key={field.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.selectedFields.includes(field.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig(prev => ({
                                  ...prev,
                                  selectedFields: [...prev.selectedFields, field.key]
                                }));
                              } else {
                                setConfig(prev => ({
                                  ...prev,
                                  selectedFields: prev.selectedFields.filter(f => f !== field.key)
                                }));
                              }
                            }}
                            className="checkbox-green"
                          />
                          <span className="ml-2 text-sm">
                            {field.label}
                            {field.essential && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nome do arquivo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome do arquivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={config.customFileName}
                    onChange={(e) => setConfig(prev => ({ ...prev, customFileName: e.target.value }))}
                    placeholder={generateFileName()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se não informado, será gerado automaticamente com timestamp
                  </p>
                </div>
              </div>

              {/* Coluna direita - Configurações avançadas */}
              <div className="space-y-6">
                {/* Ordenação */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Ordenação dos dados
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Ordenar por</label>
                      <select
                        value={config.sortBy}
                        onChange={(e) => setConfig(prev => ({ ...prev, sortBy: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="dotacao_atual">Valor da Dotação</option>
                        <option value="ano">Ano</option>
                        <option value="autor">Autor</option>
                        <option value="orgao_orcamentario">Órgão</option>
                        <option value="uf_favorecida">UF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Ordem</label>
                      <select
                        value={config.sortOrder}
                        onChange={(e) => setConfig(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="desc">Maior para menor</option>
                        <option value="asc">Menor para maior</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filtro de data */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Filtro adicional por período
                  </label>
                  <div className="mb-3">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={config.dateRange.enabled}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, enabled: e.target.checked }
                        }))}
                        className="checkbox-green"
                      />
                      <span className="ml-2 text-sm">Filtrar por período específico</span>
                    </label>
                  </div>
                  
                  {config.dateRange.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Ano inicial</label>
                        <input
                          type="number"
                          min="2015"
                          max="2030"
                          value={config.dateRange.start}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Ano final</label>
                        <input
                          type="number"
                          min="2015"
                          max="2030"
                          value={config.dateRange.end}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Configurações de conteúdo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Configurações de conteúdo
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeHeaders}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                        className="checkbox-green"
                      />
                      <span className="ml-2 text-sm">Incluir cabeçalhos</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.includeStats}
                        onChange={(e) => setConfig(prev => ({ ...prev, includeStats: e.target.checked }))}
                        className="checkbox-green"
                      />
                      <span className="ml-2 text-sm">Incluir estatísticas e metadados</span>
                    </label>

                    {config.format === 'pdf' && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.includeLogo}
                          onChange={(e) => setConfig(prev => ({ ...prev, includeLogo: e.target.checked }))}
                          className="checkbox-green"
                        />
                        <span className="ml-2 text-sm">Incluir logo da Innovatis</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Limite de registros */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Limite de registros (0 = todos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.maxRecords}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxRecords: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Para teste ou relatórios específicos. Deixe 0 para exportar todos os registros.
                  </p>
                </div>

                {/* Configurações técnicas para CSV */}
                {config.format === 'csv' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Configurações técnicas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Separador</label>
                        <select
                          value={config.delimiter}
                          onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value=",">Vírgula (,)</option>
                          <option value=";">Ponto e vírgula (;)</option>
                          <option value="\t">Tab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Codificação</label>
                        <select
                          value={config.encoding}
                          onChange={(e) => setConfig(prev => ({ ...prev, encoding: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="UTF-8">UTF-8</option>
                          <option value="ISO-8859-1">ISO-8859-1</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
            <div className="text-sm text-gray-500">
              {config.selectedFields.length} campos selecionados
              {config.maxRecords > 0 && ` • Máximo ${config.maxRecords} registros`}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isExporting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || config.selectedFields.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-4 h-4">
                      <svg fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Exportar Dados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
