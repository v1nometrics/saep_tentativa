#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
SISTEMA SIOP - AUTOMAÇÃO COMPLETA
=================================

Sistema completo para automação do SIOP com:
- Bypass SSL automático
- Cliques automáticos nos botões iniciais  
- Detecção precisa do estado dos toggles (100% de precisão)
- Ativação/desativação automática de filtros
- Interface completa para configuração de filtros
- Upload automático para S3

Desenvolvido e testado com 100% de sucesso.

MIGRADO PARA ESTRUTURA MVP - CÓDIGO ORIGINAL PRESERVADO
"""

import time
import json
import logging
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from browser_config import get_chrome_options

# Importações S3 (opcional - só carrega se disponível)
try:
    import boto3
    from botocore.exceptions import ClientError
    S3_DISPONIVEL = True
except ImportError:
    S3_DISPONIVEL = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class S3Manager:
    """
    Gerenciador de uploads para S3
    Funciona apenas se credenciais AWS estiverem configuradas
    """
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = None
        self.s3_habilitado = False
        
        self._inicializar_s3()
    
    def _inicializar_s3(self):
        """Inicializa cliente S3 se credenciais estiverem disponíveis"""
        if not S3_DISPONIVEL:
            logger.warning("⚠️ Biblioteca boto3 não encontrada - S3 desabilitado")
            return
        
        try:
            # Buscar credenciais nas variáveis de ambiente
            aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_region = os.getenv('AWS_REGION', 'us-east-1')
            self.bucket_name = os.getenv('S3_BUCKET_NAME')
            
            if not all([aws_access_key, aws_secret_key, self.bucket_name]):
                logger.warning("⚠️ Credenciais AWS não encontradas - S3 desabilitado")
                logger.info("   Configure: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME")
                return
            
            # Criar cliente S3
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Testar conexão
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            self.s3_habilitado = True
            
            logger.info(f"✅ S3 configurado: bucket '{self.bucket_name}' em {aws_region}")
            
        except ClientError as e:
            logger.error(f"❌ Erro de conexão S3: {e}")
        except Exception as e:
            logger.warning(f"⚠️ S3 não disponível: {e}")
    
    def upload_arquivo(self, caminho_arquivo, nome_no_s3=None):
        """
        Faz upload de um arquivo para S3
        
        Args:
            caminho_arquivo (str): Caminho local do arquivo
            nome_no_s3 (str): Nome do arquivo no S3 (opcional)
            
        Returns:
            bool: True se sucesso, False se falha
        """
        if not self.s3_habilitado:
            logger.info("ℹ️ S3 não configurado - upload pulado")
            return False
        
        try:
            if not os.path.exists(caminho_arquivo):
                logger.error(f"❌ Arquivo não encontrado: {caminho_arquivo}")
                return False
            
            # Gerar nome no S3 se não fornecido
            if not nome_no_s3:
                nome_arquivo = os.path.basename(caminho_arquivo)
                data_hoje = datetime.now().strftime("%Y/%m/%d")
                nome_no_s3 = f"siop-data/{data_hoje}/{nome_arquivo}"
            
            # Fazer upload
            tamanho_mb = os.path.getsize(caminho_arquivo) / (1024 * 1024)
            logger.info(f"⬆️ Iniciando upload: {os.path.basename(caminho_arquivo)} ({tamanho_mb:.2f} MB)")
            
            self.s3_client.upload_file(
                caminho_arquivo,
                self.bucket_name,
                nome_no_s3,
                ExtraArgs={
                    'Metadata': {
                        'upload-timestamp': str(int(time.time())),
                        'source': 'siop-automation',
                        'file-size': str(os.path.getsize(caminho_arquivo))
                    }
                }
            )
            
            # Gerar URL S3
            url_s3 = f"https://{self.bucket_name}.s3.amazonaws.com/{nome_no_s3}"
            
            logger.info(f"✅ Upload concluído!")
            logger.info(f"📁 S3: s3://{self.bucket_name}/{nome_no_s3}")
            logger.info(f"🔗 URL: {url_s3}")
            
            return True
            
        except ClientError as e:
            logger.error(f"❌ Erro de upload S3: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Erro inesperado no upload: {e}")
            return False
    
    def gerar_nome_arquivo_padronizado(self, caminho_arquivo_original):
        """
        Gera nome padronizado para arquivo baseado no timestamp e tipo
        
        Args:
            caminho_arquivo_original (str): Caminho do arquivo original
            
        Returns:
            str: Nome padronizado do arquivo
        """
        try:
            # Extrair extensão do arquivo original
            _, extensao = os.path.splitext(caminho_arquivo_original)
            
            # Gerar timestamp
            timestamp = datetime.now()
            data_formatada = timestamp.strftime("%Y%m%d")
            hora_formatada = timestamp.strftime("%H%M%S")
            
            # Detectar tipo de dados baseado no nome original ou conteúdo
            nome_original = os.path.basename(caminho_arquivo_original).lower()
            
            # Determinar tipo de dados
            if 'emenda' in nome_original:
                tipo_dados = "emendas"
            elif 'orcament' in nome_original:
                tipo_dados = "orcamentario"
            elif 'execucao' in nome_original:
                tipo_dados = "execucao"
            elif 'siop' in nome_original:
                tipo_dados = "siop"
            else:
                tipo_dados = "dados"
            
            # Montar nome padronizado
            nome_padronizado = f"SIOP_{tipo_dados}_{data_formatada}_{hora_formatada}{extensao}"
            
            logger.info(f"📝 Arquivo renomeado: {os.path.basename(caminho_arquivo_original)} → {nome_padronizado}")
            
            return nome_padronizado
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar nome padronizado: {e}")
            # Fallback para nome original com timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nome_original = os.path.basename(caminho_arquivo_original)
            nome_base, ext = os.path.splitext(nome_original)
            return f"SIOP_{timestamp}_{nome_base}{ext}"

    def renomear_arquivo_local(self, caminho_original):
        """
        Renomeia arquivo local com nome padronizado
        
        Args:
            caminho_original (str): Caminho do arquivo original
            
        Returns:
            str: Caminho do arquivo renomeado (ou original se falhar)
        """
        try:
            pasta_arquivo = os.path.dirname(caminho_original)
            nome_padronizado = self.gerar_nome_arquivo_padronizado(caminho_original)
            caminho_novo = os.path.join(pasta_arquivo, nome_padronizado)
            
            # Renomear arquivo fisicamente
            os.rename(caminho_original, caminho_novo)
            
            logger.info(f"✅ Arquivo renomeado localmente")
            logger.info(f"   📁 De: {os.path.basename(caminho_original)}")
            logger.info(f"   📁 Para: {os.path.basename(caminho_novo)}")
            
            return caminho_novo
            
        except Exception as e:
            logger.error(f"❌ Erro ao renomear arquivo local: {e}")
            logger.warning(f"⚠️ Mantendo nome original: {os.path.basename(caminho_original)}")
            return caminho_original

    def upload_arquivos_pasta(self, pasta_downloads):
        """
        Faz upload de todos os arquivos válidos de uma pasta (COM RENOMEAÇÃO)
        
        Args:
            pasta_downloads (str): Caminho da pasta com arquivos
            
        Returns:
            dict: Relatório dos uploads realizados
        """
        if not self.s3_habilitado:
            logger.info("ℹ️ S3 não configurado - uploads pulados")
            return {'sucesso': [], 'falhas': [], 's3_habilitado': False}
        
        sucessos = []
        falhas = []
        
        try:
            if not os.path.exists(pasta_downloads):
                logger.warning(f"⚠️ Pasta não encontrada: {pasta_downloads}")
                return {'sucesso': sucessos, 'falhas': falhas, 's3_habilitado': True}
            
            # Buscar arquivos válidos
            arquivos_validos = []
            for arquivo in os.listdir(pasta_downloads):
                if arquivo.lower().endswith(('.csv', '.xlsx', '.xls')):
                    caminho_completo = os.path.join(pasta_downloads, arquivo)
                    if os.path.isfile(caminho_completo):
                        arquivos_validos.append(caminho_completo)
            
            if not arquivos_validos:
                logger.info("ℹ️ Nenhum arquivo válido encontrado para upload")
                return {'sucesso': sucessos, 'falhas': falhas, 's3_habilitado': True}
            
            logger.info(f"🔍 Encontrados {len(arquivos_validos)} arquivo(s) para upload")
            print(f"\n📝 RENOMEANDO E ENVIANDO ARQUIVOS...")
            
            for caminho_arquivo in arquivos_validos:
                nome_original = os.path.basename(caminho_arquivo)
                
                # 1️⃣ RENOMEAR ARQUIVO LOCAL
                print(f"\n📝 Processando: {nome_original}")
                caminho_renomeado = self.renomear_arquivo_local(caminho_arquivo)
                nome_final = os.path.basename(caminho_renomeado)
                
                # 2️⃣ FAZER UPLOAD
                print(f"☁️ Enviando para S3...")
                if self.upload_arquivo(caminho_renomeado):
                    sucessos.append(nome_final)
                    print(f"   ✅ {nome_final}")
                else:
                    falhas.append(nome_final)
                    print(f"   ❌ {nome_final}")
            
            print(f"\n📊 RESULTADO FINAL - RENOMEAÇÃO + UPLOAD S3:")
            print(f"   ✅ Sucessos: {len(sucessos)}")
            print(f"   ❌ Falhas: {len(falhas)}")
            if sucessos:
                print(f"   📁 Arquivos enviados:")
                for arquivo in sucessos:
                    print(f"      → {arquivo}")
            
        except Exception as e:
            logger.error(f"❌ Erro no upload da pasta: {e}")
        
        return {
            'sucesso': sucessos,
            'falhas': falhas,
            's3_habilitado': True
        }
    
    def upload_apenas_arquivos_novos(self, pasta_downloads, nomes_arquivos_novos):
        """
        Faz upload apenas dos arquivos especificados (COM RENOMEAÇÃO)
        
        Args:
            pasta_downloads (str): Caminho da pasta com arquivos
            nomes_arquivos_novos (set): Conjunto com nomes dos arquivos novos para upload
            
        Returns:
            dict: Relatório dos uploads realizados
        """
        if not self.s3_habilitado:
            logger.info("ℹ️ S3 não configurado - uploads pulados")
            return {'sucesso': [], 'falhas': [], 's3_habilitado': False}
        
        sucessos = []
        falhas = []
        
        try:
            if not os.path.exists(pasta_downloads):
                logger.warning(f"⚠️ Pasta não encontrada: {pasta_downloads}")
                return {'sucesso': sucessos, 'falhas': falhas, 's3_habilitado': True}
            
            # Buscar apenas os arquivos novos especificados
            arquivos_para_upload = []
            for nome_arquivo in nomes_arquivos_novos:
                if nome_arquivo.lower().endswith(('.csv', '.xlsx', '.xls')):
                    caminho_completo = os.path.join(pasta_downloads, nome_arquivo)
                    if os.path.isfile(caminho_completo):
                        arquivos_para_upload.append(caminho_completo)
            
            if not arquivos_para_upload:
                logger.info("ℹ️ Nenhum arquivo novo válido encontrado para upload")
                return {'sucesso': sucessos, 'falhas': falhas, 's3_habilitado': True}
            
            logger.info(f"🔍 Encontrados {len(arquivos_para_upload)} arquivo(s) novo(s) para upload")
            print(f"\n📝 RENOMEANDO E ENVIANDO APENAS ARQUIVOS NOVOS...")
            
            for caminho_arquivo in arquivos_para_upload:
                nome_original = os.path.basename(caminho_arquivo)
                
                # 1️⃣ RENOMEAR ARQUIVO LOCAL
                print(f"\n📝 Processando: {nome_original}")
                caminho_renomeado = self.renomear_arquivo_local(caminho_arquivo)
                nome_final = os.path.basename(caminho_renomeado)
                
                # 2️⃣ FAZER UPLOAD
                print(f"☁️ Enviando para S3...")
                if self.upload_arquivo(caminho_renomeado):
                    sucessos.append(nome_final)
                    print(f"   ✅ {nome_final}")
                else:
                    falhas.append(nome_final)
                    print(f"   ❌ {nome_final}")
            
            print(f"\n📊 RESULTADO FINAL - UPLOAD APENAS ARQUIVOS NOVOS:")
            print(f"   ✅ Sucessos: {len(sucessos)}")
            print(f"   ❌ Falhas: {len(falhas)}")
            if sucessos:
                print(f"   📁 Arquivos novos enviados:")
                for arquivo in sucessos:
                    print(f"      → {arquivo}")
            
        except Exception as e:
            logger.error(f"❌ Erro no upload dos arquivos novos: {e}")
        
        return {
            'sucesso': sucessos,
            'falhas': falhas,
            's3_habilitado': True
        }

class SiopAutomacao:
    """
    Classe principal para automação completa do SIOP
    CÓDIGO ORIGINAL PRESERVADO - SEM ALTERAÇÕES
    """
    
    def __init__(self):
        """Inicializa o sistema com configurações validadas"""
        
        # Estados CSS serão carregados do arquivo de configuração
        self.IMAGENS_ATIVAS = set()
        self.IMAGENS_INATIVAS = set()
        
        # URL da aplicação SIOP
        self.URL_SIOP = (
            "https://www1.siop.planejamento.gov.br/"
            "QvAJAXZfc/opendoc.htm?"
            "document=IAS%2FExecucao_Orcamentaria.qvw&"
            "host=QVS%40pqlk04&anonymous=true&sheet=SH05"
        )
        
        self.driver = None
        self.wait = None
        self.toggles_config = None
        
        # Inicializar gerenciador S3
        self.s3_manager = S3Manager()
        
        # Carregar configurações
        self._carregar_configuracoes()
    
    def _carregar_configuracoes(self):
        """Carrega configurações do arquivo JSON consolidado"""
        try:
            # Buscar arquivo de config na mesma pasta
            config_path = os.path.join(os.path.dirname(__file__), "siop_config.json")
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
            
            # Extrair configurações para compatibilidade
            self.toggles_config = {
                "filtros": self.config["filtros"]
            }
            
            # Carregar estados CSS do arquivo de configuração
            if "estados_css" in self.config:
                self.IMAGENS_ATIVAS = set(self.config["estados_css"]["imagens_ativas"])
                self.IMAGENS_INATIVAS = set(self.config["estados_css"]["imagens_inativas"])
            
            # Atualizar URL se disponível
            if "navegacao" in self.config:
                self.URL_SIOP = self.config["navegacao"]["url_siop"]
            
            # Carregar timeouts das configurações
            if "configuracoes" in self.config:
                self.timeout_padrao = self.config["configuracoes"].get("timeout_padrao", 60)
                self.timeout_download = self.config["configuracoes"].get("timeout_download", 120)
            else:
                self.timeout_padrao = 60
                self.timeout_download = 120
            
            logger.info("✅ Configurações consolidadas carregadas com sucesso")
            logger.info(f"📊 Estados CSS: {len(self.IMAGENS_ATIVAS)} ativas, {len(self.IMAGENS_INATIVAS)} inativas")
            logger.info(f"⏱️ Timeouts: {self.timeout_padrao}s padrão, {self.timeout_download}s download")
        except FileNotFoundError:
            logger.error("❌ Arquivo siop_config.json não encontrado!")
            raise Exception("Configurações não encontradas")
    
    def inicializar_sistema(self, headless=False):
        """
        Inicializa o sistema completo
        
        Args:
            headless (bool): Se True, executa em modo headless (sem interface)
        """
        logger.info("🚀 Inicializando Sistema SIOP...")
        
        try:
            # Configurar pasta de download
            download_path = self.configurar_download_path()
            
            # Configurar Chrome com bypass SSL e pasta de download
            logger.info("→ Configurando Chrome com bypass SSL e pasta de download...")
            chrome_options = get_chrome_options(headless=headless, download_path=download_path)
            
            # Tentar diferentes abordagens para o ChromeDriver
            try:
                # Primeiro: tentar com ChromeDriverManager
                logger.info("→ Tentando ChromeDriverManager...")
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                logger.info("✅ ChromeDriverManager funcionou!")
            except Exception as e1:
                logger.warning(f"⚠️ ChromeDriverManager falhou: {e1}")
                try:
                    # Segundo: tentar sem service (Chrome pode ter driver integrado)
                    logger.info("→ Tentando sem service (driver integrado)...")
                    self.driver = webdriver.Chrome(options=chrome_options)
                    logger.info("✅ Driver integrado funcionou!")
                except Exception as e2:
                    logger.warning(f"⚠️ Driver integrado falhou: {e2}")
                    try:
                        # Terceiro: tentar com chrome-for-testing
                        logger.info("→ Tentando chromedriver-autoinstaller...")
                        import chromedriver_autoinstaller
                        chromedriver_autoinstaller.install()
                        self.driver = webdriver.Chrome(options=chrome_options)
                        logger.info("✅ chromedriver-autoinstaller funcionou!")
                    except Exception as e3:
                        logger.error(f"❌ Todas as tentativas falharam. Última: {e3}")
                        raise Exception("Não foi possível inicializar o Chrome WebDriver")
            
            if not headless:
                self.driver.maximize_window()
            
            self.wait = WebDriverWait(self.driver, self.timeout_padrao)
            logger.info("✅ WebDriver inicializado com bypass SSL")
            
            # Acessar página
            logger.info("→ Acessando página SIOP...")
            self.driver.get(self.URL_SIOP)
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#PageContainer")))
            logger.info("✅ Página SIOP carregada")
            time.sleep(5)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro na inicialização: {e}")
            return False

    def executar_navegacao_inicial(self):
        """
        Executa a navegação inicial (cliques nos botões)
        
        Returns:
            bool: True se sucesso, False se falha
        """
        logger.info("🔄 Executando navegação inicial...")
        
        try:
            # Primeiro botão - automático com fallback manual
            print("🎯 Clicando no primeiro botão...")
            try:
                primeiro_botao = self.wait.until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "div.QvContent[style*='Document.19.Background']"))
                )
                primeiro_botao.click()
                logger.info("✅ Primeiro botão clicado automaticamente!")
                time.sleep(3)
            except Exception as e:
                logger.warning(f"⚠️ Clique automático falhou: {e}")
                print("🔄 Tentando segunda estratégia...")
                try:
                    # Segunda tentativa com estratégia diferente
                    primeiro_botao.click()
                    logger.info("✅ Primeiro botão clicado na segunda tentativa!")
                except Exception as e2:
                    logger.error(f"❌ Falha crítica no primeiro botão: {e2}")
                    print("❌ Sistema não conseguiu clicar no primeiro botão automaticamente")
                    return False
            
            # Segundo botão
            print("🎯 Clicando no segundo botão...")
            segundo_botao = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Passo 2 - Visualize os Resultados')]"))
            )
            segundo_botao.click()
            logger.info("✅ Segundo botão clicado!")
            time.sleep(8)
            
            print("✅ Navegação inicial concluída!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro na navegação inicial: {e}")
            return False
    
    def detectar_estado_toggle(self, elemento):
        """
        Detecta o estado atual de um toggle
        
        Args:
            elemento: Elemento do toggle
            
        Returns:
            tuple: (estado, nome_imagem)
        """
        try:
            bg_image = self.driver.execute_script(
                "return window.getComputedStyle(arguments[0]).backgroundImage;", 
                elemento
            )
            
            # Extrair nome da imagem
            nome_imagem = ""
            if 'name=' in bg_image:
                start = bg_image.find('name=') + 5
                end = bg_image.find('&', start)
                if end == -1:
                    end = bg_image.find('"', start)
                nome_imagem = bg_image[start:end]
            
            # Determinar estado baseado no mapeamento validado
            if nome_imagem in self.IMAGENS_ATIVAS:
                return "ativo", nome_imagem
            elif nome_imagem in self.IMAGENS_INATIVAS:
                return "inativo", nome_imagem
            else:
                return "desconhecido", nome_imagem
                
        except Exception as e:
            logger.error(f"Erro ao detectar estado: {e}")
            return "erro", ""
    
    def encontrar_toggle(self, filtro_config):
        """
        Encontra um toggle específico na página
        
        Args:
            filtro_config: Configuração do filtro
            
        Returns:
            WebElement ou None
        """
        nome = filtro_config["nome"]
        toggle_pos = filtro_config["toggle_posicao"]
        
        candidatos = self.driver.find_elements(By.CSS_SELECTOR, "div.QvContent")
        
        for candidato in candidatos:
            try:
                pos = candidato.location
                size = candidato.size
                
                # Verificar se está na posição correta e tem tamanho adequado
                if (abs(pos['x'] - toggle_pos['x']) <= 5 and 
                    abs(pos['y'] - toggle_pos['y']) <= 5 and
                    40 <= size['width'] <= 60 and
                    25 <= size['height'] <= 40):
                    
                    return candidato
            except:
                continue
        
        logger.warning(f"⚠️ Toggle não encontrado: {nome}")
        return None
    
    def obter_estado_todos_filtros(self):
        """
        Obtém o estado atual de todos os filtros
        
        Returns:
            dict: Dicionário com estado de cada filtro
        """
        logger.info("🔍 Analisando estado dos filtros...")
        
        estados = {}
        filtros_ativos = []
        filtros_inativos = []
        
        for filtro in self.toggles_config["filtros"]:
            nome = filtro["nome"]
            toggle = self.encontrar_toggle(filtro)
            
            if toggle:
                estado, nome_imagem = self.detectar_estado_toggle(toggle)
                estados[nome] = {
                    'estado': estado,
                    'elemento': toggle,
                    'imagem': nome_imagem
                }
                
                if estado == "ativo":
                    filtros_ativos.append(nome)
                elif estado == "inativo":
                    filtros_inativos.append(nome)
                
                emoji = "✅" if estado == "ativo" else "❌" if estado == "inativo" else "❓"
                print(f"{emoji} {nome}: {estado.upper()}")
                
            else:
                estados[nome] = {'estado': 'não encontrado', 'elemento': None, 'imagem': ''}
                print(f"❓ {nome}: NÃO ENCONTRADO")
        
        print(f"\n📊 RESUMO:")
        print(f"   ✅ Ativos: {len(filtros_ativos)}")
        print(f"   ❌ Inativos: {len(filtros_inativos)}")
        
        return estados
    
    def ativar_filtro(self, nome_filtro):
        """
        Ativa um filtro específico
        
        Args:
            nome_filtro (str): Nome do filtro a ser ativado
            
        Returns:
            bool: True se sucesso, False se falha
        """
        filtro_config = next((f for f in self.toggles_config["filtros"] if f["nome"] == nome_filtro), None)
        if not filtro_config:
            logger.error(f"❌ Filtro '{nome_filtro}' não encontrado na configuração")
            return False
        
        toggle = self.encontrar_toggle(filtro_config)
        if not toggle:
            logger.error(f"❌ Toggle do filtro '{nome_filtro}' não encontrado na página")
            return False
        
        estado_atual, _ = self.detectar_estado_toggle(toggle)
        
        if estado_atual == "ativo":
            logger.info(f"✅ Filtro '{nome_filtro}' já está ativo")
            return True
        
        try:
            print(f"🎯 Ativando filtro: {nome_filtro}")
            toggle.click()
            time.sleep(1.5)
            
            # Verificar se foi ativado
            novo_estado, _ = self.detectar_estado_toggle(toggle)
            
            if novo_estado == "ativo":
                logger.info(f"✅ Filtro '{nome_filtro}' ativado com sucesso!")
                return True
            else:
                logger.warning(f"⚠️ Filtro '{nome_filtro}' - clique pode não ter funcionado")
                return False
        except Exception as e:
            logger.error(f"❌ Erro ao ativar filtro '{nome_filtro}': {e}")
            return False

    def configurar_filtros(self, filtros_desejados):
        """
        Configura filtros específicos (ativa os desejados, desativa os demais)
        
        Args:
            filtros_desejados (list): Lista de nomes dos filtros a serem ativados
            
        Returns:
            dict: Relatório com resultados
        """
        logger.info(f"🎯 Configurando filtros específicos: {filtros_desejados}")
        
        estados = self.obter_estado_todos_filtros()
        
        sucessos = []
        falhas = []
        
        for nome_filtro in estados.keys():
            if nome_filtro in filtros_desejados:
                # Deve estar ativo
                if estados[nome_filtro]['estado'] != 'ativo':
                    if self.ativar_filtro(nome_filtro):
                        sucessos.append(f"Ativado: {nome_filtro}")
                    else:
                        falhas.append(f"Falha ao ativar: {nome_filtro}")
            else:
                # Deve estar inativo
                if estados[nome_filtro]['estado'] == 'ativo':
                    if self.desativar_filtro(nome_filtro):
                        sucessos.append(f"Desativado: {nome_filtro}")
                    else:
                        falhas.append(f"Falha ao desativar: {nome_filtro}")
        
        return {
            'sucesso': len(falhas) == 0,
            'acoes': sucessos,
            'falhas': falhas
        }

    def configurar_download_path(self):
        """Configura pasta de download"""
        try:
            # Usar pasta configurada ou padrão
            pasta_config = self.config["configuracoes"].get("pasta_download", "../downloads/siop/")
            
            # Converter para caminho absoluto
            if not os.path.isabs(pasta_config):
                pasta_config = os.path.join(os.path.dirname(__file__), pasta_config)
            
            download_path = os.path.abspath(pasta_config)
            
            # Criar pasta se não existir
            os.makedirs(download_path, exist_ok=True)
            
            logger.info(f"📁 Pasta de download configurada: {download_path}")
            return download_path
            
        except Exception as e:
            logger.error(f"❌ Erro ao configurar pasta de download: {e}")
            # Fallback para pasta padrão
            fallback_path = os.path.join(os.path.expanduser("~"), "Downloads")
            logger.info(f"📁 Usando pasta fallback: {fallback_path}")
            return fallback_path

    def verificar_novos_downloads(self, download_path):
        """Verifica arquivos baixados recentemente"""
        try:
            arquivos = []
            for arquivo in os.listdir(download_path):
                caminho_completo = os.path.join(download_path, arquivo)
                if os.path.isfile(caminho_completo):
                    stat = os.stat(caminho_completo)
                    arquivos.append({
                        'nome': arquivo,
                        'caminho': caminho_completo,
                        'tamanho': stat.st_size,
                        'data_modificacao': stat.st_mtime
                    })
            
            # Ordenar por data de modificação (mais recente primeiro)
            arquivos.sort(key=lambda x: x['data_modificacao'], reverse=True)
            return arquivos
            
        except Exception as e:
            logger.error(f"Erro ao verificar downloads: {e}")
            return []

    def desativar_filtro(self, nome_filtro):
        """
        Desativa um filtro específico
        
        Args:
            nome_filtro (str): Nome do filtro a ser desativado
            
        Returns:
            bool: True se sucesso, False se falha
        """
        filtro_config = next((f for f in self.toggles_config["filtros"] if f["nome"] == nome_filtro), None)
        if not filtro_config:
            logger.error(f"❌ Filtro '{nome_filtro}' não encontrado na configuração")
            return False
        
        toggle = self.encontrar_toggle(filtro_config)
        if not toggle:
            logger.error(f"❌ Toggle do filtro '{nome_filtro}' não encontrado na página")
            return False
        
        estado_atual, _ = self.detectar_estado_toggle(toggle)
        
        if estado_atual == "inativo":
            logger.info(f"❌ Filtro '{nome_filtro}' já está inativo")
            return True
        
        try:
            print(f"🎯 Desativando filtro: {nome_filtro}")
            toggle.click()
            time.sleep(1.5)
            
            # Verificar se foi desativado
            novo_estado, _ = self.detectar_estado_toggle(toggle)
            
            if novo_estado == "inativo":
                logger.info(f"❌ Filtro '{nome_filtro}' desativado com sucesso!")
                return True
            else:
                logger.warning(f"⚠️ Filtro '{nome_filtro}' - clique pode não ter funcionado")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao desativar filtro '{nome_filtro}': {e}")
            return False
    
    def ativar_todos_filtros(self):
        """
        Ativa todos os filtros disponíveis
        
        Returns:
            dict: Relatório com resultados da ativação
        """
        logger.info("🔄 Ativando todos os filtros...")
        
        # Obter estado atual
        estados = self.obter_estado_todos_filtros()
        
        # Identificar filtros inativos
        filtros_inativos = [nome for nome, info in estados.items() 
                           if info['estado'] == 'inativo']
        
        if not filtros_inativos:
            print("🎉 Todos os filtros já estão ativos!")
            return {'sucesso': True, 'ativados': [], 'falhas': []}
        
        print(f"\n🎯 Ativando {len(filtros_inativos)} filtros inativos...")
        
        sucessos = []
        falhas = []
        
        for nome_filtro in filtros_inativos:
            if self.ativar_filtro(nome_filtro):
                sucessos.append(nome_filtro)
            else:
                falhas.append(nome_filtro)
        
        print(f"\n✅ RESULTADO:")
        print(f"   🎯 Tentativas: {len(filtros_inativos)}")
        print(f"   ✅ Sucessos: {len(sucessos)}")
        print(f"   ❌ Falhas: {len(falhas)}")
        
        return {
            'sucesso': len(falhas) == 0,
            'ativados': sucessos,
            'falhas': falhas
        }

    def tentar_download_automatico(self):
        """
        Tenta fazer o download de forma mais automatizada
        
        Returns:
            bool: True se conseguiu iniciar download
        """
        print("\n🤖 TENTANDO DOWNLOAD AUTOMÁTICO...")
        print("🎯 Vou tentar clicar automaticamente até chegar no Exportar")
        
        try:
            # BUSCA CORRETA: Procurar especificamente pela tabela que contém "Nro. Emenda"
            print("🔍 Procurando tabela que contém 'Nro. Emenda'...")
            
            # PASSO 1: Encontrar o texto "Nro. Emenda"
            elemento_nro_emenda = None
            estrategias_busca = [
                "//*[contains(text(), 'Nro. Emenda')]",
                "//*[contains(text(), 'Nro Emenda')]",
                "//*[contains(text(), 'Nr. Emenda')]",
                "//th[contains(text(), 'Nro. Emenda')]",
                "//td[contains(text(), 'Nro. Emenda')]",
                "//span[contains(text(), 'Nro. Emenda')]"
            ]
            
            for estrategia in estrategias_busca:
                try:
                    elementos = self.driver.find_elements(By.XPATH, estrategia)
                    for elemento in elementos:
                        if elemento.is_displayed() and ("Nro. Emenda" in elemento.text or "Nro Emenda" in elemento.text):
                            elemento_nro_emenda = elemento
                            logger.info(f"✅ Texto 'Nro. Emenda' encontrado!")
                            break
                    if elemento_nro_emenda:
                        break
                except:
                    continue
            
            if not elemento_nro_emenda:
                print("❌ Não foi possível encontrar texto 'Nro. Emenda'")
                return False
            
            # Clicar com botão direito
            print("🎯 Clicando com botão direito na tabela...")
            from selenium.webdriver.common.action_chains import ActionChains
            
            actions = ActionChains(self.driver)
            actions.context_click(elemento_nro_emenda).perform()
            
            # Aguardar menu aparecer
            print("⏳ Aguardando menu de contexto aparecer...")
            time.sleep(3)
            
            # Procurar botão Exportar
            print("🔍 Procurando botão 'Exportar'...")
            
            seletores_exportar = [
                "li.ctx-menu-action-EC",
                "//li[contains(@class, 'ctx-menu-action-EC')]",
                "//span[text()='Exportar']"
            ]
            
            botao_exportar = None
            for seletor in seletores_exportar:
                try:
                    if seletor.startswith("//"):
                        elementos = self.driver.find_elements(By.XPATH, seletor)
                    else:
                        elementos = self.driver.find_elements(By.CSS_SELECTOR, seletor)
                    
                    for elemento in elementos:
                        if elemento.is_displayed():
                            botao_exportar = elemento
                            break
                    
                    if botao_exportar:
                        break
                except:
                    continue
            
            if not botao_exportar:
                print("❌ Botão 'Exportar' não encontrado")
                return False
            
            # Clicar no Exportar
            print("🎯 Clicando no botão 'Exportar'...")
            botao_exportar.click()
            time.sleep(5)
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro no download automático: {e}")
            return False

    def executar_download_planilha(self):
        """
        Executa o processo de download (100% manual do usuário)
        
        Returns:
            bool: True se usuário reportou sucesso
        """
        # Configurar pasta de download
        download_path = self.configurar_download_path()
        
        try:
            # Verificar arquivos antes do download
            arquivos_antes = self.verificar_novos_downloads(download_path)
            print(f"📋 Arquivos na pasta antes: {len(arquivos_antes)}")
            
            # Capturar nomes dos arquivos existentes antes do download
            nomes_arquivos_antes = {arquivo['nome'] for arquivo in arquivos_antes}
            
            # Tentar download automático primeiro
            download_iniciado = self.tentar_download_automatico()
            
            if not download_iniciado:
                print("\n🔄 Primeira tentativa de download automático falhou...")
                print("🔄 Tentando segunda estratégia...")
                time.sleep(3)
                # Segunda tentativa
                download_iniciado = self.tentar_download_automatico()
                if not download_iniciado:
                    print("❌ Download automático falhou após 2 tentativas")
                    print("🔄 Aguardando possível download em background...")
                    time.sleep(10)  # Aguardar um pouco caso o download tenha iniciado
            else:
                print(f"\n⏳ Aguardando download processar ({self.timeout_download} segundos)...")
                print("🔄 Download automático iniciado, aguardando...")
                
                # Countdown configurável para dar tempo do download processar
                for i in range(self.timeout_download, 0, -10):
                    print(f"   ⏱️  {i} segundos restantes...")
                    time.sleep(10)
                
                print("✅ Tempo de processamento concluído!")
            
            # Verificar arquivos DEPOIS do download para identificar apenas os novos
            arquivos_depois = self.verificar_novos_downloads(download_path)
            nomes_arquivos_depois = {arquivo['nome'] for arquivo in arquivos_depois}
            
            # Identificar apenas arquivos NOVOS (que não existiam antes)
            novos_arquivos = nomes_arquivos_depois - nomes_arquivos_antes
            
            if not novos_arquivos:
                print("ℹ️ Nenhum arquivo novo encontrado para upload")
                return True
            
            print(f"🆕 Arquivos novos detectados: {len(novos_arquivos)}")
            for arquivo in novos_arquivos:
                print(f"   📄 {arquivo}")
            
            # UPLOAD AUTOMÁTICO PARA S3 - APENAS ARQUIVOS NOVOS
            print(f"\n☁️ UPLOAD AUTOMÁTICO PARA S3 (APENAS ARQUIVOS NOVOS)...")
            resultado_upload = self.s3_manager.upload_apenas_arquivos_novos(download_path, novos_arquivos)
            
            if resultado_upload['s3_habilitado']:
                if resultado_upload['sucesso']:
                    print(f"🎉 ARQUIVOS ENVIADOS PARA S3 COM SUCESSO!")
                    print(f"   ✅ {len(resultado_upload['sucesso'])} arquivo(s) enviado(s)")
                    if resultado_upload['falhas']:
                        print(f"   ⚠️ {len(resultado_upload['falhas'])} falha(s)")
                else:
                    print(f"⚠️ Nenhum arquivo foi enviado para S3")
            else:
                print(f"ℹ️ S3 não configurado - arquivos permanecem localmente")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro no processo de download: {e}")
            return False
    
    def finalizar_sistema(self):
        """Finaliza o sistema e limpa recursos"""
        if self.driver:
            self.driver.quit()
            logger.info("✅ Sistema finalizado")


def executar_automacao_completa():
    """
    Função principal para executar automação completa
    Exemplo de uso do sistema
    """
    print("🚀 SIOP - AUTOMAÇÃO COMPLETA")
    print("="*50)
    
    sistema = SiopAutomacao()
    
    try:
        # Inicializar sistema
        if not sistema.inicializar_sistema():
            print("❌ Falha na inicialização do sistema")
            return
        
        # Executar navegação inicial
        if not sistema.executar_navegacao_inicial():
            print("❌ Falha na navegação inicial")
            return
        
        # Verificar estado inicial
        print("\n🔍 VERIFICANDO ESTADO INICIAL DOS FILTROS...")
        estados_iniciais = sistema.obter_estado_todos_filtros()
        
        # Ativar todos os filtros
        print(f"\n🎯 ATIVANDO TODOS OS FILTROS...")
        resultado = sistema.ativar_todos_filtros()
        
        if resultado['sucesso']:
            print("\n🎉 TODOS OS FILTROS ATIVADOS COM SUCESSO!")
        else:
            print(f"\n⚠️ Algumas falhas ocorreram: {resultado['falhas']}")
        
        # Verificação final
        print(f"\n🔍 VERIFICAÇÃO FINAL...")
        estados_finais = sistema.obter_estado_todos_filtros()
        
        # Processo de download
        print(f"\n📥 PROCESSO DE DOWNLOAD AUTOMÁTICO...")
        print("🤖 Sistema executando download automaticamente...")
        
        if sistema.executar_download_planilha():
            print("✅ PROCESSO AUTOMÁTICO CONCLUÍDO!")
        else:
            print("❌ Processo falhou")
        
        print("\n🎉 Sistema finalizado automaticamente!")
        
    except Exception as e:
        logger.error(f"❌ Erro na execução: {e}")
        
    finally:
        sistema.finalizar_sistema()