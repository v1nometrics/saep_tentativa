'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import { Opportunity } from '@/lib/api';

interface EmendaModalExpandedProps {
  emenda: Opportunity & { hasRelationship: boolean };
  isOpen: boolean;
  onClose: () => void;
}

// Helper component for individual data points
const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="break-words">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-base font-semibold text-gray-800 whitespace-normal">{value || 'N/A'}</p>
  </div>
);

// Helper component for section cards
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

export const EmendaModalExpanded: React.FC<EmendaModalExpandedProps> = ({ emenda, isOpen, onClose }) => {
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (value: number | string | undefined | null) => 
    `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cleanText = (text: string | undefined | null) => text?.replace(/^\s*\d+\s*-\s*/, '').trim() || 'N/A';

  // Extrai a sigla do ministério / órgão orçamentário
  const getMinistryAcronym = (name: string | undefined | null) => {
    if (!name) return '';
    const cleanName = name.replace(/^\d+\s*-\s*/, '').trim();

    // Mapeamento explícito (casos comuns)
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

    // Fallback: gera sigla a partir das primeiras letras de palavras relevantes
    const words = cleanName.split(' ').filter(word =>
      word.length > 2 &&
      !['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'para', 'pela', 'pelo'].includes(word.toLowerCase())
    );
    if (words.length >= 2) return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return cleanName.substring(0, 4).toUpperCase();
  };
  const naturezaCode = (text: string | undefined | null) => {
    if (!text) return 'N/A';
    const match = text.match(/^[^\s-]+/);
    return match ? match[0] : text;
  };

  const exportPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 50;
    // --- Cabeçalho estilizado ---
    doc.setFillColor('#e8f0fe');
    doc.rect(0, 0, pageWidth, 110, 'F');

    // Logo Innovatis (local)
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

    // Título e subtítulo
    doc.setFontSize(22);
    doc.setTextColor('#003366');
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Emenda Parlamentar', marginX + 80, 50);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#555');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, marginX + 80, 70);

    let cursorY = 140;


    const addSection = (title: string, rows: [string, string | number][] ) => {
      doc.setFontSize(14);
      doc.setTextColor('#003366');
      doc.text(title, marginX, cursorY);
      cursorY += 12;
      doc.setDrawColor('#003366');
      doc.setLineWidth(0.5);
      doc.line(marginX, cursorY, 555, cursorY);
      cursorY += 15; // espaço após linha do título

      doc.setFontSize(11);
      doc.setTextColor('#000');
      const lineHeight = 16; // mais espaço entre linhas
      const maxValueWidth = pageWidth - (marginX + 150) - 40;
      rows.forEach(([label, value]) => {
        const valueStr = String(value ?? '');
        const wrapped = doc.splitTextToSize(valueStr, maxValueWidth);

        // primeira linha com label
        doc.text(`${label}:`, marginX, cursorY);
        doc.text(wrapped[0], marginX + 150, cursorY);

        // linhas extras somente valor
        for (let i = 1; i < wrapped.length; i++) {
          cursorY += lineHeight;
          doc.text(wrapped[i], marginX + 150, cursorY);
        }
        cursorY += lineHeight;

        if (cursorY > 770) { doc.addPage(); cursorY = 40; }
      });
      cursorY += 20; // espaçamento maior entre seções
    };

    addSection('Informações Gerais', [
      ['Código da Emenda', emenda.identificacao_emenda],
      ['Autor', emenda.autor],
      ['Partido', emenda.partido],
      ['Tipo do Autor', emenda.tipo_autor || emenda.tipo_emenda],
      ['Ano da Emenda', emenda.ano]
    ]);

    addSection('Valores Financeiros', [
      ['Dotação Inicial', formatCurrency(emenda.dotacao_inicial)],
      ['Dotação Atual', formatCurrency(emenda.dotacao_atual)],
      ['Empenhado', formatCurrency(emenda.valor_empenhado)],
      ['Liquidado', formatCurrency(emenda.valor_liquidado)],
      ['Pago', formatCurrency(emenda.valor_pago)]
    ]);

    addSection('Localização', [
      ['UF Favorecida', emenda.uf_favorecida],
      ['Município Favorecido', emenda.municipio_favorecido]
    ]);

    addSection('Detalhes da Ação', [
      ['Órgão Orçamentário', emenda.orgao_orcamentario],
      ['Unidade Orçamentária', emenda.unidade_orcamentaria],
      ['Ação', emenda.objeto_da_emenda || 'N/A']
    ]);

    addSection('Classificação Orçamentária', [
      ['Natureza da Despesa', naturezaCode(emenda.dados_originais?.['Natureza Despesa'])],
      ['GND', emenda.dados_originais?.['GND'] || emenda.gnd || 'N/A'],
      ['Modalidade de Aplicação', emenda.modalidade_de_aplicacao],
      ['Resultado Primário (RP)', emenda.resultado_primario]
    ]);

    // --- Numeração de páginas ---
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(9);
    doc.setTextColor('#666');
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 820, { align: 'center' });
    }

    doc.save(`emenda_${emenda.identificacao_emenda}.pdf`);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/30 backdrop-blur-lg"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 z-10">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600">Emenda Parlamentar</p>
              <h2 className="text-xl font-bold text-gray-900">{emenda.identificacao_emenda}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-200"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Top grid with general info and financial values */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoCard title="Informações Gerais">
              <InfoItem label="Código da Emenda" value={emenda.identificacao_emenda} />
              <InfoItem label="Autor" value={emenda.autor} />
              <InfoItem label="Partido" value={emenda.partido} />
              <InfoItem label="Tipo do Autor" value={emenda.tipo_autor || emenda.tipo_emenda} />
              <InfoItem label="Ano da Emenda" value={emenda.ano} />
            </InfoCard>

            <InfoCard title="Valores Financeiros">
              <InfoItem label="Dotação Inicial" value={<span className="text-green-700">{formatCurrency(emenda.dotacao_inicial)}</span>} />
              <InfoItem label="Dotação Atual" value={<span className="text-green-800 font-bold">{formatCurrency(emenda.dotacao_atual)}</span>} />
              <InfoItem label="Empenhado" value={<span className="text-blue-600">{formatCurrency(emenda.valor_empenhado)}</span>} />
              <InfoItem label="Liquidado" value={<span className="text-orange-600">{formatCurrency(emenda.valor_liquidado)}</span>} />
              <InfoItem label="Pago" value={<span className="text-purple-600">{formatCurrency(emenda.valor_pago)}</span>} />
            </InfoCard>

            {/* Localização */}
            <InfoCard title="Localização">
              <InfoItem label="UF Favorecida" value={emenda.uf_favorecida} />
              <InfoItem label="Município Favorecido" value={emenda.municipio_favorecido} />
            </InfoCard>
          </div>

          {/* Detalhes da Ação e Classificação Orçamentária lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InfoCard title="Detalhes da Ação">
              <InfoItem label="Órgão Orçamentário" value={`${emenda.orgao_orcamentario} (${getMinistryAcronym(emenda.orgao_orcamentario)})`} />
              <InfoItem label="Unidade Orçamentária" value={emenda.unidade_orcamentaria} />
              <InfoItem label="Ação" value={emenda.objeto_da_emenda || 'N/A'} />
            </InfoCard>

            <InfoCard title="Classificação Orçamentária">
              <InfoItem label="Natureza da Despesa" value={naturezaCode(emenda.dados_originais?.['Natureza Despesa'])} />
              <InfoItem label="GND" value={emenda.dados_originais?.['GND'] || emenda.gnd || 'N/A'} />
              <InfoItem label="Modalidade de Aplicação" value={emenda.modalidade_de_aplicacao} />
              <InfoItem label="Resultado Primário (RP)" value={emenda.resultado_primario} />
            </InfoCard>
          </div>


        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4 flex justify-end space-x-3">
          <button
             onClick={exportPdf}
             className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
           >
             Exportar PDF
           </button>
           <button
             onClick={onClose}
             className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
