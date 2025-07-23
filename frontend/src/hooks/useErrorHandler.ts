'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { getFriendlyErrorMessage, isAuthError, isNetworkError } from '@/lib/errorMessages';

export function useErrorHandler() {
  const { showToast } = useToast();

  /**
   * Lida com erros de forma consistente em toda a aplicação
   * @param error O erro a ser tratado
   * @param context Contexto adicional para ajudar no tratamento do erro
   * @returns A mensagem de erro amigável
   */
  const handleError = useCallback((error: unknown, context: Record<string, any> = {}) => {
    // Se não houver erro, retorna null
    if (!error) return null;
    
    // Obtém a mensagem de erro amigável
    const friendlyMessage = getFriendlyErrorMessage(error, context.defaultMessage);
    
    // Determina o tipo de toast com base no tipo de erro
    let toastType: 'error' | 'warning' | 'info' = 'error';
    
    if (isNetworkError(error)) {
      toastType = 'warning';
    } else if (isAuthError(error)) {
      toastType = 'error';
    }
    
    // Exibe o toast com a mensagem de erro
    showToast(friendlyMessage, toastType);
    
    // Registra o erro no console para depuração
    if (process.env.NODE_ENV !== 'production') {
      console.error('Erro tratado:', {
        error,
        context,
        friendlyMessage,
        timestamp: new Date().toISOString(),
      });
    }
    
    return friendlyMessage;
  }, [showToast]);
  
  /**
   * Cria uma função assíncrona segura que captura e trata erros automaticamente
   * @param asyncFunction A função assíncrona a ser executada
   * @param errorHandler Função de tratamento de erro personalizada (opcional)
   * @returns Uma função que executa a função assíncrona e trata erros automaticamente
   */
  const withErrorHandling = useCallback(
    <T extends any[], R>(
      asyncFunction: (...args: T) => Promise<R>,
      errorHandler?: (error: string | null) => void
    ) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await asyncFunction(...args);
        } catch (error) {
          const friendlyMessage = handleError(error);
          
          // Se um manipulador personalizado for fornecido, chama-o
          if (errorHandler) {
            errorHandler(friendlyMessage);
          }
          
          return null;
        }
      };
    },
    [handleError]
  );
  
  /**
   * Cria uma função assíncrona segura que captura e trata erros automaticamente,
   * mas permite que o chamador lide com o erro
   */
  const withErrorHandlingAndRethrow = useCallback(<T extends any[], R>(
    asyncFunction: (...args: T) => Promise<R>,
    errorHandler?: (error: unknown) => void
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        const friendlyMessage = handleError(error);
        
        // Se um manipulador personalizado for fornecido, chama-o
        if (errorHandler) {
          errorHandler(friendlyMessage);
        }
        
        // Adiciona a mensagem amigável ao erro original
        if (error instanceof Error) {
          (error as any).friendlyMessage = friendlyMessage;
        }
        
        // Relança o erro para que o chamador possa lidar com ele
        throw error;
      }
    };
  }, [handleError]);
  
  return {
    handleError,
    withErrorHandling,
    withErrorHandlingAndRethrow,
    isAuthError,
    isNetworkError,
  };
}
