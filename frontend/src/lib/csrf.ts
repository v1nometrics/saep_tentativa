// Este arquivo foi movido para csrf-utils.ts e use-csrf.ts
// Mantido para compatibilidade com imports existentes
// Por favor, atualize seus imports para usar os novos arquivos

// Exporta todas as funções de utilidade do servidor
export * from './csrf-utils';

// Exporta os hooks do React do novo local
export { useCsrfToken, useCsrfHeaders } from '../hooks/use-csrf';
