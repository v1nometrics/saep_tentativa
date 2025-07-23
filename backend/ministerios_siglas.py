#!/usr/bin/env python3

"""
Mapeamento Oficial de Ministérios e Siglas
==========================================

Mapeamento completo dos ministérios/órgãos federais com suas siglas oficiais
conforme Portal do Governo Federal e Manual Técnico de Orçamento.

Fonte: Lista fornecida pelo usuário com siglas oficiais verificadas.
"""

from typing import Dict, Optional

# Mapeamento oficial de ministérios para siglas
# Chave: Nome completo do ministério/órgão conforme aparece nos dados SIOP
# Valor: Informações incluindo sigla oficial
MINISTERIOS_SIGLAS = {
    # Ministérios principais ordenados por relevância nos dados
    "36000 - MINISTÉRIO DA SAÚDE": {
        "sigla": "MS",
        "nome_curto": "Ministério da Saúde",
        "codigo": "36000"
    },
    "26000 - MINISTÉRIO DA EDUCAÇÃO": {
        "sigla": "MEC", 
        "nome_curto": "Ministério da Educação",
        "codigo": "26000"
    },
    "55000 - MINISTÉRIO DO DESENVOLVIMENTO E ASSISTÊNCIA SOCIAL, FAMÍLIA E COMBATE À FOME": {
        "sigla": "MDS",
        "nome_curto": "Desenvolvimento e Assistência Social",
        "codigo": "55000"
    },
    "22000 - MINISTÉRIO DA AGRICULTURA E PECUÁRIA": {
        "sigla": "MAPA",
        "nome_curto": "Agricultura e Pecuária", 
        "codigo": "22000"
    },
    "25000 - MINISTÉRIO DA DEFESA": {
        "sigla": "MD",
        "nome_curto": "Ministério da Defesa",
        "codigo": "25000"
    },
    "52000 - MINISTÉRIO DA DEFESA": {
        "sigla": "MD",
        "nome_curto": "Ministério da Defesa",
        "codigo": "52000"
    },
    "64000 - MINISTÉRIO DOS DIREITOS HUMANOS E DA CIDADANIA": {
        "sigla": "MDHC",
        "nome_curto": "Direitos Humanos e Cidadania",
        "codigo": "64000"
    },
    "42000 - MINISTÉRIO DA CULTURA": {
        "sigla": "MinC",
        "nome_curto": "Ministério da Cultura",
        "codigo": "42000"
    },
    "51000 - MINISTÉRIO DO ESPORTE": {
        "sigla": "MESP",
        "nome_curto": "Ministério do Esporte", 
        "codigo": "51000"
    },
    "54000 - MINISTÉRIO DO TURISMO": {
        "sigla": "MTur",
        "nome_curto": "Ministério do Turismo",
        "codigo": "54000"
    },
    "24000 - MINISTÉRIO DA CIÊNCIA, TECNOLOGIA E INOVAÇÃO": {
        "sigla": "MCTI",
        "nome_curto": "Ciência, Tecnologia e Inovação",
        "codigo": "24000"
    },
    "44000 - MINISTÉRIO DO MEIO AMBIENTE E MUDANÇA DO CLIMA": {
        "sigla": "MMA",
        "nome_curto": "Meio Ambiente e Mudança do Clima",
        "codigo": "44000"
    },
    "73000 - TRANSFERÊNCIAS A ESTADOS, DF E MUNICÍPIOS": {
        "sigla": "TED",
        "nome_curto": "Transferências Estados/Municípios",
        "codigo": "73000"
    },
    "73000 - TRANSFERÊNCIAS A ESTADOS, DISTRITO FEDERAL E MUNICÍPIOS": {
        "sigla": "TED",
        "nome_curto": "Transferências Estados/Municípios",
        "codigo": "73000"
    },
    "53000 - MINISTÉRIO DA INTEGRAÇÃO E DO DESENVOLVIMENTO REGIONAL": {
        "sigla": "MIDR",
        "nome_curto": "Integração e Desenvolvimento Regional",
        "codigo": "53000"
    },
    "30000 - MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA": {
        "sigla": "MJSP",
        "nome_curto": "Justiça e Segurança Pública",
        "codigo": "30000"
    },
    "49000 - MINISTÉRIO DO DESENVOLVIMENTO AGRÁRIO E AGRICULTURA FAMILIAR": {
        "sigla": "MDA",
        "nome_curto": "Desenvolvimento Agrário",
        "codigo": "49000"
    },
    "38000 - MINISTÉRIO DO TRABALHO E EMPREGO": {
        "sigla": "MTE",
        "nome_curto": "Trabalho e Emprego",
        "codigo": "38000"
    },
    "65000 - MINISTÉRIO DAS MULHERES": {
        "sigla": "MM",
        "nome_curto": "Ministério das Mulheres",
        "codigo": "65000"
    },
    "35000 - MINISTÉRIO DAS RELAÇÕES EXTERIORES": {
        "sigla": "MRE",
        "nome_curto": "Relações Exteriores",
        "codigo": "35000"
    },
    "20000 - PRESIDÊNCIA DA REPÚBLICA": {
        "sigla": "PR",
        "nome_curto": "Presidência da República",
        "codigo": "20000"
    },
    "21000 - MINISTÉRIO DA FAZENDA": {
        "sigla": "MF",
        "nome_curto": "Ministério da Fazenda",
        "codigo": "21000"
    },
    "41000 - MINISTÉRIO DAS COMUNICAÇÕES": {
        "sigla": "MC",
        "nome_curto": "Ministério das Comunicações",
        "codigo": "41000"
    },
    "67000 - MINISTÉRIO DA IGUALDADE RACIAL": {
        "sigla": "MIR",
        "nome_curto": "Igualdade Racial",
        "codigo": "67000"
    },
    "56000 - MINISTÉRIO DAS CIDADES": {
        "sigla": "MCID",
        "nome_curto": "Ministério das Cidades",
        "codigo": "56000"
    },
    "03000 - JUSTIÇA ELEITORAL": {
        "sigla": "TSE",
        "nome_curto": "Justiça Eleitoral",
        "codigo": "03000"
    },
    "57000 - MINISTÉRIO DAS MULHERES, DA IGUALDADE RACIAL, DA JUVENTUDE E DOS DIREITOS HUMANOS": {
        "sigla": "MMIRDH",
        "nome_curto": "Mulheres, Igualdade Racial e Direitos Humanos (2015-2016)",
        "codigo": "57000"
    },
    "04000 - JUSTIÇA FEDERAL": {
        "sigla": "JF",
        "nome_curto": "Justiça Federal",
        "codigo": "04000"
    },
    "32000 - MINISTÉRIO DE MINAS E ENERGIA": {
        "sigla": "MME",
        "nome_curto": "Minas e Energia",
        "codigo": "32000"
    },
    "58000 - MINISTÉRIO DA PESCA E AQUICULTURA": {
        "sigla": "MPA",
        "nome_curto": "Pesca e Aquicultura",
        "codigo": "58000"
    },
    "28000 - MINISTÉRIO DO DESENVOLVIMENTO, INDÚSTRIA, COMÉRCIO E SERVIÇOS": {
        "sigla": "MDIC",
        "nome_curto": "Desenvolvimento, Indústria e Comércio",
        "codigo": "28000"
    },
    "84000 - MINISTÉRIO DOS POVOS INDÍGENAS": {
        "sigla": "MPI",
        "nome_curto": "Povos Indígenas",
        "codigo": "84000"
    },
    "69000 - MINISTÉRIO DO EMPREENDEDORISMO, DA MICROEMPRESA E DA EMPRESA DE PEQUENO PORTE": {
        "sigla": "MEMP",
        "nome_curto": "Empreendedorismo e Microempresa",
        "codigo": "69000"
    },
    "81000 - MINISTÉRIO DOS DIREITOS HUMANOS E DA CIDADANIA": {
        "sigla": "MDHC",
        "nome_curto": "Direitos Humanos e Cidadania",
        "codigo": "81000"  # Código alternativo
    },
    "33000 - MINISTÉRIO DA PREVIDÊNCIA SOCIAL": {
        "sigla": "MPS",
        "nome_curto": "Previdência Social",
        "codigo": "33000"
    },
    "09000 - JUSTIÇA DO TRABALHO": {
        "sigla": "JT",
        "nome_curto": "Justiça do Trabalho",
        "codigo": "09000"
    },
    "13000 - MINISTÉRIO PÚBLICO DA UNIÃO": {
        "sigla": "MPU",
        "nome_curto": "Ministério Público da União",
        "codigo": "13000"
    },
    "39000 - MINISTÉRIO DOS TRANSPORTES": {
        "sigla": "MT",
        "nome_curto": "Ministério dos Transportes",
        "codigo": "39000"
    },
    "16000 - CONTROLADORIA-GERAL DA UNIÃO": {
        "sigla": "CGU",
        "nome_curto": "Controladoria-Geral da União",
        "codigo": "16000"
    },
    "23000 - MINISTÉRIO DO PLANEJAMENTO E ORÇAMENTO": {
        "sigla": "MPO",
        "nome_curto": "Planejamento e Orçamento",
        "codigo": "23000"
    },
    "40000 - MINISTÉRIO DO TRABALHO E EMPREGO": {
        "sigla": "MTE",
        "nome_curto": "Trabalho e Emprego",
        "codigo": "40000"  # Código alternativo
    },
    "60000 - MINISTÉRIO DE PORTOS E AEROPORTOS": {
        "sigla": "MPOR",
        "nome_curto": "Portos e Aeroportos",
        "codigo": "60000"
    },
    "15000 - DEFENSORIA PÚBLICA DA UNIÃO": {
        "sigla": "DPU",
        "nome_curto": "Defensoria Pública da União",
        "codigo": "15000"
    },
    "14000 - ADVOCACIA-GERAL DA UNIÃO": {
        "sigla": "AGU",
        "nome_curto": "Advocacia-Geral da União",
        "codigo": "14000"
    },
    "29000 - MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS": {
        "sigla": "MGI",
        "nome_curto": "Gestão e Inovação em Serviços Públicos",
        "codigo": "29000"
    },
    "74000 - OPERAÇÕES OFICIAIS DE CRÉDITO": {
        "sigla": "OOC",
        "nome_curto": "Operações Oficiais de Crédito",
        "codigo": "74000"
    },
    
    # === CÓDIGOS ENCONTRADOS NOS DADOS REAIS ===
    "25000 - MINISTÉRIO DA FAZENDA": {
        "sigla": "MF",
        "nome_curto": "Ministério da Fazenda",
        "codigo": "25000"
    },
    "14000 - JUSTIÇA ELEITORAL": {
        "sigla": "TSE",
        "nome_curto": "Justiça Eleitoral",
        "codigo": "14000"
    },
    "12000 - JUSTIÇA FEDERAL": {
        "sigla": "JF",
        "nome_curto": "Justiça Federal",
        "codigo": "12000"
    },
    "15000 - JUSTIÇA DO TRABALHO": {
        "sigla": "JT",
        "nome_curto": "Justiça do Trabalho",
        "codigo": "15000"
    },
    "34000 - MINISTÉRIO PÚBLICO DA UNIÃO": {
        "sigla": "MPU",
        "nome_curto": "Ministério Público da União",
        "codigo": "34000"
    },
    "37000 - CONTROLADORIA-GERAL DA UNIÃO": {
        "sigla": "CGU",
        "nome_curto": "Controladoria-Geral da União",
        "codigo": "37000"
    },
    "47000 - MINISTÉRIO DO PLANEJAMENTO E ORÇAMENTO": {
        "sigla": "MPO",
        "nome_curto": "Planejamento e Orçamento",
        "codigo": "47000"
    },
    "68000 - MINISTÉRIO DE PORTOS E AEROPORTOS": {
        "sigla": "MPOR",
        "nome_curto": "Portos e Aeroportos",
        "codigo": "68000"
    },
    "29000 - DEFENSORIA PÚBLICA DA UNIÃO": {
        "sigla": "DPU",
        "nome_curto": "Defensoria Pública da União",
        "codigo": "29000"
    },
    "63000 - ADVOCACIA-GERAL DA UNIÃO": {
        "sigla": "AGU",
        "nome_curto": "Advocacia-Geral da União",
        "codigo": "63000"
    },
    "46000 - MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS": {
        "sigla": "MGI",
        "nome_curto": "Gestão e Inovação em Serviços Públicos",
        "codigo": "46000"
    },
    
    # === MAPEAMENTOS ADICIONAIS PARA GARANTIR 100% COBERTURA ===
    
    # Variações de nomes que podem aparecer nos dados
    "MINISTÉRIO DA SAÚDE": {
        "sigla": "MS",
        "nome_curto": "Ministério da Saúde",
        "codigo": "36000"
    },
    "MINISTÉRIO DA EDUCAÇÃO": {
        "sigla": "MEC",
        "nome_curto": "Ministério da Educação", 
        "codigo": "26000"
    },
    "MINISTÉRIO DA DEFESA": {
        "sigla": "MD",
        "nome_curto": "Ministério da Defesa",
        "codigo": "52000"
    },
    "JUSTIÇA ELEITORAL": {
        "sigla": "TSE",
        "nome_curto": "Justiça Eleitoral",
        "codigo": "03000"
    },
    "JUSTIÇA FEDERAL": {
        "sigla": "JF", 
        "nome_curto": "Justiça Federal",
        "codigo": "04000"
    },
    "JUSTIÇA DO TRABALHO": {
        "sigla": "JT",
        "nome_curto": "Justiça do Trabalho",
        "codigo": "09000"
    },
    "MINISTÉRIO PÚBLICO DA UNIÃO": {
        "sigla": "MPU",
        "nome_curto": "Ministério Público da União",
        "codigo": "13000"
    },
    "MPU": {
        "sigla": "MPU",
        "nome_curto": "Ministério Público da União", 
        "codigo": "13000"
    },
    "TSE": {
        "sigla": "TSE",
        "nome_curto": "Justiça Eleitoral",
        "codigo": "03000"
    },
    "TRF": {
        "sigla": "JF",
        "nome_curto": "Justiça Federal",
        "codigo": "04000"
    },
    "TST": {
        "sigla": "JT",
        "nome_curto": "Justiça do Trabalho", 
        "codigo": "09000"
    },
    
    # Variações adicionais dos códigos antigos
    "52000 - MINISTÉRIO DA DEFESA": {
        "sigla": "MD",
        "nome_curto": "Ministério da Defesa",
        "codigo": "52000"
    },
    
    # Ministérios que podem ter nomes ligeiramente diferentes
    "MINISTERIO DA SAUDE": {
        "sigla": "MS", 
        "nome_curto": "Ministério da Saúde",
        "codigo": "36000"
    },
    "MINISTERIO DA EDUCACAO": {
        "sigla": "MEC",
        "nome_curto": "Ministério da Educação",
        "codigo": "26000"
    },
    "MINISTERIO DA DEFESA": {
        "sigla": "MD",
        "nome_curto": "Ministério da Defesa", 
        "codigo": "52000"
    }
}

def get_sigla_ministerio(nome_completo: str) -> Optional[str]:
    """
    Retorna a sigla oficial do ministério/órgão
    
    Args:
        nome_completo: Nome completo conforme aparece nos dados SIOP
        
    Returns:
        Sigla oficial ou None se não encontrado
    """
    info = MINISTERIOS_SIGLAS.get(nome_completo.upper())
    return info["sigla"] if info else None

def get_nome_curto_ministerio(nome_completo: str) -> Optional[str]:
    """
    Retorna o nome curto/amigável do ministério/órgão
    
    Args:
        nome_completo: Nome completo conforme aparece nos dados SIOP
        
    Returns:
        Nome curto ou None se não encontrado
    """
    info = MINISTERIOS_SIGLAS.get(nome_completo.upper())
    return info["nome_curto"] if info else None

def get_codigo_ministerio(nome_completo: str) -> Optional[str]:
    """
    Retorna o código orçamentário do ministério/órgão
    
    Args:
        nome_completo: Nome completo conforme aparece nos dados SIOP
        
    Returns:
        Código orçamentário ou None se não encontrado
    """
    info = MINISTERIOS_SIGLAS.get(nome_completo.upper())
    return info["codigo"] if info else None

def get_info_ministerio(nome_completo: str) -> Optional[Dict]:
    """
    Retorna todas as informações do ministério/órgão
    
    Args:
        nome_completo: Nome completo conforme aparece nos dados SIOP
        
    Returns:
        Dicionário com sigla, nome_curto e codigo ou None se não encontrado
    """
    return MINISTERIOS_SIGLAS.get(nome_completo.upper())

def buscar_ministerio_por_substring(substring: str) -> Optional[Dict]:
    """
    Busca ministério por substring no nome (busca flexível)
    
    Args:
        substring: Parte do nome do ministério
        
    Returns:
        Informações do primeiro ministério encontrado ou None
    """
    substring_upper = substring.upper()
    
    for nome_completo, info in MINISTERIOS_SIGLAS.items():
        if substring_upper in nome_completo:
            return {
                "nome_completo": nome_completo,
                **info
            }
    
    return None

def listar_todos_ministerios() -> Dict[str, Dict]:
    """
    Retorna todos os ministérios mapeados
    
    Returns:
        Dicionário completo de ministérios e suas informações
    """
    return MINISTERIOS_SIGLAS.copy()

def get_ministerios_com_relacionamento() -> list:
    """
    Retorna lista dos ministérios com projetos vigentes Innovatis
    (com códigos orçamentários para compatibilidade com sistema existente)
    """
    return [
        "22000 - MINISTÉRIO DA AGRICULTURA E PECUÁRIA",
        "24000 - MINISTÉRIO DA CIÊNCIA, TECNOLOGIA E INOVAÇÃO", 
        "26000 - MINISTÉRIO DA EDUCAÇÃO",
        "36000 - MINISTÉRIO DA SAÚDE",
        "38000 - MINISTÉRIO DO TRABALHO E EMPREGO",
        "40000 - MINISTÉRIO DO TRABALHO E EMPREGO",
        "41000 - MINISTÉRIO DAS COMUNICAÇÕES",
        "42000 - MINISTÉRIO DA CULTURA",
        "44000 - MINISTÉRIO DO MEIO AMBIENTE E MUDANÇA DO CLIMA",
        "49000 - MINISTÉRIO DO DESENVOLVIMENTO AGRÁRIO E AGRICULTURA FAMILIAR",
        "51000 - MINISTÉRIO DO ESPORTE",
        "53000 - MINISTÉRIO DA INTEGRAÇÃO E DO DESENVOLVIMENTO REGIONAL",
        "54000 - MINISTÉRIO DO TURISMO",
        "55000 - MINISTÉRIO DO DESENVOLVIMENTO E ASSISTÊNCIA SOCIAL, FAMÍLIA E COMBATE À FOME",
        "56000 - MINISTÉRIO DAS CIDADES",
        "57000 - MINISTÉRIO DAS MULHERES, DA IGUALDADE RACIAL, DA JUVENTUDE E DOS DIREITOS HUMANOS",
        "58000 - MINISTÉRIO DA PESCA E AQUICULTURA",
        "64000 - MINISTÉRIO DOS DIREITOS HUMANOS E DA CIDADANIA",
        "65000 - MINISTÉRIO DAS MULHERES",
        "67000 - MINISTÉRIO DA IGUALDADE RACIAL",
        "69000 - MINISTÉRIO DO EMPREENDEDORISMO, DA MICROEMPRESA E DA EMPRESA DE PEQUENO PORTE",
        "81000 - MINISTÉRIO DOS DIREITOS HUMANOS E DA CIDADANIA",
        "84000 - MINISTÉRIO DOS POVOS INDÍGENAS"
    ]

# Função para validar e atualizar ministérios nos dados
def enriquecer_dados_ministerios(all_ministries: list) -> list:
    """
    Enriquece lista de ministérios com siglas oficiais
    
    Args:
        all_ministries: Lista de dicionários com informações de ministérios
        
    Returns:
        Lista enriquecida com siglas oficiais
    """
    for ministry_info in all_ministries:
        nome_completo = ministry_info.get("ministry", "").upper()
        
        # Buscar informações oficiais
        info_oficial = get_info_ministerio(nome_completo)
        
        if info_oficial:
            ministry_info["sigla"] = info_oficial["sigla"]
            ministry_info["nome_curto"] = info_oficial["nome_curto"]
            ministry_info["codigo"] = info_oficial["codigo"]
        else:
            # Tentar busca por substring se não encontrar match exato
            info_substring = buscar_ministerio_por_substring(nome_completo)
            if info_substring:
                ministry_info["sigla"] = info_substring["sigla"]
                ministry_info["nome_curto"] = info_substring["nome_curto"]
                ministry_info["codigo"] = info_substring["codigo"]
            else:
                # Fallback para ministérios não mapeados
                ministry_info["sigla"] = "N/A"
                ministry_info["nome_curto"] = nome_completo.replace(nome_completo.split(" - ")[0] + " - ", "") if " - " in nome_completo else nome_completo
                ministry_info["codigo"] = nome_completo.split(" - ")[0] if " - " in nome_completo else "XXXXX"
    
    return all_ministries 