#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ETL Service - Processamento de dados Innovatis
==============================================

Responsável por:
- Aplicar filtros específicos Innovatis
- Processar dados brutos do SIOP
- Gerar resumos e estatísticas
"""

import pandas as pd
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class ETLService:
    """Serviço de ETL para aplicar filtros Innovatis"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def apply_innovatis_filters(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Aplica filtros Innovatis na nova sequência otimizada:
        1. Filtro Financeiro: Dotação Atual >= R$ 10.000 e Empenhado = 0 (oportunidades viáveis)
        2. Natureza da despesa: código inicia em "33"
        3. Modalidade: apenas códigos 99, 90, 31, 41 ou 50
        4. Resultado primário: RP6, RP7 ou RP8 (Emendas Individuais e similares)
        
        NOTA: Filtro de ministérios foi removido - agora é feito no frontend
        """
        original_count = len(df)
        self.logger.info(f"🔍 Aplicando filtros Innovatis em {original_count:,} registros")
        self.logger.info(f"📋 Nova sequência otimizada: Financeiro → Natureza → Modalidade → RP")
        
        # 1. Filtro Financeiro - PRIMEIRO para máxima eficiência (remove emendas já executadas)
        df = self._filter_financeiro(df)
        self.logger.info(f"   → Após filtro financeiro: {len(df):,} registros")
        
        # 2. Filtro Natureza da Despesa
        df = self._filter_natureza_despesa(df)
        self.logger.info(f"   → Após filtro natureza: {len(df):,} registros")
        
        # 3. Filtro Modalidade
        df = self._filter_modalidade(df)
        self.logger.info(f"   → Após filtro modalidade: {len(df):,} registros")
        
        # 4. Filtro RP (Resultado Primário) - ÚLTIMO por ter menor seletividade
        df = self._filter_resultado_primario(df)
        self.logger.info(f"   → Após filtro RP: {len(df):,} registros")
        
        # REMOVIDO: Filtro de ministérios vigentes - agora é responsabilidade do frontend
        # df = self._filter_ministerios_vigentes(df)
        
        self.logger.info(f"✅ Filtros aplicados: {len(df):,} de {original_count:,} registros ({len(df)/original_count*100:.1f}%)")
        self.logger.info(f"🏛️ Ministérios serão filtrados no frontend conforme seleção do usuário")
        self.logger.info(f"💰 Apenas oportunidades viáveis (Dotação >= R$ 10.000 e Empenhado = 0)")
        return df
    
    def _filter_financeiro(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Filtro Financeiro: Remove emendas já executadas e com valores baixos
        Condições:
        - Dotação Atual Emenda >= R$ 10.000 (valor mínimo para viabilidade)
        - Empenhado = 0 (ainda não foi executado)
        
        Este filtro garante que apenas oportunidades reais de captação sejam mantidas.
        """
        dotacao_col = self._find_column(df, ['Dotação Atual Emenda', 'dotacao_atual', 'dotacao'])
        empenhado_col = self._find_column(df, ['Empenhado', 'empenhado', 'valor_empenhado'])
        
        if not dotacao_col or not empenhado_col:
            self.logger.warning("⚠️ Colunas financeiras não encontradas - pulando filtro financeiro")
            if not dotacao_col:
                self.logger.warning(f"   Coluna de dotação não encontrada. Colunas disponíveis: {list(df.columns)[:10]}...")
            if not empenhado_col:
                self.logger.warning(f"   Coluna de empenhado não encontrada. Colunas disponíveis: {list(df.columns)[:10]}...")
            return df
        
        self.logger.info(f"💰 Aplicando filtro financeiro nas colunas: '{dotacao_col}' e '{empenhado_col}'")
        original_count = len(df)
        
        # Aplicar limpeza nos valores
        df_clean = df.copy()
        df_clean[dotacao_col + '_numeric'] = df_clean[dotacao_col].apply(self._clean_monetary_value)
        df_clean[empenhado_col + '_numeric'] = df_clean[empenhado_col].apply(self._clean_monetary_value)
        
        # Aplicar filtros financeiros
        # Condição 1: Dotação Atual >= 10.000 (valor mínimo para viabilidade)
        mask_dotacao = df_clean[dotacao_col + '_numeric'] >= 10000
        
        # Condição 2: Empenhado = 0 (ainda não foi executado)
        mask_empenhado = df_clean[empenhado_col + '_numeric'] == 0
        
        # Aplicar ambas as condições
        mask_final = mask_dotacao & mask_empenhado
        filtered_df = df[mask_final]
        
        # Estatísticas do filtro
        removidos_dotacao = len(df) - len(df[mask_dotacao])
        removidos_empenhado = len(df[mask_dotacao]) - len(filtered_df)
        total_removidos = len(df) - len(filtered_df)
        
        self.logger.info(f"   📊 Estatísticas do filtro financeiro:")
        self.logger.info(f"     • Registros originais: {original_count:,}")
        self.logger.info(f"     • Removidos por Dotação = 0: {removidos_dotacao:,}")
        self.logger.info(f"     • Removidos por Empenhado > 0: {removidos_empenhado:,}")
        self.logger.info(f"     • Total removidos: {total_removidos:,}")
        self.logger.info(f"     • Registros mantidos: {len(filtered_df):,}")
        self.logger.info(f"     • Taxa de filtro: {(total_removidos/original_count)*100:.1f}%")
        
        if len(filtered_df) > 0:
            # Calcular valor total disponível
            valor_total = df_clean[mask_final][dotacao_col + '_numeric'].sum()
            self.logger.info(f"     • Valor total disponível: R$ {valor_total:,.2f}")
        
        self.logger.info(f"✅ Filtro financeiro aplicado: {len(filtered_df):,} oportunidades válidas mantidas")
        return filtered_df
    
    def _filter_natureza_despesa(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filtro: código da natureza da despesa inicia em '33'"""
        col_name = self._find_column(df, ['Natureza Despesa', 'natureza_despesa', 'natureza', 'cod_natureza'])
        
        if col_name:
            self.logger.info(f"🔍 Aplicando filtro natureza despesa na coluna: '{col_name}'")
            
            # Filtrar códigos que iniciam com "33" (dados reais: "33410000", "33903001", etc.)
            mask = df[col_name].astype(str).str.startswith('33', na=False)
            filtered_df = df[mask]
            
            # Log dos tipos encontrados para debug
            if len(filtered_df) > 0:
                natureza_samples = filtered_df[col_name].value_counts().head(5)
                self.logger.info(f"   → Exemplos de naturezas encontradas:")
                for natureza, count in natureza_samples.items():
                    self.logger.info(f"     • {natureza}: {count:,} registros")
            
            self.logger.info(f"   → Mantidos {len(filtered_df):,} de {len(df):,} registros com natureza '33xxx'")
            return filtered_df
        
        self.logger.warning("⚠️ Coluna de natureza da despesa não encontrada")
        return df
    
    def _filter_modalidade(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filtro: modalidade apenas 99, 90, 31, 41 ou 50"""
        modalidades_permitidas = [99, 90, 31, 41, 50]
        col_name = self._find_column(df, ['Modalidade', 'modalidade', 'cod_modalidade', 'mod'])
        
        if col_name:
            self.logger.info(f"🔍 Aplicando filtro modalidade na coluna: '{col_name}'")
            
            # Extrair números do início das strings de modalidade (ex: "99 - A DEFINIR" -> 99)
            df_copy = df.copy()
            df_copy['modalidade_num'] = df_copy[col_name].astype(str).str.extract(r'^(\d+)').astype(float)
            
            # Filtrar pelas modalidades permitidas
            filtered_df = df_copy[df_copy['modalidade_num'].isin(modalidades_permitidas)]
            
            self.logger.info(f"   → Mantidos {len(filtered_df)} de {len(df)} registros com modalidades {modalidades_permitidas}")
            
            # Remover coluna temporária e retornar
            return filtered_df.drop('modalidade_num', axis=1)
        
        self.logger.warning("⚠️ Coluna de modalidade não encontrada")
        return df
    
    def _filter_resultado_primario(self, df: pd.DataFrame) -> pd.DataFrame:
        """Filtro: resultado primário RP6, RP7 ou RP8 (Emendas Individuais e similares)"""
        col_name = self._find_column(df, ['RP', 'resultado_primario', 'rp', 'res_primario'])
        
        if col_name:
            self.logger.info(f"🔍 Aplicando filtro RP na coluna: '{col_name}'")
            
            # Filtrar por códigos 6, 7 ou 8 (formato real do CSV: "6 - Emendas Individuais", etc.)
            mask = (
                df[col_name].astype(str).str.contains(r'^6\s*-', na=False, case=False, regex=True) |
                df[col_name].astype(str).str.contains(r'^7\s*-', na=False, case=False, regex=True) |
                df[col_name].astype(str).str.contains(r'^8\s*-', na=False, case=False, regex=True) |
                df[col_name].astype(str).str.startswith('6', na=False) |
                df[col_name].astype(str).str.startswith('7', na=False) |
                df[col_name].astype(str).str.startswith('8', na=False)
            )
            
            filtered_df = df[mask]
            
            # Log dos tipos encontrados para debug
            if len(filtered_df) > 0:
                rp_types = filtered_df[col_name].value_counts()
                self.logger.info(f"   → Tipos de RP encontrados:")
                for rp_type, count in rp_types.head(5).items():
                    self.logger.info(f"     • {rp_type}: {count:,} registros")
            
            self.logger.info(f"   → Mantidos {len(filtered_df):,} de {len(df):,} registros com RP 6/7/8")
            return filtered_df
        
        self.logger.warning("⚠️ Coluna de resultado primário não encontrada")
        return df
    
    def _find_column(self, df: pd.DataFrame, possible_names: List[str]) -> str:
        """Encontra nome da coluna baseado em possíveis nomes"""
        for name in possible_names:
            if name in df.columns:
                return name
        
        # Busca flexível por similaridade
        for col in df.columns:
            col_lower = col.lower()
            for name in possible_names:
                name_lower = name.lower()
                if name_lower in col_lower or col_lower in name_lower:
                    return col
        
        return ""
    
    def generate_summary(self, df: pd.DataFrame) -> Dict:
        """Gera resumo das oportunidades encontradas"""
        if df.empty:
            return {
                "total_opportunities": 0, 
                "total_value": 0,
                "summary": "Nenhuma oportunidade encontrada"
            }
        
        # Encontrar colunas de valor, empenhado, órgão, modalidade, ano e UF
        dotacao_col = self._find_column(df, ['Dotação Atual Emenda', 'dotacao_atual', 'dotacao'])
        empenhado_col = self._find_column(df, ['Empenhado', 'empenhado', 'valor_empenhado'])
        orgao_col = self._find_column(df, ['Órgão', 'orgao_orcamentario', 'ministerio', 'orgao'])
        modalidade_col = self._find_column(df, ['Modalidade', 'modalidade', 'cod_modalidade'])
        ano_col = self._find_column(df, ['Ano', 'ano', 'exercicio'])
        uf_col = self._find_column(df, ['UF Autor', 'uf_autor', 'uf', 'estado'])
        
        summary = {
            "total_opportunities": len(df),
            "total_value": 0,
            "average_value": 0,
        }
        
        # NOVA LÓGICA: Valor Disponível = Soma da Dotação Atual dos dados filtrados
        # Como o filtro financeiro já garantiu que Empenhado = 0 e Dotação > 0,
        # o valor disponível é simplesmente a soma da Dotação Atual
        df_clean = df.copy()
        if dotacao_col and dotacao_col in df.columns:
            try:
                # Aplicar conversão na coluna de dotação
                df_clean[dotacao_col + '_numeric'] = df_clean[dotacao_col].apply(self._clean_monetary_value)
                
                # NOVO CÁLCULO: Valor Disponível = Soma da Dotação Atual
                # (Empenhado já é 0 devido ao filtro financeiro)
                summary["total_value"] = float(df_clean[dotacao_col + '_numeric'].sum())
                summary["average_value"] = float(df_clean[dotacao_col + '_numeric'].mean())
                
                # Log para debug
                self.logger.info(f"   💰 Valores disponíveis calculados (Soma da Dotação Atual):")
                self.logger.info(f"     Total Disponível: R$ {summary['total_value']:,.2f}")
                self.logger.info(f"     Média Disponível: R$ {summary['average_value']:,.2f}")
                self.logger.info(f"     ✅ Empenhado = 0 garantido pelo filtro financeiro")
                
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular valores disponíveis: {e}")
                summary["total_value"] = 0
                summary["average_value"] = 0
        else:
            self.logger.warning("⚠️ Coluna de dotação não encontrada - valor disponível será 0")
            summary["total_value"] = 0
            summary["average_value"] = 0
        
        # Resumo por ministério (usando valores de dotação atual)
        if orgao_col:
            try:
                # Usar valores de dotação atual (disponíveis)
                if dotacao_col + '_numeric' in df_clean.columns:
                    by_ministry_count = df_clean.groupby(orgao_col).size().to_dict()
                    by_ministry_value = df_clean.groupby(orgao_col)[dotacao_col + '_numeric'].sum().to_dict()
                else:
                    by_ministry_count = df_clean.groupby(orgao_col).size().to_dict()
                    by_ministry_value = {}
                
                summary["by_ministry"] = {
                    "count": by_ministry_count,
                    "value": by_ministry_value
                }
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular resumo por ministério: {e}")
                summary["by_ministry"] = {"count": {}, "value": {}}
        
        # Resumo por modalidade
        if modalidade_col:
            try:
                by_modality = df_clean.groupby(modalidade_col).size().to_dict()
                summary["by_modality"] = {str(k): v for k, v in by_modality.items()}
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular resumo por modalidade: {e}")
                summary["by_modality"] = {}
        
        # Resumo por ano
        if ano_col:
            try:
                by_year = df_clean.groupby(ano_col).size().to_dict()
                summary["years_covered"] = list(by_year.keys())
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular anos cobertos: {e}")
                summary["years_covered"] = [2025]  # Fallback
        else:
            # Se não encontrar coluna de ano, assumir dados do ano atual
            summary["years_covered"] = [2025]

        # Resumo por UF
        if uf_col:
            try:
                # Obter UFs únicas, removendo valores nulos
                unique_ufs = df_clean[uf_col].dropna().unique().tolist()
                # Ordenar alfabeticamente
                unique_ufs.sort()
                summary["unique_ufs"] = unique_ufs
                
                # Estatísticas por UF
                by_uf = df_clean.groupby(uf_col).size().to_dict()
                summary["by_uf"] = by_uf
                
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular resumo por UF: {e}")
                summary["unique_ufs"] = []
                summary["by_uf"] = {}
        else:
            summary["unique_ufs"] = []
            summary["by_uf"] = {}

        # Resumo por Partido
        partido_col = self._find_column(df, ['Partido', 'partido', 'sigla_partido'])
        if partido_col:
            try:
                # Obter partidos únicos, removendo valores nulos
                unique_partidos = df_clean[partido_col].dropna().unique().tolist()
                # Ordenar alfabeticamente
                unique_partidos.sort()
                summary["unique_partidos"] = unique_partidos
                
                # Estatísticas por Partido
                by_partido = df_clean.groupby(partido_col).size().to_dict()
                summary["by_partido"] = by_partido
                
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao calcular resumo por Partido: {e}")
                summary["unique_partidos"] = []
                summary["by_partido"] = {}
        else:
            summary["unique_partidos"] = []
            summary["by_partido"] = {}
        
        return summary
    
    def validate_data_quality(self, df: pd.DataFrame) -> Dict:
        """Valida qualidade dos dados"""
        quality_report = {
            "total_rows": len(df),
            "columns": list(df.columns),
            "missing_values": df.isnull().sum().to_dict(),
            "data_types": df.dtypes.astype(str).to_dict(),
            "quality_score": 0.0
        }
        
        # Calcular score de qualidade simples
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isnull().sum().sum()
        
        if total_cells > 0:
            quality_report["quality_score"] = round(
                ((total_cells - missing_cells) / total_cells) * 100, 2
            )
        
        return quality_report
    
    def get_column_mapping_suggestions(self, df: pd.DataFrame) -> Dict:
        """Sugere mapeamento de colunas para dados SIOP"""
        columns = df.columns.tolist()
        
        suggestions = {
            "natureza_despesa": self._find_column(df, ['Natureza Despesa', 'natureza_despesa', 'natureza', 'cod_natureza', 'nat_despesa']),
            "modalidade": self._find_column(df, ['Modalidade', 'modalidade', 'cod_modalidade', 'mod']),
            "resultado_primario": self._find_column(df, ['RP', 'resultado_primario', 'rp', 'res_primario']),
            "orgao_orcamentario": self._find_column(df, ['Órgão', 'orgao_orcamentario', 'ministerio', 'orgao']),
            "dotacao": self._find_column(df, ['Dotação Atual Emenda', 'dotacao_atual', 'dotacao']),
            "empenhado": self._find_column(df, ['Empenhado', 'empenhado', 'valor_empenhado']),
            "valor_disponivel": "valor_disponivel" if 'valor_disponivel' in df.columns else None,
            "numero_emenda": self._find_column(df, ['Nro. Emenda', 'numero_emenda', 'num_emenda', 'codigo']),
            "autor": self._find_column(df, ['Autor', 'autor_emenda', 'autor', 'parlamentar'])
        }
        
        return {k: v for k, v in suggestions.items() if v}

    def _clean_monetary_value(self, val) -> float:
        """Limpa e converte um valor monetário (string ou numérico) para float."""
        if pd.isna(val) or val is None or val == '':
            return 0.0
        
        if isinstance(val, (int, float)):
            return float(val)
        
        if isinstance(val, str):
            try:
                clean_val = str(val).strip()
                # Lógica para formato brasileiro: "1.234,56" -> "1234.56"
                clean_val = clean_val.replace('.', '').replace(',', '.')
                
                if not clean_val or clean_val.lower() in ['na', 'n/a', 'nan']:
                    return 0.0
                
                return float(clean_val)
            except (ValueError, TypeError):
                self.logger.warning(f"⚠️ Não foi possível converter o valor monetário '{val}' para número.")
                return 0.0
        
        return 0.0