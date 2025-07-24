'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Helper para evitar erro de SSR com useSearchParams
const useSearchParamsSsrSafe = () => {
  if (typeof window === 'undefined') {
    return { get: () => null }; // Mock para SSR
  }
  return require('next/navigation').useSearchParams();
};
import { useErrorHandler } from './useErrorHandler';
import { createError } from '../lib/errorMessages';
import { CSRF_HEADER } from '../lib/csrf';

export interface LoginCredentials {
  email: string;
  password: string;
  [key: string]: string | undefined; // Permite propriedades adicionais como o token CSRF
}

export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParamsSsrSafe();
  const { handleError, withErrorHandling } = useErrorHandler();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = withErrorHandling(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[useAuth] Iniciando processo de login...');
        
        // Extrai o token CSRF das credenciais (se existir)
        const { email, password, ...rest } = credentials;
        const csrfToken = rest[CSRF_HEADER];
        
        console.log('[useAuth] Email:', email);
        console.log('[useAuth] Token CSRF fornecido:', !!csrfToken);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Adiciona o cabeçalho CSRF se o token existir
        if (csrfToken) {
          console.log('[useAuth] Adicionando token CSRF ao cabeçalho da requisição');
          headers[CSRF_HEADER] = csrfToken;
        } else {
          console.warn('[useAuth] Aviso: Token CSRF não fornecido. A requisição pode falhar por falta de proteção CSRF.');
        }
        
        console.log('[useAuth] Enviando requisição para /api/login...');
        
        const response = await fetch('/api/login', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email, password }), // Envia apenas email e senha no corpo
          credentials: 'include', // Importante para incluir cookies
        });
        
        console.log('[useAuth] Resposta recebida:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
          let errorCode = 'auth/invalid-credentials';
          
          // Mapeia códigos de status HTTP para códigos de erro mais específicos
          if (response.status === 401) {
            errorCode = 'auth/unauthorized';
          } else if (response.status === 403) {
            errorCode = 'auth/csrf-token-mismatch';
          } else if (response.status >= 500) {
            errorCode = 'server/unexpected-error';
          }
          
          throw createError(
            errorCode as any,
            data.message || 'Erro ao fazer login',
            data
          );
        }
        
        // Aguarda um breve momento para garantir que os cookies sejam definidos
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verifica se o usuário está autenticado antes de redirecionar
        const authCheck = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        if (!authCheck.ok) {
          throw new Error('Falha ao verificar autenticação após login');
        }
        
        // Redireciona para a página de origem ou para a home
        const redirectTo = searchParams.get('from') || '/';
        window.location.href = redirectTo; // Usa window.location para garantir recarregamento completo
        
        return data;
      } catch (error) {
        // Se for um erro de rede, relança para ser tratado pelo withErrorHandling
        if (error && typeof error === 'object' && 'code' in error && 
            typeof error.code === 'string' && error.code.startsWith('network/')) {
          throw error;
        }
        
        // Para outros erros, garante que temos um objeto de erro consistente
        const authError = error instanceof Error 
          ? error 
          : new Error('Ocorreu um erro ao fazer login');
          
        throw createError(
          'auth/invalid-credentials',
          authError.message,
          authError
        );
      } finally {
        setIsLoading(false);
      }
    },
    (error: string | null) => {
      // Define a mensagem de erro para ser exibida no formulário
      setError(error || 'Ocorreu um erro ao fazer login');
    }
  );
  
  const logout = withErrorHandling(
    async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/login', {
          method: 'DELETE',
          credentials: 'include', // Importante para incluir cookies
        });
        
        if (!response.ok) {
          throw createError(
            'server/unexpected-error',
            'Erro ao fazer logout',
            await response.text()
          );
        }
        
        // Redireciona para a página de login
        router.push('/login');
        router.refresh(); // Garante que os dados sejam atualizados
      } finally {
        setIsLoading(false);
      }
    },
    (error: string | null) => {
      // Define a mensagem de erro para ser exibida no formulário
      setError(error || 'Ocorreu um erro ao fazer logout');
    }
  );
  
  return {
    login,
    logout,
    isLoading,
    error,
  };
}
