#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
BACKEND MVP - PLATAFORMA EMENDAS PARLAMENTARES
=============================================

API simples para:
- Receber dados do S3
- Aplicar filtros Innovatis
- Disponibilizar oportunidades

INÍCIO SIMPLES - EXPANSÍVEL
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import pandas as pd
from dotenv import load_dotenv
import re
import unicodedata
import hashlib
from functools import lru_cache

from services.s3_service import S3Service
from services.etl_service import ETLService

# Carregar variáveis de ambiente
load_dotenv()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Emendas Parlamentares API",
    description="API para detecção de oportunidades em emendas parlamentares",
    version="1.0.0-MVP"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar serviços
s3_service = S3Service()
etl_service = ETLService()

# Variável global para cache simples (em produção, usar Redis)
cached_opportunities = None
last_update = None

# Helper para UTC timezone-aware datetime (corrige DeprecationWarning)
def utc_now():
    """Retorna datetime atual em UTC timezone-aware"""
    return datetime.now(timezone.utc)

# Cache da conversão JSON para evitar reconversões desnecessárias
_json_conversion_cache = {}
_last_cache_cleanup = utc_now()

def normalize_field_names(record: Dict) -> Dict:
    """
    Normaliza nomes de campos do ETL para os nomes esperados pelo frontend
    
    Mapeamento ETL → Frontend:
    - 'Empenhado' → 'valor_empenhado'
    - 'Dotação Atual Emenda' → 'dotacao_atual'
    - 'Dotação Inicial Emenda' → 'dotacao_inicial'
    - 'Liquidado' → 'valor_liquidado'
    - 'Pago' → 'valor_pago'
    - 'Codigo_Emenda' → 'codigo_emenda'
    
    Args:
        record: Dicionário com dados do registro
        
    Returns:
        Dicionário com campos normalizados
    """
    # Mapeamento de campos ETL → Frontend
    field_mapping = {
        'Empenhado': 'valor_empenhado',
        'Dotação Atual Emenda': 'dotacao_atual',
        'Dotação Inicial Emenda': 'dotacao_inicial',
        'Liquidado': 'valor_liquidado',
        'Pago': 'valor_pago',
        'Codigo_Emenda': 'codigo_emenda',
        # Manter campos originais também para compatibilidade
        'Ano': 'ano',
        'RP': 'resultado_primario',
        'Autor': 'autor',
        'Tipo Autor': 'tipo_autor',
        'Partido': 'partido',
        'UF Autor': 'uf_autor',
        'Nro. Emenda': 'numero_emenda',
        'Órgão': 'orgao',
        'UO': 'unidade_orcamentaria',
        'Ação': 'acao',
        'Localizador': 'localizador',
        'GND': 'gnd',
        'Modalidade': 'modalidade_de_aplicacao',
        'Natureza Despesa': 'natureza_da_despesa'
    }
    
    normalized_record = {}
    
    # Copiar todos os campos originais primeiro
    for key, value in record.items():
        normalized_record[key] = value
    
    # Adicionar campos normalizados (mantendo os originais para compatibilidade)
    for original_field, normalized_field in field_mapping.items():
        if original_field in record:
            normalized_record[normalized_field] = record[original_field]
    
    return normalized_record

def create_unique_codigo_and_deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cria código único da emenda (formato Portal da Transparência) e remove duplicatas
    APLICADO SEMPRE AOS DADOS REAIS - GARANTINDO UNICIDADE NO CACHE PRINCIPAL
    
    Args:
        df: DataFrame com dados SIOP brutos
        
    Returns:
        DataFrame com códigos únicos e duplicatas removidas
    """
    logger.info(f"🔄 Criando códigos únicos e deduplicando {len(df)} registros...")
    
    # PRIMEIRA ETAPA: CRIAR CÓDIGO ÚNICO DA EMENDA (Portal da Transparência)
    # Formato: AAAA-BBBB-CCCC (Ano + Código Autor + Número Sequencial)
    if 'Ano' in df.columns and 'Nro. Emenda' in df.columns:
        logger.info("🔑 Criando códigos únicos das emendas (formato oficial federal)...")
        
        def create_codigo_emenda(row):
            try:
                ano = str(int(row['Ano']))  # AAAA (4 dígitos do ano)
                nro_emenda = str(row['Nro. Emenda']).zfill(8)  # Garantir 8 dígitos
                
                # Extrair componentes do número da emenda (8 dígitos = BBBB + CCCC)
                codigo_autor = nro_emenda[:4]      # BBBB: Código SIOP do autor
                num_sequencial = nro_emenda[4:]    # CCCC: Número sequencial da emenda
                
                # Formato oficial do Portal da Transparência: AAAA-BBBB-CCCC
                codigo_emenda = f"{ano}-{codigo_autor}-{num_sequencial}"
                return codigo_emenda
                
            except Exception as e:
                logger.warning(f"⚠️ Erro ao criar código da emenda: {e} | Row data: Ano={row.get('Ano')}, Nro={row.get('Nro. Emenda')}")
                # Fallback para casos excepcionais
                return f"ERRO-{row.get('Ano', 'XXXX')}-{str(row.get('Nro. Emenda', 'XXXXXXXX')).zfill(8)}"
        
        # Aplicar criação do código para todas as linhas
        df['Codigo_Emenda'] = df.apply(create_codigo_emenda, axis=1)
        
        # VERIFICAÇÃO DE DUPLICATAS (chave primária do sistema federal)
        total_registros = len(df)
        codigos_unicos = df['Codigo_Emenda'].nunique()
        duplicatas = total_registros - codigos_unicos
        
        logger.info(f"🔍 Verificação de unicidade dos códigos das emendas:")
        logger.info(f"   📊 Total de registros: {total_registros:,}")
        logger.info(f"   🔑 Códigos únicos: {codigos_unicos:,}")
        logger.info(f"   🔍 Duplicatas detectadas: {duplicatas:,}")
        
        if duplicatas > 0:
            logger.warning(f"⚠️ ATENÇÃO: {duplicatas} duplicatas encontradas!")
            # Log das primeiras duplicatas para debug
            duplicados = df[df['Codigo_Emenda'].duplicated(keep=False)].sort_values('Codigo_Emenda')
            logger.warning(f"   Exemplos de códigos duplicados:")
            for codigo in duplicados['Codigo_Emenda'].head(5).tolist():
                count = (df['Codigo_Emenda'] == codigo).sum()
                logger.warning(f"     • {codigo}: {count} ocorrências")
        else:
            logger.info("✅ Perfeito! Todos os códigos são únicos - nenhuma duplicata encontrada!")
        
        # Log de exemplos dos códigos criados
        exemplos = df['Codigo_Emenda'].head(5).tolist()
        logger.info(f"   📋 Exemplos de códigos criados: {exemplos}")
        
        # DEDUPLICAÇÃO: Remover duplicatas baseado no código único
        if duplicatas > 0:
            logger.info(f"🔄 Iniciando deduplicação de {duplicatas} registros duplicados...")
            
            # Estratégia: Manter o registro com maior valor empenhado para cada código único
            # Se empenhado = 0, manter o com maior dotação atual
            # Se ambos = 0, manter o primeiro encontrado
            
            def select_best_transaction(group):
                """Seleciona a melhor transação de um grupo de emendas iguais"""
                if len(group) == 1:
                    return group.iloc[0]
                
                # Obter código da emenda de forma segura
                try:
                    codigo_emenda = group.name if hasattr(group, 'name') else group.index[0] if hasattr(group, 'index') else "DESCONHECIDO"
                    if 'Codigo_Emenda' in group.columns:
                        codigo_emenda = group['Codigo_Emenda'].iloc[0]
                except:
                    codigo_emenda = "ERRO_CODIGO"
                
                # Prioridade 1: Maior valor empenhado
                empenhado_col = None
                for col in ['Empenhado', 'empenhado']:
                    if col in group.columns:
                        empenhado_col = col
                        break
                
                if empenhado_col:
                    # Converter para numérico se necessário
                    empenhado_values = pd.to_numeric(group[empenhado_col], errors='coerce').fillna(0)
                    max_empenhado = empenhado_values.max()
                    
                    if max_empenhado > 0:
                        # Retornar registro com maior empenhado
                        idx_max_empenhado = empenhado_values.idxmax()
                        logger.debug(f"   Código {codigo_emenda}: Mantendo registro com empenhado R$ {max_empenhado:,.2f}")
                        return group.loc[idx_max_empenhado]
                
                # Prioridade 2: Maior dotação atual
                dotacao_col = None
                for col in ['Dotação Atual Emenda', 'dotacao_atual']:
                    if col in group.columns:
                        dotacao_col = col
                        break
                
                if dotacao_col:
                    dotacao_values = pd.to_numeric(group[dotacao_col], errors='coerce').fillna(0)
                    max_dotacao = dotacao_values.max()
                    
                    if max_dotacao > 0:
                        idx_max_dotacao = dotacao_values.idxmax()
                        logger.debug(f"   Código {codigo_emenda}: Mantendo registro com dotação R$ {max_dotacao:,.2f}")
                        return group.loc[idx_max_dotacao]
                
                # Prioridade 3: Primeiro registro encontrado
                logger.debug(f"   Código {codigo_emenda}: Mantendo primeiro registro (valores zerados)")
                return group.iloc[0]
            
            # Aplicar deduplicação (usando include_groups=False para evitar DeprecationWarning)
            df_antes = len(df)
            
            # IMPORTANTE: Preservar a coluna Codigo_Emenda após groupby
            # O groupby remove a coluna usada como chave por padrão
            df_deduplicated = df.groupby('Codigo_Emenda', group_keys=False).apply(select_best_transaction, include_groups=False).reset_index(drop=True)
            
            # Garantir que a coluna Codigo_Emenda esteja presente no resultado final
            if 'Codigo_Emenda' not in df_deduplicated.columns:
                # Recriar códigos únicos para o DataFrame deduplicado
                logger.warning("⚠️ Coluna Codigo_Emenda removida pelo groupby, recriando...")
                def recreate_codigo_emenda(row):
                    try:
                        ano = str(int(row['Ano']))
                        nro_emenda = str(row['Nro. Emenda']).zfill(8)
                        codigo_autor = nro_emenda[:4]
                        num_sequencial = nro_emenda[4:]
                        return f"{ano}-{codigo_autor}-{num_sequencial}"
                    except Exception as e:
                        logger.warning(f"Erro ao recriar código: {e}")
                        return f"ERRO-{row.get('Ano', 'XXXX')}-{str(row.get('Nro. Emenda', 'XXXXXXXX')).zfill(8)}"
                
                df_deduplicated['Codigo_Emenda'] = df_deduplicated.apply(recreate_codigo_emenda, axis=1)
                logger.info("✅ Coluna Codigo_Emenda recriada após deduplicação")
            
            df = df_deduplicated
            df_depois = len(df)
            
            removidos = df_antes - df_depois
            logger.info(f"✅ Deduplicação concluída:")
            logger.info(f"   📊 Registros antes: {df_antes:,}")
            logger.info(f"   📊 Registros depois: {df_depois:,}")
            logger.info(f"   🗑️ Registros removidos: {removidos:,}")
            logger.info(f"   🎯 Taxa de deduplicação: {(removidos/df_antes)*100:.1f}%")
            
            # Verificação final (apenas se a coluna Codigo_Emenda existe)
            if 'Codigo_Emenda' in df.columns:
                codigos_finais = df['Codigo_Emenda'].nunique()
                if codigos_finais == df_depois:
                    logger.info("✅ SUCESSO: Cada código de emenda agora tem apenas 1 registro!")
                else:
                    logger.warning(f"⚠️ ATENÇÃO: Ainda há {df_depois - codigos_finais} duplicatas restantes")
            else:
                logger.warning("⚠️ Verificação final pulada: coluna 'Codigo_Emenda' não encontrada")
        
        return df
    else:
        logger.warning("⚠️ Colunas 'Ano' ou 'Nro. Emenda' não encontradas - não foi possível criar códigos únicos")
        return df

def _generate_dataframe_hash(df: pd.DataFrame) -> str:
    """
    Gera hash único baseado no conteúdo e estrutura do DataFrame
    """
    # Criar uma string única baseada no DataFrame
    content_str = f"{len(df)}_{list(df.columns)}_{df.iloc[0].to_dict() if len(df) > 0 else {}}"
    if len(df) > 1:
        content_str += f"_{df.iloc[-1].to_dict()}"
    
    return hashlib.md5(content_str.encode()).hexdigest()

def _cleanup_json_cache():
    """
    Limpa entradas antigas do cache JSON para evitar consumo excessivo de memória
    """
    global _json_conversion_cache, _last_cache_cleanup
    
    now = utc_now()
    # Limpar cache a cada 30 minutos
    if (now - _last_cache_cleanup).total_seconds() > 1800:
        logger.info("🧹 Limpando cache antigo...")
        cache_size_before = len(_json_conversion_cache)
        
        # Remover entradas com mais de 1 hora
        cutoff = now - timedelta(hours=1)
        old_keys = []
        for k, v in _json_conversion_cache.items():
            # Formatos aceitos:
            # 1. v = {'data': ..., 'timestamp': datetime, 'size': int}
            # 2. v = (data, timestamp)
            if isinstance(v, dict):
                ts = v.get('timestamp')
            elif isinstance(v, tuple) and len(v) >= 2:
                ts = v[1]
            else:
                # Formato desconhecido – mantém a entrada
                continue

            # Se não há timestamp válido, mantém a entrada no cache
            if ts is None:
                continue

            if ts < cutoff:
                old_keys.append(k)

        # Remover após a iteração para evitar RuntimeError de tamanho mudando
        for key in old_keys:
            del _json_conversion_cache[key]
        
        cache_size_after = len(_json_conversion_cache)
        removed = cache_size_before - cache_size_after
        logger.info(f"🧹 Cache limpo: {removed} entradas removidas ({cache_size_after} restantes)")
        
        _last_cache_cleanup = now

def convert_dataframe_to_json(df: pd.DataFrame) -> List[Dict]:
    """
    Converte DataFrame para JSON com tratamento especial de valores monetários
    APLICADO SEMPRE AOS DADOS REAIS DO S3 (NÃO MOCK)
    
    NOTA: Deduplicação é feita na função central _process_siop_data() para garantir números corretos
    OTIMIZAÇÃO: Cache implementado para evitar reconversões desnecessárias
    """
    global _json_conversion_cache
    
    # Verificar cache primeiro
    df_hash = _generate_dataframe_hash(df)
    if df_hash in _json_conversion_cache:
        cached_entry = _json_conversion_cache[df_hash]
        logger.info(f"✅ Cache hit: {len(df)} registros (hash: {df_hash[:8]}...)")
        
        # Suportar ambos os formatos de cache
        if isinstance(cached_entry, dict):
            return cached_entry['data']
        elif isinstance(cached_entry, tuple) and len(cached_entry) >= 1:
            return cached_entry[0]  # Formato antigo: (data, timestamp)
        else:
            logger.warning(f"⚠️ Formato de cache desconhecido para {df_hash[:8]}... - reprocessando")
            # Remove entrada inválida e continua para reprocessar
            del _json_conversion_cache[df_hash]
    
    logger.info(f"🔄 Convertendo {len(df)} registros para JSON (cache miss)...")
    
    # Limpar cache periodicamente
    _cleanup_json_cache()
    
    # Processar colunas monetárias (dados reais do S3)
    monetary_columns = [
        'Dotação Inicial Emenda', 'Dotação Atual Emenda', 
        'Empenhado', 'Liquidado', 'Pago'
    ]
    
    # Converter colunas monetárias no DataFrame antes de serializar
    for col in monetary_columns:
        if col in df.columns:
            logger.info(f"💰 Processando coluna '{col}'...")
            
            # Função para converter cada valor
            def clean_monetary_value(val):
                if pd.isna(val) or val is None or val == '':
                    return 0.0
                
                # Se já é número, manter
                if isinstance(val, (int, float)):
                    return float(val)
                
                # Se é string, limpar e converter
                if isinstance(val, str):
                    try:
                        # Remover pontos de milhares e espaços
                        clean_val = str(val).strip()
                        clean_val = clean_val.replace('.', '').replace(',', '').replace(' ', '')
                        
                        # Se ficou vazio, retornar 0
                        if not clean_val or clean_val == 'N/A' or clean_val.lower() == 'nan':
                            return 0.0
                        
                        # Converter para float
                        return float(clean_val)
                    except (ValueError, TypeError):
                        logger.warning(f"⚠️ Não foi possível converter valor '{val}' da coluna '{col}'")
                        return 0.0
                
                return 0.0
            
            # Aplicar conversão na coluna inteira (usando .loc para evitar SettingWithCopyWarning)
            df.loc[:, col] = df[col].apply(clean_monetary_value)
            
            # Log de amostra
            sample_values = df[col].head(3).tolist()
            non_zero_count = (df[col] > 0).sum()
            logger.info(f"   Amostra de '{col}': {sample_values}")
            logger.info(f"   Valores > 0: {non_zero_count}/{len(df)}")
    
    # Converter DataFrame para JSON
    records = df.to_dict('records')
    
    # NORMALIZAÇÃO DE CAMPOS: Converter nomes ETL → Frontend
    logger.info(f"🔄 Normalizando nomes de campos para o frontend...")
    normalized_records = []
    
    for record in records:
        normalized_record = normalize_field_names(record)
        normalized_records.append(normalized_record)
    
    logger.info(f"✅ Normalização concluída: {len(normalized_records)} registros")
    
    # Salvar no cache para futuras requisições
    _json_conversion_cache[df_hash] = {
        'data': normalized_records,
        'timestamp': utc_now(),
        'size': len(normalized_records)
    }
    
    logger.info(f"✅ Conversão concluída: {len(normalized_records)} registros (cache salvo: {df_hash[:8]}...)")
    return normalized_records

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "API Emendas Parlamentares MVP",
        "version": "1.0.0",
        "status": "ativo",
        "timestamp": utc_now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check da API com informações sobre dados carregados"""
    global cached_opportunities
    
    health_info = {
        "status": "healthy",
        "services": {
            "s3": s3_service.is_available(),
            "etl": True
        },
        "timestamp": utc_now().isoformat()
    }
    
    # Adicionar informações sobre dados carregados (APÓS DEDUPLICAÇÃO)
    if cached_opportunities is not None:
        health_info["data_status"] = {
            "total_opportunities": len(cached_opportunities),
            "last_update": last_update,
            "unique_codes": cached_opportunities['Codigo_Emenda'].nunique() if 'Codigo_Emenda' in cached_opportunities.columns else "N/A",
            "data_source": "cache_siop_s3_real_data_deduplicated"
        }
        
        # Calcular valor total se possível
        valor_col = None
        for col in ['Empenhado', 'Dotação Atual Emenda']:
            if col in cached_opportunities.columns:
                valor_col = col
                break
        
        if valor_col:
            total_value = cached_opportunities[valor_col].sum()
            health_info["data_status"]["total_value"] = float(total_value)
    else:
        health_info["data_status"] = {
            "total_opportunities": 0,
            "message": "Nenhum dado carregado no cache",
            "data_source": "cache_empty"
        }
    
    return health_info

@app.post("/api/trigger-etl")
async def trigger_etl(background_tasks: BackgroundTasks):
    """
    Trigger para processar novos dados do S3
    Chamado pelo GitHub Actions após upload
    """
    background_tasks.add_task(process_new_data)
    return {
        "message": "Processamento ETL iniciado em background",
        "timestamp": utc_now().isoformat()
    }

@app.get("/api/search")
async def search_opportunities(
    q: str,
    limit: Optional[int] = None,
    offset: int = 0,
    ministry: Optional[str] = None,
    # NOVO: Parâmetros de filtros com hierarquia
    years: Optional[str] = None,
    rp: Optional[str] = None,
    modalidades: Optional[str] = None,
    ufs: Optional[str] = None,
    partidos: Optional[str] = None,
    include_stats: Optional[str] = None  # NOVO: Incluir estatísticas dos resultados filtrados
) -> Dict:
    """
    Busca global em todas as oportunidades COM HIERARQUIA DE FILTROS
    
    HIERARQUIA: Filtros são aplicados PRIMEIRO, busca é aplicada DEPOIS nos dados filtrados.
    Isso garante que filtros tenham prioridade sobre a busca.
    
    Args:
        q: Termo de busca (procura em todos os campos após aplicar filtros)
        limit: Número máximo de resultados
        offset: Offset para paginação
        ministry: Filtrar por ministério específico (opcional)
        years: Anos selecionados (separados por vírgula: "2024,2025")
        rp: RPs selecionados (separados por vírgula: "6,7,8")  
        modalidades: Modalidades selecionadas (separados por vírgula: "99,90,31")
        ufs: UFs selecionadas (separados por vírgula: "SP,RJ,MG")
        include_stats: Se deve incluir estatísticas dos resultados filtrados
        
    Returns:
        Dict com oportunidades + informações sobre filtros aplicados + estatísticas (se solicitado)
    """
    global cached_opportunities, last_update
    
    # Converter include_stats para boolean
    include_stats_bool = include_stats is not None and include_stats.lower() in ['true', '1', 'yes']
    logger.info(f"📊 include_stats parameter: '{include_stats}' -> converted to: {include_stats_bool}")
    

    
    try:
        # Se não tem cache ou está desatualizado, processar dados
        if cached_opportunities is None or _is_cache_stale():
            logger.info("Cache vazio ou desatualizado - processando dados...")
            await process_new_data()
        
        if cached_opportunities is None:
            return {
                "opportunities": [],
                "total": 0,
                "message": "Nenhum dado disponível - Cache SIOP → S3 vazio. Execute refresh para carregar dados.",
                "cache_status": "empty"
            }
        
        # HIERARQUIA: PRIMEIRO aplicar filtros, DEPOIS busca
        logger.info(f"🔍 Busca por: '{q}' | Filtros: years={years}, rp={rp}, modalidades={modalidades}")
        
        # ETAPA 1: Aplicar todos os filtros PRIMEIRO (hierarquia)
        filtered_data = cached_opportunities.copy()
        filters_applied = []
        
        # 1. Aplicar filtro de anos (se especificado)
        if years:
            try:
                year_list = [int(y.strip()) for y in years.split(',') if y.strip()]
                if year_list:
                    filtered_data = filtered_data[filtered_data['Ano'].isin(year_list)]
                    filters_applied.append(f"Anos: {year_list}")
                    logger.info(f"📅 Filtro anos aplicado: {year_list} → {len(filtered_data)} registros")
            except ValueError:
                logger.warning(f"Anos inválidos: {years}")
        
        # 2. Aplicar filtro de RP (se especificado)
        if rp:
            try:
                rp_list = [int(r.strip()) for r in rp.split(',') if r.strip()]
                if rp_list and 'RP' in filtered_data.columns:
                    # Buscar registros que contenham qualquer dos RPs selecionados
                    rp_mask = filtered_data['RP'].str.contains('|'.join([f'{rp_num}' for rp_num in rp_list]), na=False)
                    filtered_data = filtered_data[rp_mask]
                    filters_applied.append(f"RP: {rp_list}")
                    logger.info(f"🎯 Filtro RP aplicado: {rp_list} → {len(filtered_data)} registros")
            except ValueError:
                logger.warning(f"RPs inválidos: {rp}")
                
        # 3. Aplicar filtro de modalidades (se especificado)
        if modalidades:
            try:
                modal_list = [m.strip() for m in modalidades.split(',') if m.strip()]
                if modal_list and 'Modalidade' in filtered_data.columns:
                    # Buscar registros que contenham qualquer das modalidades selecionadas
                    modal_mask = filtered_data['Modalidade'].str.contains('|'.join(modal_list), na=False)
                    filtered_data = filtered_data[modal_mask]
                    filters_applied.append(f"Modalidades: {modal_list}")
                    logger.info(f"🏛️ Filtro modalidades aplicado: {modal_list} → {len(filtered_data)} registros")
            except ValueError:
                logger.warning(f"Modalidades inválidas: {modalidades}")

        # 4. Aplicar filtro de UFs (se especificado)
        if ufs:
            try:
                uf_list = [u.strip().upper() for u in ufs.split(',') if u.strip()]
                if uf_list and 'UF Autor' in filtered_data.columns:
                    # Buscar registros que contenham qualquer das UFs selecionadas
                    filtered_data = filtered_data[filtered_data['UF Autor'].isin(uf_list)]
                    filters_applied.append(f"UFs: {uf_list}")
                    logger.info(f"🗺️ Filtro UFs aplicado: {uf_list} → {len(filtered_data)} registros")
            except ValueError:
                logger.warning(f"UFs inválidas: {ufs}")
        
        # 5. Aplicar filtro de Partidos (se especificado)
        if partidos:
            try:
                partido_list = [p.strip().upper() for p in partidos.split(',') if p.strip()]
                if partido_list and 'Partido' in filtered_data.columns:
                    # Buscar registros que contenham qualquer dos partidos selecionados
                    filtered_data = filtered_data[filtered_data['Partido'].isin(partido_list)]
                    filters_applied.append(f"Partidos: {partido_list}")
                    logger.info(f"🏛️ Filtro partidos aplicado: {partido_list} → {len(filtered_data)} registros")
            except ValueError:
                logger.warning(f"Partidos inválidos: {partidos}")
        
        # 6. Aplicar filtro de ministério (se especificado)
        if ministry:
            orgao_col = 'Órgão' if 'Órgão' in filtered_data.columns else 'orgao_orcamentario'
            if orgao_col in filtered_data.columns:
                filtered_data = filtered_data[
                    filtered_data[orgao_col].str.contains(ministry, case=False, na=False)
                ]
                filters_applied.append(f"Ministério: {ministry}")
                logger.info(f"🏢 Filtro ministério aplicado: {ministry} → {len(filtered_data)} registros")
        
        # ETAPA 2: AGORA aplicar busca nos dados já filtrados (HIERARQUIA)
        search_term = q.strip().lower()
        
        if not search_term:
            # Se busca vazia, usar apenas dados filtrados
            logger.info(f"📋 Apenas filtros aplicados: {filters_applied} → {len(filtered_data)} registros")
        else:
            logger.info(f"🔍 Aplicando busca '{search_term}' em {len(filtered_data)} registros pré-filtrados")
            
            # NORMALIZAÇÃO INTELIGENTE DE BUSCA
            def normalize_text(text):
                """Normaliza texto removendo acentos, espaços extras e convertendo para minúsculas"""
                if not text or pd.isna(text):
                    return ""
                
                text = str(text)
                
                # Converter para minúsculas
                text = text.lower()
                
                # Remover acentos usando unicodedata
                text = unicodedata.normalize('NFD', text)
                text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
                
                # Normalizar espaços (remover extras e trimmar)
                text = re.sub(r'\s+', ' ', text).strip()
                
                return text
            
            def normalize_search_term(search_term):
                """Normaliza e expande termos de busca para incluir variações de valores monetários"""
                normalized = normalize_text(search_term)
                
                # Detectar e expandir abreviações monetárias
                patterns = []
                
                # Adicionar termo original normalizado
                patterns.append(normalized)
                
                # Detectar valores com abreviações (ex: "500mi", "2bi", "1milhao")
                value_patterns = [
                    # Milhões
                    (r'(\d+(?:[.,]\d+)?)\s*(?:mi|mil(?:hao|hões|hoes))', r'\1000000'),
                    (r'(\d+(?:[.,]\d+)?)\s*(?:milhao|milhoes|milhões)', r'\1000000'),
                    
                    # Bilhões  
                    (r'(\d+(?:[.,]\d+)?)\s*(?:bi|bil(?:hao|hões|hoes))', r'\1000000000'),
                    (r'(\d+(?:[.,]\d+)?)\s*(?:bilhao|bilhoes|bilhões)', r'\1000000000'),
                    
                    # Mil
                    (r'(\d+(?:[.,]\d+)?)\s*mil(?!\w)', r'\1000'),
                ]
                
                for pattern, replacement in value_patterns:
                    if re.search(pattern, normalized):
                        # Gerar valor numérico equivalente
                        expanded_value = re.sub(pattern, replacement, normalized)
                        # Remover pontuações para busca numérica
                        clean_value = re.sub(r'[.,]', '', expanded_value)
                        patterns.append(clean_value)
                        
                        # Também adicionar com pontos de milhares brasileiros
                        try:
                            numeric_value = float(clean_value)
                            formatted_br = f"{int(numeric_value):,}".replace(',', '.')
                            patterns.append(formatted_br)
                        except:
                            pass
                
                # Se busca contém apenas números com pontuação, criar variações
                if re.match(r'^[\d\.,\s]+$', normalized):
                    # Versão sem pontuação
                    clean_number = re.sub(r'[^\d]', '', normalized)
                    if clean_number:
                        patterns.append(clean_number)
                    
                    # Versão com pontos brasileiros
                    try:
                        if ',' in normalized and '.' in normalized:
                            # Formato brasileiro: 1.000.000,50 -> 1000000.50
                            br_format = normalized.replace('.', '').replace(',', '.')
                            patterns.append(br_format)
                        elif '.' in normalized:
                            # Formato americano: 1,000,000.50 -> 1000000.50
                            us_format = normalized.replace(',', '')
                            patterns.append(us_format)
                    except:
                        pass
                
                return patterns
            
            # Normalizar termo de busca e gerar variações
            search_patterns = normalize_search_term(search_term)
            logger.info(f"🔍 Padrões de busca gerados: {search_patterns[:3]}...")  # Log apenas primeiros 3
            
            # Função para buscar em todos os campos (COM NORMALIZAÇÃO INTELIGENTE)
            def match_search_term(row):
                """Verifica se algum campo da linha contém o termo de busca usando normalização inteligente"""
                
                # CORREÇÃO: Garantir que 'row' seja acessível como Series do Pandas
                try:
                    # Campos de texto para busca
                    text_fields = [
                        'Autor', 'Ação', 'Localizador', 'Órgão', 'UO', 'Partido', 
                        'UF Autor', 'Tipo Autor', 'RP', 'Modalidade', 'Natureza Despesa',
                        'GND', 'Codigo_Emenda'
                    ]
                    
                    # Buscar em campos de texto (COM NORMALIZAÇÃO)
                    for field in text_fields:
                        # CORREÇÃO: Usar getattr para Series do Pandas ou get para dict
                        try:
                            if hasattr(row, field):
                                field_value = getattr(row, field)
                            elif hasattr(row, 'get'):
                                field_value = row.get(field)
                            elif field in row:
                                field_value = row[field]
                            else:
                                continue
                            
                            # Verificar se valor não é nulo
                            if pd.notna(field_value) and field_value is not None:
                                # Normalizar valor do campo
                                normalized_field_value = normalize_text(str(field_value))
                                
                                # Verificar se algum padrão de busca corresponde
                                for pattern in search_patterns:
                                    if pattern and pattern in normalized_field_value:
                                        return True
                        except Exception as e:
                            logger.debug(f"Erro ao acessar campo '{field}': {e}")
                            continue
                    
                    # Buscar em campos numéricos (ano, códigos)
                    numeric_fields = ['Ano', 'Nro. Emenda']
                    for field in numeric_fields:
                        try:
                            if hasattr(row, field):
                                field_value = getattr(row, field)
                            elif hasattr(row, 'get'):
                                field_value = row.get(field)
                            elif field in row:
                                field_value = row[field]
                            else:
                                continue
                                
                            if pd.notna(field_value) and field_value is not None:
                                field_value_str = str(field_value)
                                
                                # Verificar busca direta em números
                                for pattern in search_patterns:
                                    if pattern and pattern in field_value_str:
                                        return True
                        except Exception as e:
                            logger.debug(f"Erro ao acessar campo numérico '{field}': {e}")
                            continue
                    
                    # Buscar em valores monetários (COM NORMALIZAÇÃO INTELIGENTE)
                    monetary_fields = [
                        'Dotação Inicial Emenda', 'Dotação Atual Emenda', 
                        'Empenhado', 'Liquidado', 'Pago'
                    ]
                    
                    for field in monetary_fields:
                        try:
                            if hasattr(row, field):
                                value = getattr(row, field)
                            elif hasattr(row, 'get'):
                                value = row.get(field)
                            elif field in row:
                                value = row[field]
                            else:
                                continue
                                
                            if pd.notna(value) and value is not None:
                                try:
                                    if isinstance(value, (int, float)) and value > 0:
                                        numeric_value = float(value)
                                        
                                        # Gerar variações do valor para comparação
                                        value_variations = [
                                            str(int(numeric_value)),  # Valor inteiro: 1000000
                                            f"{int(numeric_value):,}".replace(',', '.'),  # Formato BR: 1.000.000
                                            f"{numeric_value:.0f}",  # Valor como string: 1000000.0
                                        ]
                                        
                                        # Verificar se algum padrão corresponde a alguma variação
                                        for pattern in search_patterns:
                                            if pattern:
                                                for variation in value_variations:
                                                    if pattern in variation or variation in pattern:
                                                        return True
                                        
                                except (ValueError, TypeError):
                                    # Fallback para busca em string
                                    value_str = str(value)
                                    for pattern in search_patterns:
                                        if pattern and pattern in value_str:
                                            return True
                        except Exception as e:
                            logger.debug(f"Erro ao acessar campo monetário '{field}': {e}")
                            continue
                    
                    return False
                
                except Exception as e:
                    logger.error(f"Erro geral na função de busca: {e}")
                    return False
            
            # SOLUÇÃO ROBUSTA: Aplicar filtro de busca usando iterrows para garantir compatibilidade
            filtered_indices = []
            
            for idx, row in cached_opportunities.iterrows():
                # Converter row para dict para garantir compatibilidade
                row_dict = row.to_dict()
                
                # Função de busca simplificada e robusta
                found_match = False
                
                # Campos de texto para busca
                text_fields = [
                    'Autor', 'Ação', 'Localizador', 'Órgão', 'UO', 'Partido', 
                    'UF Autor', 'Tipo Autor', 'RP', 'Modalidade', 'Natureza Despesa',
                    'GND', 'Codigo_Emenda'
                ]
                
                # Buscar em campos de texto com normalização
                for field in text_fields:
                    if field in row_dict and row_dict[field] is not None and pd.notna(row_dict[field]):
                        field_value = str(row_dict[field])
                        normalized_field = normalize_text(field_value)
                        
                        # Verificar cada padrão de busca
                        for pattern in search_patterns:
                            if pattern and pattern in normalized_field:
                                found_match = True
                                break
                        
                        if found_match:
                            break
                
                # Se encontrou match nos campos de texto, adicionar
                if found_match:
                    filtered_indices.append(idx)
                    continue
                
                # Buscar em campos numéricos
                numeric_fields = ['Ano', 'Nro. Emenda']
                for field in numeric_fields:
                    if field in row_dict and row_dict[field] is not None and pd.notna(row_dict[field]):
                        field_value = str(row_dict[field])
                        
                        for pattern in search_patterns:
                            if pattern and pattern in field_value:
                                found_match = True
                                break
                        
                        if found_match:
                            break
                
                if found_match:
                    filtered_indices.append(idx)
                    continue
                
                # Buscar em valores monetários
                monetary_fields = [
                    'Dotação Inicial Emenda', 'Dotação Atual Emenda', 
                    'Empenhado', 'Liquidado', 'Pago'
                ]
                
                for field in monetary_fields:
                    if field in row_dict and row_dict[field] is not None and pd.notna(row_dict[field]):
                        value = row_dict[field]
                        
                        try:
                            if isinstance(value, (int, float)) and value > 0:
                                numeric_value = float(value)
                                
                                # Gerar variações do valor
                                value_variations = [
                                    str(int(numeric_value)),
                                    f"{int(numeric_value):,}".replace(',', '.'),
                                    f"{numeric_value:.0f}",
                                ]
                                
                                for pattern in search_patterns:
                                    if pattern:
                                        for variation in value_variations:
                                            if pattern in variation or variation in pattern:
                                                found_match = True
                                                break
                                    if found_match:
                                        break
                                
                        except (ValueError, TypeError):
                            # Fallback para string
                            value_str = str(value)
                            for pattern in search_patterns:
                                if pattern and pattern in value_str:
                                    found_match = True
                                    break
                        
                        if found_match:
                            break
                
                if found_match:
                    filtered_indices.append(idx)
            
            # Aplicar busca nos dados filtrados usando os índices encontrados
            if filtered_indices:
                # Mapear índices para o DataFrame filtrado
                available_indices = set(filtered_data.index)
                valid_indices = [idx for idx in filtered_indices if idx in available_indices]
                
                if valid_indices:
                    filtered_data = filtered_data.loc[valid_indices]
                else:
                    filtered_data = filtered_data.iloc[0:0]  # DataFrame vazio com mesmas colunas
            else:
                filtered_data = filtered_data.iloc[0:0]  # DataFrame vazio com mesmas colunas
            
            logger.info(f"🎯 Busca '{search_term}' em dados filtrados: {len(filtered_data)} resultados finais")
        
        # Paginação
        total = len(filtered_data)
        # Se limit for None, retorna todos os resultados
        if limit is None:
            paged_data = filtered_data.iloc[offset:]
        else:
            paged_data = filtered_data.iloc[offset:offset+limit]
        
        # Converter para formato JSON
        opportunities = convert_dataframe_to_json(paged_data)
        
        # Resposta base
        response = {
            "opportunities": opportunities,
            "total": total,
            "limit": limit,
            "offset": offset,
            "search_term": q,
            "filters_applied": filters_applied,
            "hierarchy_info": "Filtros aplicados ANTES da busca (filtros têm prioridade)",
            "last_update": last_update,
            "data_source": "cache_siop_s3_real_data",
            "cache_info": f"Cache SIOP → S3 carregado em {last_update}",
            "timestamp": utc_now().isoformat()
        }

        
        # NOVO: Incluir estatísticas dos dados filtrados se solicitado
        logger.info(f"📊 Debug stats: include_stats={include_stats} -> {include_stats_bool}, total={total}, filtered_data.shape={filtered_data.shape}")
        
        if include_stats_bool:
            try:
                logger.info("📊 Calculando estatísticas filtradas...")
                
                # Calcular estatísticas dos dados filtrados (mesmo se total = 0)
                if total > 0:
                    # Campos monetários disponíveis
                    monetary_fields = []
                    for field in ['Dotação Inicial Emenda', 'Dotação Atual Emenda', 'Empenhado', 'Liquidado', 'Pago']:
                        if field in filtered_data.columns:
                            monetary_fields.append(field)
                    
                    logger.info(f"📊 Campos monetários encontrados: {monetary_fields}")
                    
                    total_value = 0
                    if monetary_fields:
                        total_value = filtered_data[monetary_fields].sum().sum()
                    
                    unique_ministries = filtered_data['Órgão'].nunique() if 'Órgão' in filtered_data.columns else 0
                    unique_years = filtered_data['Ano'].nunique() if 'Ano' in filtered_data.columns else 0
                    unique_authors = filtered_data['Autor'].nunique() if 'Autor' in filtered_data.columns else 0
                    
                    logger.info(f"📊 Estatísticas calculadas: total={total}, value={total_value}, ministries={unique_ministries}, years={unique_years}, authors={unique_authors}")
                else:
                    # Se não há resultados, retornar estatísticas zeradas
                    total_value = 0
                    unique_ministries = 0
                    unique_years = 0
                    unique_authors = 0
                    
                    logger.info("📊 Nenhum resultado - estatísticas zeradas")
                
                response["filtered_stats"] = {
                    "total_opportunities": total,
                    "total_value": float(total_value),
                    "unique_ministries": int(unique_ministries),
                    "unique_years": int(unique_years),
                    "unique_authors": int(unique_authors)
                }
                
                logger.info(f"📊 Estatísticas filtradas incluídas na resposta: {response['filtered_stats']}")
                
            except Exception as e:
                logger.error(f"❌ Erro ao calcular estatísticas filtradas: {e}")
                logger.error(f"❌ Colunas disponíveis: {list(filtered_data.columns) if not filtered_data.empty else 'DataFrame vazio'}")
                # Incluir estatísticas zeradas em caso de erro
                response["filtered_stats"] = {
                    "total_opportunities": total,
                    "total_value": 0.0,
                    "unique_ministries": 0,
                    "unique_years": 0,
                    "unique_authors": 0
                }
        else:
            logger.info("📊 include_stats=False - estatísticas não solicitadas")
        
        return response
        
    except Exception as e:
        import traceback
        logger.error(f"Erro na busca: {e}")
        logger.error(f"Stack trace completo: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/opportunities")
async def get_opportunities(
    limit: int = 100,
    offset: int = 0,
    ministry: Optional[str] = None
) -> Dict:
    """
    Retorna oportunidades filtradas para Innovatis
    
    Args:
        limit: Número máximo de resultados
        offset: Offset para paginação
        ministry: Filtrar por ministério específico
    """
    global cached_opportunities, last_update
    
    try:
        # Se não tem cache ou está desatualizado, processar dados
        if cached_opportunities is None or _is_cache_stale():
            logger.info("Cache vazio ou desatualizado - processando dados...")
            await process_new_data()
        
        if cached_opportunities is None:
            return {
                "opportunities": [],
                "total": 0,
                "message": "Nenhum dado disponível - Cache SIOP → S3 vazio. Execute refresh para carregar dados.",
                "cache_status": "empty"
            }
        
        # Aplicar filtros
        filtered_data = cached_opportunities
        
        if ministry:
            # Verificar se a coluna existe (pode ser 'Órgão' ou 'orgao_orcamentario')
            orgao_col = 'Órgão' if 'Órgão' in filtered_data.columns else 'orgao_orcamentario'
            if orgao_col in filtered_data.columns:
                filtered_data = filtered_data[
                    filtered_data[orgao_col].str.contains(ministry, case=False, na=False)
                ]
        
        # Paginação
        total = len(filtered_data)
        paged_data = filtered_data.iloc[offset:offset+limit]
        
        # Converter para formato JSON com tratamento de valores monetários
        opportunities = convert_dataframe_to_json(paged_data)
        
        return {
            "opportunities": opportunities,
            "total": total,
            "limit": limit,
            "offset": offset,
            "last_update": last_update,
            "data_source": "cache_siop_s3_real_data",  # SEMPRE dados reais do SIOP via S3 - NUNCA MOCK
            "cache_info": f"Cache SIOP → S3 carregado em {last_update}",
            "timestamp": utc_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar oportunidades: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/summary")
async def get_summary() -> Dict:
    """Retorna resumo das oportunidades"""
    global cached_opportunities
    
    try:
        # CORREÇÃO: Aplicar mesma lógica da API Opportunities - reprocessar se cache vazio
        if cached_opportunities is None or _is_cache_stale():
            logger.info("Cache vazio ou desatualizado para Summary - processando dados...")
            await process_new_data()
        
        if cached_opportunities is None:
            return {"message": "Nenhum dado disponível - falha no processamento"}
        
        summary = etl_service.generate_summary(cached_opportunities)
        
        # Importar sistema oficial de siglas de ministérios
        from ministerios_siglas import get_ministerios_com_relacionamento, enriquecer_dados_ministerios
        
        # Lista de ministérios com projetos vigentes Innovatis (usando sistema oficial)
        ministerios_com_relacionamento = get_ministerios_com_relacionamento()
        
        # Adicionar lista completa de ministérios para o frontend
        orgao_col = etl_service._find_column(cached_opportunities, ['Órgão', 'orgao_orcamentario', 'ministerio', 'orgao'])
        if orgao_col and summary.get("by_ministry"):
            by_ministry_count = summary["by_ministry"]["count"]
            by_ministry_value = summary["by_ministry"]["value"]
            
            # Criar lista completa de ministérios com estatísticas E flag de relacionamento
            all_ministries = []
            for ministry, count in by_ministry_count.items():
                # Verificar se tem relacionamento (busca flexível por substring)
                has_relationship = any(
                    proj_min.upper() in ministry.upper() or ministry.upper() in proj_min.upper()
                    for proj_min in ministerios_com_relacionamento
                )
                
                all_ministries.append({
                    "ministry": ministry,
                    "count": count,
                    "total_value": by_ministry_value.get(ministry, 0),
                    "has_relationship": has_relationship
                })
            
            # Ordenar por contagem (maiores primeiro)
            all_ministries.sort(key=lambda x: x["count"], reverse=True)
            
            # Enriquecer com siglas oficiais
            all_ministries = enriquecer_dados_ministerios(all_ministries)
            
            summary["all_ministries"] = all_ministries
            
            # Manter compatibilidade - apenas os com relacionamento
            ministries_with_relationship = [m for m in all_ministries if m["has_relationship"]]
            summary["top_ministries"] = ministries_with_relationship[:10]
            
            # Estatísticas adicionais
            summary["ministries_count"] = len(all_ministries)
            summary["ministries_with_relationship_count"] = len(ministries_with_relationship)
            summary["ministries_without_relationship_count"] = len(all_ministries) - len(ministries_with_relationship)
        
        return {
            "summary": summary,
            "last_update": last_update,
            "data_source": "cache_siop_s3_real_data",  # SEMPRE dados reais do SIOP via S3 - NUNCA MOCK
            "cache_info": f"Cache SIOP → S3 atualizado em {last_update}. Não são dados em tempo real.",
            "timestamp": utc_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar resumo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/s3/status")
async def get_s3_status():
    """
    Retorna status do S3 e informações sobre arquivos
    """
    try:
        if not s3_service.is_available():
            return {
                "s3_available": False,
                "message": "S3 não configurado - Sistema requer conexão com dados SIOP reais",
                "error": "Credenciais AWS ou configuração S3 ausentes",
                "requires_real_data": True
            }
        
        # Buscar arquivo mais recente
        logger.info("🔍 Verificando status do S3...")
        latest_file = s3_service._find_latest_file()
        
        # Informações do cache
        cache_info = s3_service.get_cache_info()
        
        # Arquivos recentes
        recent_files = s3_service.list_recent_files(days=7)
        
        # Buscar todos os arquivos SIOP para debug
        all_siop_files = []
        try:
            response = s3_service.s3_client.list_objects_v2(
                Bucket=s3_service.bucket_name,
                Prefix="siop-data/"
            )
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    filename = key.split('/')[-1]
                    if filename.startswith('SIOP_') and any(key.lower().endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
                        all_siop_files.append({
                            'key': key,
                            'filename': filename,
                            'last_modified': obj['LastModified'].isoformat(),
                            'size': obj['Size']
                        })
                # Ordenar por data de modificação
                all_siop_files.sort(key=lambda x: x['last_modified'], reverse=True)
        except Exception as e:
            logger.error(f"Erro ao listar arquivos SIOP: {e}")
        
        return {
            "s3_available": True,
            "latest_file": latest_file,
            "latest_file_metadata": s3_service.get_file_metadata(latest_file) if latest_file else None,
            "all_siop_files": all_siop_files,
            "recent_files_count": len(recent_files),
            "recent_files": recent_files[:5],  # Últimos 5
            "cache_info": cache_info,
            "last_check": utc_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar status S3: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/s3/refresh")
async def refresh_from_s3(background_tasks: BackgroundTasks, force: bool = True, wait: bool = False):
    """
    Força atualização dos dados do S3.
    Se wait=True, o endpoint espera o processamento terminar antes de responder
    (útil para o frontend garantir que os dados mais recentes já estejam disponíveis).
    Args:
        force: Se True, ignora cache e baixa novamente
        wait: Se True, processa de forma síncrona
    """
    try:
        logger.info(f"🔄 Refresh manual solicitado (force={force}, wait={wait})")
        if wait:
            # Executa de forma síncrona – garante que dados estejam prontos ao retornar
            success = await refresh_data_from_s3(force_download=force)
            return {
                "message": "Atualização concluída" if success else "Atualização falhou",
                "success": success,
                "force_download": force,
                "synchronous": True,
                "timestamp": utc_now().isoformat()
            }
        # Caso contrário, executa em background como antes
        background_tasks.add_task(refresh_data_from_s3, force)
        return {
            "message": "Atualização iniciada em background",
            "force_download": force,
            "synchronous": False,
            "timestamp": utc_now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erro ao iniciar refresh: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/s3/cache")
async def clear_s3_cache():
    """Limpa cache local SIOP → S3"""
    try:
        s3_service.clear_cache()
        
        # Também limpar cache de oportunidades
        global cached_opportunities, last_update
        cached_opportunities = None
        last_update = None
        
        return {
            "message": "Cache SIOP → S3 limpo com sucesso",
            "timestamp": utc_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/codigo-emenda")
async def debug_codigo_emenda():
    """Endpoint para verificar códigos únicos das emendas"""
    global cached_opportunities
    
    try:
        if cached_opportunities is None:
            return {"error": "Nenhum dado carregado no cache"}
        
        if 'Codigo_Emenda' not in cached_opportunities.columns:
            return {"error": "Coluna Codigo_Emenda não encontrada - execute processo de conversão"}
        
        # Estatísticas dos códigos únicos
        total_registros = len(cached_opportunities)
        codigos_unicos = cached_opportunities['Codigo_Emenda'].nunique()
        duplicatas = total_registros - codigos_unicos
        
        # Análise de duplicatas
        duplicatas_info = []
        if duplicatas > 0:
            duplicados = cached_opportunities[cached_opportunities['Codigo_Emenda'].duplicated(keep=False)]
            duplicatas_agrupadas = duplicados.groupby('Codigo_Emenda').size().sort_values(ascending=False)
            
            duplicatas_info = [
                {
                    "codigo": codigo,
                    "ocorrencias": int(count),
                    "exemplo_registro": duplicados[duplicados['Codigo_Emenda'] == codigo].iloc[0].to_dict()
                }
                for codigo, count in duplicatas_agrupadas.head(10).items()
            ]
        
        # Análise dos códigos por ano
        codigos_por_ano = cached_opportunities.groupby('Ano')['Codigo_Emenda'].nunique().to_dict()
        
        # Exemplos de códigos válidos
        exemplos_codigos = cached_opportunities['Codigo_Emenda'].head(10).tolist()
        
        return {
            "status": "success",
            "estatisticas": {
                "total_registros": total_registros,
                "codigos_unicos": codigos_unicos,
                "duplicatas_encontradas": duplicatas,
                "percentual_unicidade": round((codigos_unicos / total_registros) * 100, 2) if total_registros > 0 else 0
            },
            "duplicatas": duplicatas_info,
            "codigos_por_ano": codigos_por_ano,
            "exemplos_codigos": exemplos_codigos,
            "validacao": "OK" if duplicatas == 0 else f"PROBLEMA: {duplicatas} duplicatas encontradas"
        }
        
    except Exception as e:
        logger.error(f"Erro na verificação de códigos: {e}")
        return {"error": str(e)}

@app.get("/api/debug/data-processing")
async def debug_data_processing():
    """Endpoint temporário para debug do processamento de dados"""
    try:
        logger.info("🔍 Debug: Iniciando análise do processamento de dados...")
        
        # 1. Baixar dados brutos do S3
        raw_data = s3_service.download_latest_csv()
        
        if raw_data is None or raw_data.empty:
            return {
                "error": "Nenhum dado bruto encontrado",
                "raw_data_rows": 0
            }
        
        # 2. Aplicar filtros passo a passo
        debug_info = {
            "raw_data_rows": len(raw_data),
            "raw_columns": list(raw_data.columns),
            "sample_raw_data": raw_data.head(3).to_dict('records') if len(raw_data) > 0 else []
        }
        
        # Aplicar cada filtro individualmente para debug
        df_step1 = etl_service._filter_natureza_despesa(raw_data.copy())
        debug_info["after_natureza_filter"] = len(df_step1)
        
        df_step2 = etl_service._filter_modalidade(df_step1.copy())
        debug_info["after_modalidade_filter"] = len(df_step2)
        
        df_step3 = etl_service._filter_resultado_primario(df_step2.copy())
        debug_info["after_rp_filter"] = len(df_step3)
        
        # Não aplicar filtro de ministério para ver se é isso que está zerando
        # df_step4 = etl_service._filter_ministerios_vigentes(df_step3.copy())
        # debug_info["after_ministerio_filter"] = len(df_step4)
        
        debug_info["final_filtered_rows"] = len(df_step3)
        debug_info["sample_filtered_data"] = df_step3.head(3).to_dict('records') if len(df_step3) > 0 else []
        
        # Verificar valores únicos das colunas de filtro
        natureza_col = etl_service._find_column(raw_data, ['Natureza Despesa', 'natureza_despesa', 'natureza', 'cod_natureza'])
        if natureza_col:
            debug_info["natureza_unique_values"] = raw_data[natureza_col].value_counts().head(10).to_dict()
        
        modalidade_col = etl_service._find_column(raw_data, ['Modalidade', 'modalidade', 'cod_modalidade', 'mod'])
        if modalidade_col:
            debug_info["modalidade_unique_values"] = raw_data[modalidade_col].value_counts().head(10).to_dict()
        
        rp_col = etl_service._find_column(raw_data, ['RP', 'resultado_primario', 'rp', 'res_primario'])
        if rp_col:
            debug_info["rp_unique_values"] = raw_data[rp_col].value_counts().head(10).to_dict()
        
        return debug_info
        
    except Exception as e:
        logger.error(f"Erro no debug: {e}")
        return {"error": str(e)}

async def _process_siop_data(force_download: bool = False, source: str = "automático") -> bool:
    """
    Função central para processar dados SIOP
    Aplica filtros Innovatis + DEDUPLICAÇÃO POR CÓDIGO ÚNICO
    Atualiza cache com números finais corretos
    
    Args:
        force_download: Se True, força download mesmo se já existe cache
        source: Fonte da chamada (para logs)
        
    Returns:
        bool: True se processamento foi bem-sucedido
    """
    global cached_opportunities, last_update
    
    try:
        logger.info(f"🔄 Iniciando processamento {source} de dados (force_download={force_download})...")
        
        # 1. Baixar dados mais recentes do S3
        raw_data = s3_service.download_latest_csv(force_download=force_download)
        
        if raw_data is None:
            logger.error("❌ Nenhum dado disponível do S3 ou cache")
            return False
        
        logger.info(f"📊 Dados carregados: {len(raw_data):,} registros")
        
        # 2. Aplicar filtros Innovatis
        filtered_data = etl_service.apply_innovatis_filters(raw_data)
        
        logger.info(f"🎯 Após filtros Innovatis: {len(filtered_data):,} registros")
        
        # 3. ✅ APLICAR DEDUPLICAÇÃO POR CÓDIGO ÚNICO (ÚNICA VEZ NO SISTEMA)
        logger.info("🔑 Aplicando deduplicação por código único da emenda...")
        try:
            # Verificar se as colunas necessárias existem antes da deduplicação
            colunas_necessarias = ['Ano', 'Nro. Emenda']
            colunas_disponiveis = list(filtered_data.columns)
            logger.info(f"🔍 Colunas disponíveis no DataFrame: {colunas_disponiveis[:10]}...")  # Mostrar apenas primeiras 10
            
            missing_columns = [col for col in colunas_necessarias if col not in colunas_disponiveis]
            if missing_columns:
                logger.warning(f"⚠️ Colunas ausentes para deduplicação: {missing_columns}")
                logger.info("🔄 Tentando mapeamento alternativo de colunas...")
                
                # Tentar mapear colunas com nomes alternativos
                if 'Ano' not in colunas_disponiveis:
                    for col_alt in ['ano', 'Year', 'ANO']:
                        if col_alt in colunas_disponiveis:
                            filtered_data = filtered_data.rename(columns={col_alt: 'Ano'})
                            logger.info(f"✅ Mapeado '{col_alt}' → 'Ano'")
                            break
                
                if 'Nro. Emenda' not in colunas_disponiveis:
                    for col_alt in ['Numero_Sequencial', 'nro_emenda', 'numero_emenda', 'Nro Emenda']:
                        if col_alt in colunas_disponiveis:
                            filtered_data = filtered_data.rename(columns={col_alt: 'Nro. Emenda'})
                            logger.info(f"✅ Mapeado '{col_alt}' → 'Nro. Emenda'")
                            break
            
            deduplicated_data = create_unique_codigo_and_deduplicate(filtered_data)
            logger.info(f"🎯 Após deduplicação: {len(deduplicated_data):,} oportunidades únicas")
            
        except Exception as e:
            logger.error(f"❌ Erro na deduplicação: {e}")
            logger.info("🔄 Prosseguindo sem deduplicação - usando dados filtrados...")
            deduplicated_data = filtered_data
            logger.warning(f"⚠️ ATENÇÃO: Dados podem conter duplicatas (deduplicação falhou)")
            # Log detalhado para debug
            import traceback
            logger.error(f"Stack trace completo: {traceback.format_exc()}")
        
        # 4. Atualizar cache global COM DADOS DEDUPLICADOS
        cached_opportunities = deduplicated_data
        last_update = utc_now().isoformat()
        
        logger.info(f"✅ Processamento {source} concluído com sucesso!")
        logger.info(f"📅 Última atualização: {last_update}")
        logger.info(f"📊 Total final no cache: {len(cached_opportunities):,} oportunidades únicas")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro no processamento {source}: {e}")
        return False

async def process_new_data():
    """
    Processa novos dados do S3 (AUTOMÁTICO)
    REFATORADO: Agora chama função central para evitar duplicação
    """
    return await _process_siop_data(force_download=False, source="automático")

async def refresh_data_from_s3(force_download: bool = False):
    """
    Função específica para refresh manual/forçado
    REFATORADO: Agora chama função central para evitar duplicação
    
    Args:
        force_download: Se True, ignora cache e baixa do S3
    """
    return await _process_siop_data(force_download=force_download, source="manual")

def _is_cache_stale() -> bool:
    """
    Verifica se cache está desatualizado
    Sistema inteligente que verifica:
    1. Se existe cache (se não, está desatualizado)
    2. Se cache tem mais de 1 hora (forçar verificação S3)
    3. Se existe arquivo mais novo no S3
    """
    if last_update is None or cached_opportunities is None:
        logger.info("📋 Cache vazio - precisa atualizar")
        return True
    
    try:
        # Verificar idade do cache (1 hora = considera stale)
        last_update_dt = datetime.fromisoformat(last_update)
        hours_diff = (utc_now() - last_update_dt).total_seconds() / 3600
        
        if hours_diff > 1:
            logger.info(f"⏰ Cache com {hours_diff:.1f}h - verificando S3...")
            
            # Se S3 disponível, verificar se tem arquivo mais novo
            if s3_service.is_available():
                latest_file = s3_service._find_latest_file()
                if latest_file:
                    s3_metadata = s3_service.get_file_metadata(latest_file)
                    if s3_metadata and 'last_modified' in s3_metadata:
                        s3_modified = s3_metadata['last_modified']
                        
                        # Se arquivo S3 é mais novo que cache, está stale
                        if isinstance(s3_modified, str):
                            s3_modified = datetime.fromisoformat(s3_modified.replace('Z', '+00:00'))
                        
                        if s3_modified.replace(tzinfo=None) > last_update_dt:
                            logger.info("📄 Arquivo S3 mais recente que cache - atualizando")
                            return True
            
            # Cache antigo mas sem arquivo S3 mais novo
            logger.info("📋 Cache antigo mas sem atualizações S3")
            return False
        
        # Cache recente
        logger.debug(f"📋 Cache recente ({hours_diff:.1f}h)")
        return False
        
    except Exception as e:
        logger.error(f" Erro ao verificar cache: {e}")
        return True  # Em caso de erro, força atualização

if __name__ == "__main__":
    import uvicorn
    # Northflank usa PORT como variável de ambiente
    port = int(os.getenv("PORT", os.getenv("API_PORT", 8000)))
    uvicorn.run(
        app, 
        host=os.getenv("API_HOST", "0.0.0.0"), 
        port=port
    ) 