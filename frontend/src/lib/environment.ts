/**
 * Verifica se o código está sendo executado no servidor (Node.js) ou no navegador
 * @returns {boolean} True se estiver no servidor, false se estiver no navegador
 */
export const isServer = typeof window === 'undefined';

/**
 * Verifica se o código está sendo executado no navegador
 * @returns {boolean} True se estiver no navegador, false se estiver no servidor
 */
export const isClient = !isServer;

/**
 * Obtém o ambiente de execução atual
 * @returns {'server' | 'client'} 'server' ou 'client' dependendo de onde o código está sendo executado
 */
export const getEnvironment = (): 'server' | 'client' => 
  isServer ? 'server' : 'client';

/**
 * Verifica se o ambiente atual é de desenvolvimento
 * @returns {boolean} True se estiver em desenvolvimento, false caso contrário
 */
export const isDevelopment = (): boolean => 
  process.env.NODE_ENV === 'development';

/**
 * Verifica se o ambiente atual é de produção
 * @returns {boolean} True se estiver em produção, false caso contrário
 */
export const isProduction = (): boolean => 
  process.env.NODE_ENV === 'production';

/**
 * Verifica se o ambiente atual é de teste
 * @returns {boolean} True se estiver em teste, false caso contrário
 */
export const isTest = (): boolean => 
  process.env.NODE_ENV === 'test';

/**
 * Obtém o nome do ambiente atual
 * @returns {string} O nome do ambiente atual (development, production, test, etc.)
 */
export const getEnvironmentName = (): string => 
  process.env.NODE_ENV || 'development';
