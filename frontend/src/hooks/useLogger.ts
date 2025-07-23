'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { logger, LogEventType, LogData } from '@/lib/logging';

/**
 * Hook para facilitar o uso do serviço de logging em componentes React
 */
export function useLogger(componentName: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef(pathname);
  
  // Efeito para registrar a navegação entre páginas
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      logger.info('navigation:page:view', `Navegando para: ${pathname}`, {
        from: prevPathnameRef.current,
        to: pathname,
        searchParams: Object.fromEntries(searchParams.entries())
      });
      
      prevPathnameRef.current = pathname;
    }
  }, [pathname, searchParams]);
  
  // Funções de conveniência para registro de logs
  const logDebug = (type: LogEventType, message: string, data?: LogData) => {
    logger.debug(type, message, {
      component: componentName,
      ...data
    });
  };
  
  const logInfo = (type: LogEventType, message: string, data?: LogData) => {
    logger.info(type, message, {
      component: componentName,
      ...data
    });
  };
  
  const logWarn = (type: LogEventType, message: string, data?: LogData) => {
    logger.warn(type, message, {
      component: componentName,
      ...data
    });
  };
  
  const logError = (type: LogEventType, message: string, error?: Error | unknown, data?: LogData) => {
    const errorData = error instanceof Error 
      ? { 
          errorName: error.name,
          errorMessage: error.message,
          stackTrace: error.stack 
        } 
      : { errorData: error };
    
    logger.error(type, message, {
      component: componentName,
      ...errorData,
      ...data
    });
  };
  
  // Funções específicas para autenticação
  const logAuthAttempt = (email: string, data?: LogData) => {
    logInfo('auth:login:attempt', `Tentativa de login: ${email}`, {
      userEmail: email,
      ...data
    });
  };
  
  const logAuthSuccess = (email: string, data?: LogData) => {
    logInfo('auth:login:success', `Login bem-sucedido: ${email}`, {
      userEmail: email,
      ...data
    });
  };
  
  const logAuthFailure = (email: string, error: Error | unknown, data?: LogData) => {
    logError('auth:login:failure', `Falha no login: ${email}`, error, {
      userEmail: email,
      ...data
    });
  };
  
  const logLogout = (email?: string, data?: LogData) => {
    logInfo('auth:logout', `Logout${email ? `: ${email}` : ''}`, {
      userEmail: email,
      ...data
    });
  };
  
  const logSessionExpired = (data?: LogData) => {
    logWarn('auth:session:expired', 'Sessão expirada', data);
  };
  
  const logTokenRefresh = (data?: LogData) => {
    logDebug('auth:token:refresh', 'Atualizando token de acesso', data);
  };
  
  const logInvalidToken = (reason: string, data?: LogData) => {
    logWarn('auth:token:invalid', `Token inválido: ${reason}`, data);
  };
  
  const logInvalidCsrf = (data?: LogData) => {
    logWarn('auth:csrf:invalid', 'Token CSRF inválido', data);
  };
  
  const logUnauthorized = (message: string, data?: LogData) => {
    logWarn('security:unauthorized', `Acesso não autorizado: ${message}`, data);
  };
  
  const logForbidden = (message: string, data?: LogData) => {
    logWarn('security:forbidden', `Acesso proibido: ${message}`, data);
  };
  
  return {
    // Funções gerais de log
    logDebug,
    logInfo,
    logWarn,
    logError,
    
    // Funções específicas para autenticação
    logAuthAttempt,
    logAuthSuccess,
    logAuthFailure,
    logLogout,
    logSessionExpired,
    logTokenRefresh,
    logInvalidToken,
    logInvalidCsrf,
    logUnauthorized,
    logForbidden,
    
    // Utilitários
    getCurrentPath: () => pathname,
    getSearchParams: () => Object.fromEntries(searchParams.entries())
  };
}
