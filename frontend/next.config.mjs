// @ts-nocheck
// Desativando verificação de tipos temporariamente para este arquivo
import path from 'path';

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
    serverComponentsExternalPackages: ['aws-sdk'],
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
  webpack: (config, { isServer, dev }) => {
    // Configuração robusta para resolver módulos no Vercel
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve('./src'),
      '@/lib': path.resolve('./src/lib'),
      '@/components': path.resolve('./src/components'),
      '@/app': path.resolve('./src/app'),
      '@/hooks': path.resolve('./src/hooks'),
    };
    
    // Configuração de extensões para resolver módulos
    config.resolve.extensions = [
      '.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'
    ];
    
    // Fallbacks para Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      os: false,
      stream: false,
      util: false,
      url: false,
      assert: false,
      buffer: false,
      events: false,
      module: false,
    };
    
    // Força inclusão dos módulos lib no bundle
    if (!isServer) {
      config.entry = async () => {
        const entries = await config.entry();
        if (entries['main.js'] && !entries['main.js'].includes('./src/lib/modules.ts')) {
          entries['main.js'].unshift('./src/lib/modules.ts');
        }
        return entries;
      };
    }
    
    return config;
  },
};

export default nextConfig;
