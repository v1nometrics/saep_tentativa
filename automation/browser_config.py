#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Configurações padrão do Chrome para contornar problemas de certificado SSL
"""

import os
import tempfile
import uuid
from selenium.webdriver.chrome.options import Options

def get_chrome_options(headless=False, download_path=None):
    """
    Retorna configurações otimizadas do Chrome para contornar problemas de certificado SSL
    
    Args:
        headless (bool): Se True, executa em modo headless
        download_path (str): Caminho onde fazer downloads automaticamente
        
    Returns:
        Options: Objeto com todas as configurações necessárias
    """
    chrome_options = Options()
    
    # CORREÇÃO: Criar diretório de dados temporário único
    temp_dir = os.path.join(tempfile.gettempdir(), f"chrome_user_data_{uuid.uuid4().hex[:8]}")
    chrome_options.add_argument(f"--user-data-dir={temp_dir}")
    
    # Configurações de SSL/TLS - MAIS IMPORTANTES
    chrome_options.add_argument("--ignore-ssl-errors=yes")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--ignore-certificate-errors-spki-list")
    chrome_options.add_argument("--ignore-ssl-errors-during-mixed-content")
    chrome_options.add_argument("--allow-running-insecure-content")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--accept-insecure-certs")
    chrome_options.add_argument("--test-type")
    chrome_options.add_argument("--disable-certificate-transparency")
    chrome_options.add_argument("--allow-running-insecure-content")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor")
    
    # Configurações gerais de performance e estabilidade
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-plugins")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Configurações para evitar detecção de automação
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Configurações específicas para sites governamentais
    chrome_options.add_argument("--disable-extensions-file-access-check")
    chrome_options.add_argument("--disable-extensions-http-throttling")
    
    # CORREÇÃO: Porto de debug único para evitar conflitos
    import random
    debug_port = random.randint(9223, 9999)
    chrome_options.add_argument(f"--remote-debugging-port={debug_port}")
    
    # Compatibilidade adicional para versões mais novas do Chrome
    chrome_options.add_argument("--disable-search-engine-choice-screen")
    chrome_options.add_argument("--disable-features=VizServiceDisplayCompositor")
    chrome_options.add_argument("--enable-unsafe-swiftshader")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor,VizServiceDisplayCompositor")
    chrome_options.add_argument("--disable-ipc-flooding-protection")
    chrome_options.add_argument("--disable-renderer-backgrounding")
    chrome_options.add_argument("--disable-backgrounding-occluded-windows")
    
    # Modo headless se solicitado
    if headless:
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-images")
    
    # Configurações experimentais para SSL
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    
    # Preferências para certificados e downloads
    prefs = {
        "profile.default_content_setting_values": {
            "notifications": 2,
            "media_stream": 2,
        },
        "profile.default_content_settings": {
            "popups": 0
        },
        "profile.managed_default_content_settings": {
            "images": 1
        }
    }
    
    # Configurar pasta de download se especificada
    if download_path:
        prefs.update({
            "download.default_directory": download_path,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True,
            "safebrowsing.disable_download_protection": True,
            "plugins.always_open_pdf_externally": True
        })
    
    chrome_options.add_experimental_option("prefs", prefs)
    
    return chrome_options 