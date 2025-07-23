# 🏛️ Sistema de Análise de Emendas Parlamentares v6.1.0

## 📋 Visão Geral

Sistema completo para análise e monitoramento de emendas parlamentares brasileiras, desenvolvido com tecnologias modernas e interface intuitiva.

### 🎯 Funcionalidades Principais

- ✅ **Análise de 25.000+ oportunidades** de emendas parlamentares
- ✅ **R$ 4.2 bilhões** em recursos disponíveis identificados
- ✅ **7 filtros avançados** para análise detalhada
- ✅ **Sistema de ordenação global** unificado
- ✅ **Exportação em 4 formatos** (PDF, Excel, CSV, JSON)
- ✅ **Interface moderna** com ícones SVG semanticamente apropriados
- ✅ **Autenticação JWT** completa com proteção CSRF

## 🏗️ Arquitetura

```
📊 SIOP Website → 🤖 Bot Automação → ☁️ AWS S3 → ⚙️ Backend ETL → 🖥️ Frontend Dashboard
```

### 🛠️ Tecnologias Utilizadas

#### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript 5+
- **Styling**: Tailwind CSS 3+
- **Ícones**: Lucide React
- **PDF**: jsPDF + autoTable

#### Backend
- **Framework**: FastAPI 0.100+
- **Linguagem**: Python 3.9+
- **Storage**: AWS S3
- **Autenticação**: JWT + CSRF
- **Validação**: Pydantic

#### Automação
- **Web Scraping**: Selenium + Python
- **Fonte de Dados**: Sistema SIOP
- **Processamento**: Pipeline ETL otimizado

## 🚀 Instalação e Configuração

### 📋 Pré-requisitos

- Node.js 18+ 
- Python 3.9+
- AWS Account (S3)
- Chrome/Chromium (para automação)

### 🔧 Configuração do Backend

```bash
cd backend
pip install -r requirements.txt
```

Configurar variáveis de ambiente:
```env
JWT_SECRET=sua_chave_secreta_aqui
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_BUCKET_NAME=seu_bucket
```

Executar:
```bash
python main.py
```

### 🖥️ Configuração do Frontend

```bash
cd frontend
npm install
```

Configurar variáveis de ambiente:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Executar:
```bash
npm run dev
```

### 🤖 Configuração da Automação

```bash
cd automation
pip install -r requirements.txt
```

Executar coleta de dados:
```bash
python main.py
```

## 📊 Funcionalidades Detalhadas

### 🔍 Sistema de Filtros

1. **Anos de Exercício**: 2015-2025
2. **Ministérios/Órgãos**: Com ícones SVG apropriados
3. **UF Favorecida**: Estados e DF
4. **Modalidade de Aplicação**: 5 tipos principais
5. **Resultado Primário**: Primário/Não Primário
6. **Partido do Autor**: Todos os partidos políticos
7. **Filtro Financeiro**: Valores mínimos configuráveis

### 🔄 Sistema de Ordenação Global

- **9 campos disponíveis** para ordenação
- **Funciona em Grid e Tabela** simultaneamente
- **Ordena todos os dados filtrados** (não apenas página atual)
- **Interface dinâmica** baseada no tipo de campo

### 📤 Exportação Avançada

- **PDF**: Layout profissional com autoTable
- **Excel**: Formatação completa
- **CSV**: Dados brutos para análise
- **JSON**: Estrutura completa

### 🎨 Interface Moderna

- **Ícones SVG**: 20+ ministérios mapeados semanticamente
- **Responsiva**: Mobile-first design
- **Acessível**: WCAG 2.1 AA compliant
- **Performance**: Otimizada com React hooks

## 📈 Métricas de Performance

- **Tempo de Carregamento**: < 2s (dados iniciais)
- **Filtros**: < 500ms (aplicação)
- **Ordenação**: < 300ms (25k registros)
- **Exportação PDF**: < 5s (1000 registros)
- **Busca**: < 200ms (texto normalizado)

## 🔒 Segurança

- **Autenticação JWT**: Access + Refresh tokens
- **Proteção CSRF**: Tokens validados
- **Middleware**: Proteção automática de rotas
- **Validação**: Entrada sanitizada
- **CORS**: Configurado adequadamente

## 📚 Documentação

Documentação completa disponível em:
- `.MD's/DOCUMENTACAO_CONSOLIDADA_COMPLETA_v6.1.0.md`

## 🏆 Versões e Marcos

### v6.1.0 (22/07/2025) - Atual
- ✨ Sistema de ordenação global unificado
- 🎯 9 campos de ordenação disponíveis
- 🔧 Performance otimizada com useMemo
- 📚 Documentação consolidada

### v6.0.0 (22/07/2025)
- 🎨 Sistema de ícones SVG dos ministérios
- 🔄 20+ ícones semanticamente apropriados
- ✅ Interface unificada e consistente

### v5.5.0 (Julho 2025)
- 📄 Revolução na exportação PDF
- 🔧 Layout automático com jspdf-autotable
- 📊 Quebra de linha e paginação inteligente

## 👥 Equipe

- **Desenvolvido por**: Vinícius Torres
- **Data de entrega**: 23 de Julho de 2025
- **Status**: ✅ Produção estável

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação completa
2. Verifique os logs do sistema
3. Execute os health checks

---

**🎉 Sistema Completo e Operacional - Pronto para Utilização**
