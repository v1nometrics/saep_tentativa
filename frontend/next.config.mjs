// @ts-nocheck
// Desativando verificação de tipos temporariamente para este arquivo
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Garante que o Next.js procure na pasta src
  distDir: '.next',
  
  // Configurações experimentais
  experimental: {
    // Habilita Server Actions
    serverActions: {},
  },
  
  // Configuração de runtime para o middleware
  // (a configuração de runtime foi movida para o próprio middleware)
  // usando `export const config = { runtime: 'edge' }`
  
  // Configurações de segurança
  async headers() {
    return [
      {
        // Aplica a todas as rotas da API
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' 
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
  
  // Configuração de redirecionamentos
  async redirects() {
    return [
      // Removido redirecionamento automático da raiz para login
      // O middleware agora gerencia o redirecionamento baseado na autenticação
    ];
  },
  
  // Configuração de reescrita de URL (se necessário)
  async rewrites() {
    return [];
  },
  
  // Configuração de webpack
  webpack: (config, { isServer }) => {
    // Adiciona suporte para arquivos .mjs
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false, 
      module: false,
      path: false,
      os: false
    };
    
    // Configuração robusta de aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/app': path.resolve(__dirname, './src/app'),
    };
    
    // Garantir extensões de arquivo
    config.resolve.extensions = [
      '.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'
    ];
    
    return config;
  },
};

export default nextConfig;
