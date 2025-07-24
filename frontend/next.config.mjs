import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações experimentais
  experimental: {
    serverActions: {},
  },
  
  // Configuração simplificada de webpack para resolver aliases
  webpack: (config) => {
    // Configuração de aliases mais simples e robusta
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/app': path.resolve(__dirname, 'src/app'),
    };
    
    // Garantir que as extensões sejam resolvidas corretamente
    config.resolve.extensions = [
      '.ts', '.tsx', '.js', '.jsx', '.json'
    ];
    
    return config;
  },
  
  // Configurações de segurança
  async headers() {
    return [
      {
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
  
  async redirects() {
    return [];
  },
  
  async rewrites() {
    return [];
  },
};

export default nextConfig;
