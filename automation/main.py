#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MAIN - Automação SIOP
====================

Entry point principal para execução da automação SIOP
Versão clean preparada para implementação S3

Modos de execução:
- main: Execução principal do bot completo
- enhanced: Execução com upload S3 automático
- test: Testes básicos de funcionamento
"""

import sys
import os
import argparse
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def run_main():
    """Executa bot principal completo"""
    print("🚀 EXECUTANDO AUTOMAÇÃO SIOP")
    print("="*50)
    
    try:
        # Importar e executar código principal
        from siop_core import executar_automacao_completa
        executar_automacao_completa()
    except Exception as e:
        print(f"❌ Erro na execução: {e}")
        return False
    
    return True

def run_enhanced():
    """Executa bot com upload S3"""
    print("🚀 EXECUTANDO AUTOMAÇÃO SIOP COM S3")
    print("="*50)
    
    try:
        # Importar e executar código principal
        from siop_core import executar_automacao_completa
        
        # Executar automação normal
        result = executar_automacao_completa()
        
        if result:
            # Upload para S3 usando o backend
            print("\n📤 INICIANDO UPLOAD PARA S3...")
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
            
            from services.s3_service import S3Service
            
            s3_service = S3Service()
            downloads_path = os.path.join(os.getcwd(), "..", "downloads", "siop")
            
            # Fazer upload de todos os arquivos CSV
            from pathlib import Path
            csv_files = list(Path(downloads_path).glob("*.csv"))
            
            if csv_files:
                upload_success = True
                for csv_file in csv_files:
                    try:
                        s3_service.upload_file(str(csv_file), f"siop-data/{csv_file.name}")
                        print(f"✅ Arquivo enviado: {csv_file.name}")
                    except Exception as e:
                        print(f"❌ Erro ao enviar {csv_file.name}: {e}")
                        upload_success = False
                
                if upload_success:
                    print("✅ Upload para S3 concluído com sucesso!")
                else:
                    print("⚠️ Upload parcial - alguns arquivos falharam")
            else:
                print("⚠️ Nenhum arquivo CSV encontrado para upload")
        
        return result
        
    except Exception as e:
        print(f"❌ Erro na execução enhanced: {e}")
        return False

def run_test():
    """Executa testes básicos"""
    print("🧪 EXECUTANDO TESTES")
    print("="*30)
    
    success = True
    
    # Teste 1: Importações
    try:
        from siop_core import SiopAutomacao
        print("✅ Importações funcionando")
    except Exception as e:
        print(f"❌ Erro nas importações: {e}")
        success = False
    
    # Teste 2: Inicialização
    try:
        sistema = SiopAutomacao()
        print("✅ Inicialização funcionando")
    except Exception as e:
        print(f"❌ Erro na inicialização: {e}")
        success = False
    
    # Teste 3: Configurações
    try:
        if hasattr(sistema, 'config') and sistema.config:
            print("✅ Configurações carregadas")
            print(f"   📊 {len(sistema.config.get('filtros', []))} filtros configurados")
        else:
            print("⚠️ Configurações vazias")
    except Exception as e:
        print(f"❌ Erro nas configurações: {e}")
        success = False
    
    return success

def main():
    """Função principal com argumentos"""
    parser = argparse.ArgumentParser(description='Automação SIOP - MVP Clean')
    parser.add_argument(
        '--mode', 
        choices=['main', 'enhanced', 'test'], 
        default='main',
        help='Modo de execução (padrão: main)'
    )
    parser.add_argument(
        '--headless', 
        action='store_true',
        help='Executar em modo headless (sem interface gráfica)'
    )
    
    args = parser.parse_args()
    
    print(f"🎯 Modo selecionado: {args.mode}")
    if args.headless:
        print("🔇 Modo headless ativado")
    
    if args.mode == 'test':
        success = run_test()
    elif args.mode == 'main':
        success = run_main()
    elif args.mode == 'enhanced':
        success = run_enhanced()
    else:
        print("❌ Modo inválido")
        return False
    
    if success:
        print("\n✅ EXECUÇÃO CONCLUÍDA COM SUCESSO!")
    else:
        print("\n❌ EXECUÇÃO FALHOU!")
        sys.exit(1)

if __name__ == "__main__":
    main() 