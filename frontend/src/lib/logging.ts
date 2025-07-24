import { isServer } from '@/lib/environment';

// Níveis de log
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Tipos de eventos que podem ser registrados
type LogEventType = 
  // Eventos de navegação
  | 'navigation:page:view'  // Visualização de página
  
  // Eventos de autenticação
  | 'auth:login:attempt'    // Tentativa de login
  | 'auth:login:success'    // Login bem-sucedido
  | 'auth:login:failure'    // Falha no login
  | 'auth:logout'           // Logout
  | 'auth:session:expired'  // Sessão expirada
  | 'auth:token:refresh'    // Atualização de token
  | 'auth:token:invalid'    // Token inválido
  | 'auth:csrf:invalid'     // Token CSRF inválido
  
  // Eventos de erro
  | 'error:unhandled'       // Erro não tratado
  | 'error:network'         // Erro de rede
  | 'error:validation'      // Erro de validação
  
  // Eventos de segurança
  | 'security:unauthorized' // Acesso não autorizado
  | 'security:forbidden'    // Acesso proibido
  
  // Eventos de teste (apenas para desenvolvimento)
  | 'test:debug'            // Teste de log de debug
  | 'test:info'             // Teste de log de informação
  | 'test:warn'             // Teste de log de aviso
  | 'test:error';           // Teste de log de erro

// Interface para os dados do log
interface LogData {
  // Dados do usuário (se disponível)
  userId?: string | number;
  userEmail?: string;
  
  // Dados da requisição
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  
  // Dados do erro (se aplicável)
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  
  // Dados adicionais
  [key: string]: any;
}

// Interface para um registro de log
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  type: LogEventType;
  message: string;
  data?: LogData;
}

/**
 * Serviço de logging centralizado
 */
class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Número máximo de logs a serem mantidos em memória
  
  private constructor() {
    // Define o nível de log com base na variável de ambiente
    if (process.env.NEXT_PUBLIC_LOG_LEVEL) {
      this.setLogLevel(process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel);
    }
    
    // Em produção, só mostra logs de warning e error por padrão
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_LOG_LEVEL) {
      this.logLevel = 'warn';
    }
    
    // Captura erros globais não tratados
    if (!isServer) {
      window.addEventListener('error', (event) => {
        this.error('error:unhandled', 'Erro não tratado', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? {
            name: event.error.name,
            message: event.error.message,
            stack: event.error.stack
          } : undefined
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason || new Error('Promise rejeitada sem motivo');
        this.error('error:unhandled', 'Promise não tratada', {
          message: error.message,
          stack: error.stack
        });
      });
    }
  }
  
  /**
   * Obtém a instância singleton do Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Define o nível de log mínimo
   */
  public setLogLevel(level: LogLevel): void {
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (validLevels.includes(level)) {
      this.logLevel = level;
    }
  }
  
  /**
   * Adiciona um log
   */
  private addLog(level: LogLevel, type: LogEventType, message: string, data?: LogData): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      data
    };
    
    // Adiciona ao histórico de logs
    this.logs.push(logEntry);
    
    // Limita o tamanho do histórico
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Envia para o console no navegador
    if (!isServer) {
      const logFn = console[level] || console.log;
      const logMessage = `[${type}] ${message}`;
      
      if (data) {
        logFn(logMessage, data);
      } else {
        logFn(logMessage);
      }
      
      // Em modo de desenvolvimento, também envia para o servidor de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        this.sendToServer(logEntry);
      }
    }
    
    // Em produção, envia para o serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(logEntry);
    }
  }
  
  /**
   * Envia o log para o servidor (se configurado)
   */
  private async sendToServer(logEntry: LogEntry): Promise<void> {
    try {
      // Substitua esta URL pela URL do seu endpoint de log
      const logEndpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT || '/api/logs';
      
      await fetch(logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.error('Erro ao enviar log para o servidor:', error);
    }
  }
  
  /**
   * Envia o log para o serviço de monitoramento (ex: Sentry, LogRocket, etc.)
   */
  private sendToMonitoring(logEntry: LogEntry): void {
    // Implemente a integração com o serviço de monitoramento de sua escolha
    // Exemplo para Sentry:
    // if (window.Sentry && logEntry.level === 'error') {
    //   window.Sentry.captureException(new Error(logEntry.message), {
    //     extra: logEntry.data
    //   });
    // }
    
    // Exemplo para LogRocket:
    // if (window.LogRocket) {
    //   window.LogRocket.captureMessage(logEntry.message, {
    //     level: logEntry.level,
    //     extra: logEntry.data
    // });
    // }
  }
  
  /**
   * Obtém os logs armazenados
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Limpa os logs armazenados
   */
  public clearLogs(): void {
    this.logs = [];
  }
  
  // Métodos de conveniência para diferentes níveis de log
  
  public debug(type: LogEventType, message: string, data?: LogData): void {
    if (this.shouldLog('debug')) {
      this.addLog('debug', type, message, data);
    }
  }
  
  public info(type: LogEventType, message: string, data?: LogData): void {
    if (this.shouldLog('info')) {
      this.addLog('info', type, message, data);
    }
  }
  
  public warn(type: LogEventType, message: string, data?: LogData): void {
    if (this.shouldLog('warn')) {
      this.addLog('warn', type, message, data);
    }
  }
  
  public error(type: LogEventType, message: string, data?: LogData): void {
    if (this.shouldLog('error')) {
      this.addLog('error', type, message, data);
    }
  }
  
  /**
   * Verifica se o log deve ser registrado com base no nível atual
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.logLevel];
  }
}

// Exporta uma instância única do logger
export const logger = Logger.getInstance();

// Funções de conveniência para uso rápido
export const logDebug = (type: LogEventType, message: string, data?: LogData) => 
  logger.debug(type, message, data);

export const logInfo = (type: LogEventType, message: string, data?: LogData) => 
  logger.info(type, message, data);

export const logWarn = (type: LogEventType, message: string, data?: LogData) => 
  logger.warn(type, message, data);

export const logError = (type: LogEventType, message: string, data?: LogData) => 
  logger.error(type, message, data);

// Tipos exportados para uso externo
export type { LogLevel, LogEventType, LogData, LogEntry };
