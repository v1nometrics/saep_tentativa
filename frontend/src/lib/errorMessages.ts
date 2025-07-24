// Mapeamento de códigos de erro para mensagens amigáveis
const ERROR_MESSAGES: Record<string, string> = {
  // Erros de autenticação
  'auth/invalid-credentials': 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.',
  'auth/account-disabled': 'Sua conta está desativada. Entre em contato com o suporte para mais informações.',
  'auth/too-many-requests': 'Muitas tentativas de login. Por favor, tente novamente mais tarde ou redefina sua senha.',
  'auth/network-request-failed': 'Erro de conexão. Verifique sua conexão com a internet e tente novamente.',
  'auth/unauthorized': 'Você não tem permissão para acessar este recurso.',
  'auth/session-expired': 'Sua sessão expirou. Por favor, faça login novamente.',
  'auth/csrf-token-mismatch': 'Erro de segurança. Por favor, recarregue a página e tente novamente.',
  'auth/validation-error': 'Por favor, preencha todos os campos corretamente.',
  
  // Erros do servidor
  'server/unexpected-error': 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
  'server/maintenance': 'Estamos em manutenção. Por favor, tente novamente mais tarde.',
  'server/timeout': 'Tempo de requisição esgotado. Por favor, tente novamente.',
  
  // Erros de rede
  'network/offline': 'Você está offline. Verifique sua conexão com a internet.',
  'network/request-failed': 'Falha na comunicação com o servidor. Tente novamente mais tarde.',
};

// Tipos de erros conhecidos
type KnownErrorCode = 
  | 'auth/invalid-credentials'
  | 'auth/account-disabled'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/unauthorized'
  | 'auth/session-expired'
  | 'auth/csrf-token-mismatch'
  | 'auth/validation-error'
  | 'server/unexpected-error'
  | 'server/maintenance'
  | 'server/timeout'
  | 'network/offline'
  | 'network/request-failed';

// Função para obter mensagem de erro amigável
export function getFriendlyErrorMessage(
  error: unknown,
  defaultMessage: string = 'Ocorreu um erro inesperado. Por favor, tente novamente.'
): string {
  if (!error) return defaultMessage;
  
  // Se for uma string, verifica se é um código de erro conhecido
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || defaultMessage;
  }
  
  // Se for um objeto de erro com código
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return ERROR_MESSAGES[error.code] || defaultMessage;
  }
  
  // Se for um objeto de erro com mensagem
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: unknown };
    
    // Verifica se a mensagem é uma string
    if (typeof errorObj.message === 'string') {
      const errorMessage = errorObj.message;
      // Tenta extrair códigos de erro conhecidos da mensagem
      const knownCodes = Object.keys(ERROR_MESSAGES) as KnownErrorCode[];
      const matchedCode = knownCodes.find(code => 
        errorMessage.toLowerCase().includes(code.toLowerCase())
      );
      
      if (matchedCode) {
        return ERROR_MESSAGES[matchedCode];
      }
      
      // Se não encontrar um código conhecido, retorna a mensagem de erro
      return errorMessage || defaultMessage;
    }
  }
  
  // Se não for possível extrair uma mensagem, retorna a mensagem padrão
  return defaultMessage;
}

// Função para criar um objeto de erro padronizado
export function createError(
  code: KnownErrorCode,
  message?: string,
  originalError?: unknown
): Error & { code: string; originalError?: unknown } {
  const error = new Error(message || ERROR_MESSAGES[code] || 'Ocorreu um erro inesperado.') as Error & { 
    code: string; 
    originalError?: unknown 
  };
  
  error.code = code;
  
  if (originalError) {
    error.originalError = originalError;
    
    // Adiciona o stack trace original se disponível
    if (originalError instanceof Error && originalError.stack) {
      error.stack = `${error.stack}\n--- Original Error ---\n${originalError.stack}`;
    }
  }
  
  return error;
}

// Função para verificar se um erro é de autenticação
export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  
  const errorCode = 
    (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code) ||
    (error instanceof Error ? error.message : '');
  
  return errorCode.startsWith('auth/');
}

// Função para verificar se um erro é de rede
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const errorCode = 
    (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code) ||
    (error instanceof Error ? error.message : '');
  
  return errorCode.startsWith('network/') || 
         errorCode === 'ECONNABORTED' || 
         errorCode === 'ENETDOWN' ||
         errorCode === 'ETIMEDOUT';
}
