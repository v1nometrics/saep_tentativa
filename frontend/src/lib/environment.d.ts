/**
 * Verifica se o código está sendo executado no servidor (Node.js) ou no navegador
 * @returns {boolean} True se estiver no servidor, false se estiver no navegador
 */
export declare const isServer: boolean;

/**
 * Verifica se o código está sendo executado no navegador
 * @returns {boolean} True se estiver no navegador, false se estiver no servidor
 */
export declare const isClient: boolean;

/**
 * Obtém o ambiente de execução atual
 * @returns {'server' | 'client'} 'server' ou 'client' dependendo de onde o código está sendo executado
 */
export declare function getEnvironment(): 'server' | 'client';

/**
 * Verifica se o ambiente atual é de desenvolvimento
 * @returns {boolean} True se estiver em desenvolvimento, false caso contrário
 */
export declare function isDevelopment(): boolean;

/**
 * Verifica se o ambiente atual é de produção
 * @returns {boolean} True se estiver em produção, false caso contrário
 */
export declare function isProduction(): boolean;

/**
 * Verifica se o ambiente atual é de teste
 * @returns {boolean} True se estiver em teste, false caso contrário
 */
export declare function isTest(): boolean;

/**
 * Obtém o nome do ambiente atual
 * @returns {string} O nome do ambiente atual (development, production, test, etc.)
 */
export declare function getEnvironmentName(): string;
