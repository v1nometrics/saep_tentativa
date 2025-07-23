#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
S3 Service - Gerenciamento de dados no S3
==========================================

Responsável por:
- Baixar dados mais recentes do S3
- Verificar disponibilidade
- Gerenciar metadados
"""

import boto3
import pandas as pd
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class S3Service:
    """Serviço para interagir com dados no S3"""
    
    def __init__(self):
        self.s3_client = self._init_s3_client()
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        self.is_configured = self.s3_client is not None and self.bucket_name is not None
    
    def _init_s3_client(self):
        """Inicializa cliente S3"""
        try:
            if all([
                os.getenv('AWS_ACCESS_KEY_ID'),
                os.getenv('AWS_SECRET_ACCESS_KEY')
            ]):
                return boto3.client(
                    's3',
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                    region_name=os.getenv('AWS_REGION', 'us-east-1')
                )
            else:
                logger.warning("⚠️ Credenciais AWS não configuradas")
                return None
        except Exception as e:
            logger.error(f"❌ Erro ao inicializar S3: {e}")
            return None
    
    def is_available(self) -> bool:
        """Verifica se S3 está disponível"""
        return self.is_configured
    
    def download_latest_csv(self, force_download: bool = False) -> Optional[pd.DataFrame]:
        """
        Baixa o arquivo SIOP mais recente do S3
        
        Args:
            force_download: Se True, força download mesmo se já existe cache
            
        Returns:
            DataFrame pandas com dados SIOP
        """
        logger.info(f"🔄 download_latest_csv chamado (force_download={force_download})")
        
        if not self.is_configured:
            logger.error("❌ S3 não configurado - sistema requer dados reais")
            return None
        
        try:
            logger.info("🔍 Iniciando busca pelo arquivo SIOP mais recente...")
            
            # Buscar arquivo mais recente
            latest_key = self._find_latest_file()
            
            if not latest_key:
                logger.error("❌ Nenhum arquivo SIOP encontrado no S3 - sistema requer dados reais")
                return None
            
            # Verificar cache local (evitar downloads desnecessários)
            if not force_download and self._is_file_cached(latest_key):
                logger.info("📋 Usando arquivo em cache local")
                return self._load_cached_file(latest_key)
            
            if force_download:
                logger.info("🚫 Cache ignorado devido ao force_download=True")
            
            logger.info(f"⬇️ Baixando arquivo do S3: {latest_key}")
            
            # Download para memória
            obj = self.s3_client.get_object(Bucket=self.bucket_name, Key=latest_key)
            file_content = obj['Body'].read()
            
            logger.info(f"📥 Arquivo baixado: {len(file_content)} bytes")
            
            # Detectar tipo de arquivo e processar adequadamente
            if latest_key.lower().endswith('.csv'):
                # Usar estratégia robusta de detecção de encoding
                df = self._parse_csv_with_encoding_detection(file_content)
            elif latest_key.lower().endswith(('.xlsx', '.xls')):
                df = pd.read_excel(pd.io.common.BytesIO(file_content), skiprows=[1])
            else:
                # Fallback para CSV
                try:
                    df = pd.read_csv(pd.io.common.BytesIO(file_content), skiprows=[1])
                except Exception as e:
                    df = pd.read_csv(pd.io.common.BytesIO(file_content), sep=';', encoding='latin1', skiprows=[1])
            
            # Salvar cache local
            self._save_to_cache(latest_key, df)
            
            # --- Correção extra de encoding (strings "TransferÃªncia" etc.)
            df = self._fix_encoding(df)
            
            logger.info(f"✅ Arquivo carregado com sucesso!")
            logger.info(f"   📁 Arquivo: {latest_key}")
            logger.info(f"   📊 Registros: {len(df):,}")
            logger.info(f"   📋 Colunas: {len(df.columns)}")
            
            return df
            
        except Exception as e:
            logger.error(f"❌ Erro ao baixar arquivo do S3: {e}")
            logger.info("📋 Tentando usar cache local como fallback...")
            
            # Tentar carregar do cache local se existir
            try:
                cache_info = self.get_cache_info()
                if cache_info.get('cache_enabled') and cache_info.get('files', 0) > 0:
                    # Carregar o arquivo mais recente do cache
                    latest_cache = cache_info['cached_files'][0]
                    cache_key = latest_cache['metadata'].get('s3_key', '')
                    if cache_key:
                        logger.info(f"📋 Carregando do cache: {cache_key}")
                        return self._load_cached_file(cache_key)
            except Exception as cache_error:
                logger.warning(f"⚠️ Erro ao carregar cache: {cache_error}")
            
            logger.error("❌ Nenhum dado disponível (S3 e cache falharam)")
            return None
    
    def _find_latest_file(self) -> Optional[str]:
        """
        Encontra o arquivo SIOP mais recente no S3
        Busca em siop-data/ com estrutura YYYY/MM/DD/
        """
        try:
            # Prefixo onde o bot salva os arquivos
            prefix = "siop-data/"
            
            logger.info(f"🔍 Procurando arquivos em s3://{self.bucket_name}/{prefix}")
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                logger.warning(f"⚠️ Nenhum arquivo encontrado em {prefix}")
                return None
            
            # Filtrar apenas arquivos SIOP (.csv, .xlsx, .xls)
            siop_files = []
            for obj in response['Contents']:
                key = obj['Key']
                if any(key.lower().endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
                    # Verificar se segue padrão SIOP_
                    filename = key.split('/')[-1]
                    if filename.startswith('SIOP_'):
                        siop_files.append(obj)
                        logger.info(f"   📄 Encontrado: {key} (modificado em {obj['LastModified']})")
            
            if not siop_files:
                logger.warning("⚠️ Nenhum arquivo SIOP válido encontrado")
                return None
            
            # Ordenar por data de modificação (mais recente primeiro)
            latest_file = sorted(
                siop_files, 
                key=lambda x: x['LastModified'], 
                reverse=True
            )[0]
            
            logger.info(f"✅ Arquivo mais recente: {latest_file['Key']}")
            logger.info(f"�� Última modificação: {latest_file['LastModified']}")
            
            return latest_file['Key']
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar arquivos no S3: {e}")
            return None
    
    def get_file_metadata(self, s3_key: str) -> Dict:
        """Obtém metadados de um arquivo no S3"""
        if not self.is_configured:
            return {}
        
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name, 
                Key=s3_key
            )
            
            return {
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'metadata': response.get('Metadata', {})
            }
        except Exception as e:
            logger.error(f"Erro ao obter metadados: {e}")
            return {}
    
    def list_recent_files(self, days: int = 7) -> List[Dict]:
        """Lista arquivos recentes no S3"""
        if not self.is_configured:
            return []
        
        try:
            prefix = "siop-data/"  # Prefixo correto onde os arquivos são salvos
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                cutoff_date = datetime.now() - timedelta(days=days)
                
                for obj in response['Contents']:
                    # Filtrar apenas arquivos SIOP válidos
                    key = obj['Key']
                    filename = key.split('/')[-1]
                    if filename.startswith('SIOP_') and any(key.lower().endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
                        if obj['LastModified'].replace(tzinfo=None) > cutoff_date:
                            files.append({
                                'key': obj['Key'],
                                'filename': filename,
                                'size': obj['Size'],
                                'last_modified': obj['LastModified']
                            })
            
            return sorted(files, key=lambda x: x['last_modified'], reverse=True)
            
        except Exception as e:
            logger.error(f"Erro ao listar arquivos: {e}")
            return []
    
    def _is_file_cached(self, s3_key: str) -> bool:
        """Verifica se arquivo já está em cache local"""
        try:
            cache_dir = self._get_cache_dir()
            cache_file = os.path.join(cache_dir, self._get_cache_filename(s3_key))
            metadata_file = f"{cache_file}.meta"
            
            # Verificar se arquivos existem
            if not (os.path.exists(cache_file) and os.path.exists(metadata_file)):
                return False
            
            # Verificar se cache ainda é válido (último arquivo S3)
            with open(metadata_file, 'r') as f:
                import json
                metadata = json.load(f)
            
            # Comparar timestamp do S3 com cache
            s3_metadata = self.get_file_metadata(s3_key)
            if not s3_metadata:
                return False
            
            s3_modified = s3_metadata.get('last_modified')
            cache_modified = metadata.get('s3_last_modified')
            
            if s3_modified and cache_modified:
                # Converter strings para datetime se necessário
                if isinstance(s3_modified, str):
                    s3_modified = datetime.fromisoformat(s3_modified.replace('Z', '+00:00'))
                if isinstance(cache_modified, str):
                    cache_modified = datetime.fromisoformat(cache_modified.replace('Z', '+00:00'))
                
                # Cache válido se datas são iguais
                return s3_modified == cache_modified
            
            return False
            
        except Exception as e:
            logger.error(f"Erro ao verificar cache: {e}")
            return False
    
    def _load_cached_file(self, s3_key: str) -> Optional[pd.DataFrame]:
        """Carrega arquivo do cache local"""
        try:
            cache_dir = self._get_cache_dir()
            cache_file = os.path.join(cache_dir, self._get_cache_filename(s3_key))
            
            if cache_file.endswith('.csv'):
                df = pd.read_csv(cache_file, sep=';', encoding='utf-8', low_memory=False)
            else:
                df = pd.read_pickle(cache_file)  # Formato pickle para preservar tipos
            
            logger.info(f"📋 Cache carregado: {len(df)} registros")
            return df
            
        except Exception as e:
            logger.error(f"Erro ao carregar cache: {e}")
            return None
    
    def _save_to_cache(self, s3_key: str, df: pd.DataFrame):
        """Salva DataFrame no cache local"""
        try:
            cache_dir = self._get_cache_dir()
            os.makedirs(cache_dir, exist_ok=True)
            
            cache_file = os.path.join(cache_dir, self._get_cache_filename(s3_key))
            metadata_file = f"{cache_file}.meta"
            
            # Salvar dados (pickle preserva tipos de dados)
            df.to_pickle(cache_file)
            
            # Salvar metadados
            s3_metadata = self.get_file_metadata(s3_key)
            cache_metadata = {
                's3_key': s3_key,
                's3_last_modified': s3_metadata.get('last_modified', '').isoformat() if s3_metadata.get('last_modified') else '',
                'cache_created': datetime.now().isoformat(),
                'records_count': len(df),
                'columns_count': len(df.columns)
            }
            
            import json
            with open(metadata_file, 'w') as f:
                json.dump(cache_metadata, f, indent=2, default=str)
            
            logger.info(f"💾 Arquivo salvo em cache local")
            
        except Exception as e:
            logger.error(f"Erro ao salvar cache: {e}")
    
    def _get_cache_dir(self) -> str:
        """Retorna diretório de cache"""
        return os.path.join(os.path.dirname(__file__), '..', '.cache', 's3_data')
    
    def _get_cache_filename(self, s3_key: str) -> str:
        """Gera nome de arquivo para cache baseado na chave S3"""
        # Extrair nome do arquivo e substituir caracteres especiais
        filename = s3_key.split('/')[-1]
        safe_filename = filename.replace(':', '_').replace('/', '_')
        return f"{safe_filename}.pkl"
    
    def clear_cache(self):
        """Limpa cache local"""
        try:
            cache_dir = self._get_cache_dir()
            if os.path.exists(cache_dir):
                import shutil
                shutil.rmtree(cache_dir)
                logger.info("🧹 Cache limpo com sucesso")
            
        except Exception as e:
            logger.error(f"Erro ao limpar cache: {e}")
    
    def get_cache_info(self) -> Dict:
        """Retorna informações sobre o cache atual"""
        try:
            cache_dir = self._get_cache_dir()
            if not os.path.exists(cache_dir):
                return {'cache_enabled': False, 'files': 0, 'total_size': 0}
            
            files = []
            total_size = 0
            
            for filename in os.listdir(cache_dir):
                if filename.endswith('.pkl'):
                    filepath = os.path.join(cache_dir, filename)
                    size = os.path.getsize(filepath)
                    total_size += size
                    
                    # Carregar metadados se existir
                    meta_file = f"{filepath}.meta"
                    metadata = {}
                    if os.path.exists(meta_file):
                        import json
                        with open(meta_file, 'r') as f:
                            metadata = json.load(f)
                    
                    files.append({
                        'filename': filename,
                        'size': size,
                        'metadata': metadata
                    })
            
            return {
                'cache_enabled': True,
                'files': len(files),
                'total_size': total_size,
                'cached_files': files
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter info do cache: {e}")
            return {'cache_enabled': False, 'error': str(e)}

    def _parse_csv_with_encoding_detection(self, file_content: bytes) -> pd.DataFrame:
        """
        Parse CSV com detecção robusta de encoding
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            
        Returns:
            DataFrame pandas
        """
        logger.info("🔍 Iniciando detecção de encoding...")
        
        # Lista de encodings para tentar (em ordem de prioridade)
        encodings_to_try = [
            ('utf-8-sig', ';'),      # UTF-8 com BOM, separador ;
            ('utf-8', ';'),          # UTF-8 sem BOM, separador ;
            ('latin1', ';'),         # Latin1, separador ;
            ('cp1252', ';'),         # Windows-1252, separador ;
            ('iso-8859-1', ';'),     # ISO-8859-1, separador ;
            ('utf-16', ';'),         # UTF-16, separador ;
            ('utf-8-sig', ','),      # UTF-8 com BOM, separador ,
            ('utf-8', ','),          # UTF-8 sem BOM, separador ,
            ('latin1', ','),         # Latin1, separador ,
            ('cp1252', ','),         # Windows-1252, separador ,
            ('iso-8859-1', ','),     # ISO-8859-1, separador ,
        ]
        
        # Tentar detecção automática de encoding se disponível
        try:
            import chardet
            detected = chardet.detect(file_content[:10000])  # Analisa primeiros 10KB
            if detected and detected['encoding'] and detected['confidence'] > 0.7:
                detected_encoding = detected['encoding']
                logger.info(f"🔍 Encoding detectado: {detected_encoding} (confiança: {detected['confidence']:.2f})")
                # Adicionar encoding detectado no início da lista
                encodings_to_try.insert(0, (detected_encoding, ';'))
                encodings_to_try.insert(1, (detected_encoding, ','))
        except ImportError:
            logger.warning("⚠️ chardet não disponível - usando lista padrão de encodings")
        except Exception as e:
            logger.warning(f"⚠️ Erro na detecção automática: {e}")
        
        # Tentar cada combinação de encoding + separador
        for encoding, separator in encodings_to_try:
            try:
                logger.info(f"🔄 Tentando: encoding={encoding}, separador='{separator}'")
                
                # Criar buffer de bytes
                buffer = pd.io.common.BytesIO(file_content)
                
                # Tentar ler CSV
                df = pd.read_csv(
                    buffer, 
                    sep=separator, 
                    encoding=encoding, 
                    low_memory=False, 
                    skiprows=[1]  # Pular primeira linha se for header duplicado
                )
                
                # Verificar se DataFrame é válido
                if df is not None and len(df) > 0 and len(df.columns) > 5:
                    logger.info(f"✅ Sucesso! encoding={encoding}, separador='{separator}'")
                    logger.info(f"   📊 Registros: {len(df):,}")
                    logger.info(f"   📋 Colunas: {len(df.columns)}")
                    logger.info(f"   📋 Primeiras colunas: {list(df.columns[:5])}")
                    
                    # Aplicar correção de encoding adicional se necessário
                    df = self._fix_encoding_if_needed(df)
                    
                    return df
                else:
                    logger.warning(f"⚠️ DataFrame inválido: {len(df) if df is not None else 0} registros")
                    
            except Exception as e:
                logger.warning(f"⚠️ Falha com {encoding}/{separator}: {str(e)[:100]}...")
                continue
        
        # Se chegou aqui, todas as tentativas falharam
        logger.error("❌ Todas as tentativas de parsing falharam")
        raise Exception("Não foi possível decodificar o arquivo CSV com nenhum encoding disponível")
    
    def _fix_encoding_if_needed(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Corrige problemas de encoding em strings do DataFrame
        
        Args:
            df: DataFrame para corrigir
            
        Returns:
            DataFrame com encoding corrigido
        """
        try:
            # Verificar se há caracteres mal codificados (indicativo de problema de encoding)
            problematic_chars = ['Ã¡', 'Ã©', 'Ã­', 'Ã³', 'Ãº', 'Ã¢', 'Ãª', 'Ã§', 'Ã ', 'Ã¤']
            
            needs_fix = False
            for column in df.columns:
                if df[column].dtype == 'object':
                    # Verificar se alguma string contém caracteres problemáticos
                    sample_values = df[column].dropna().astype(str).head(10).tolist()
                    for value in sample_values:
                        if any(char in value for char in problematic_chars):
                            needs_fix = True
                            break
                    if needs_fix:
                        break
            
            if needs_fix:
                logger.info("🔧 Aplicando correção de encoding adicional...")
                for column in df.columns:
                    if df[column].dtype == 'object':
                        # Tentar decodificar latin1 -> utf8
                        try:
                            df[column] = df[column].astype(str).str.encode('latin1', errors='ignore').str.decode('utf-8', errors='ignore')
                        except:
                            pass  # Se falhar, manter valor original
                            
                logger.info("✅ Correção de encoding aplicada")
            
            return df
            
        except Exception as e:
            logger.warning(f"⚠️ Erro na correção de encoding: {e}")
            return df  # Retornar DataFrame original se correção falhar

    def _fix_encoding(self, df: pd.DataFrame) -> pd.DataFrame:
        """Corrige encoding de strings em um DataFrame (método legado)"""
        return self._fix_encoding_if_needed(df) 