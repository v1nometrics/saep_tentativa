'use client';

import { useState, useEffect } from 'react';
import { CSRF_HEADER } from '@/lib/csrf-utils';

/**
 * Hook para obter o token CSRF no frontend
 * @returns O token CSRF ou null se não estiver disponível
 */
export function useCsrfToken(): string | null {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Tenta obter o token CSRF do cookie
    const getCsrfToken = (): string | null => {
      if (typeof document === 'undefined') return null;
      
      const match = document.cookie.match(new RegExp(`(^| )${'csrf_token'}=([^;]+)`));
      return match ? decodeURIComponent(match[2]) : null;
    };

    // Verifica se estamos no navegador
    if (typeof window !== 'undefined') {
      // Tenta obter o token imediatamente
      const token = getCsrfToken();
      if (token) {
        setCsrfToken(token);
      } else {
        // Se não encontrar, tenta novamente após um curto atraso
        // para garantir que os cookies foram carregados
        const timer = setTimeout(() => {
          const newToken = getCsrfToken();
          if (newToken) setCsrfToken(newToken);
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return csrfToken;
}

/**
 * Hook para obter os headers CSRF para requisições
 * @returns Um objeto com os headers necessários para requisições autenticadas
 */
export function useCsrfHeaders() {
  const csrfToken = useCsrfToken();
  
  return {
    [CSRF_HEADER]: csrfToken,
    'Content-Type': 'application/json',
  };
}
