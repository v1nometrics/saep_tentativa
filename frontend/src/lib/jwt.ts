import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Importação condicional do crypto apenas no servidor
let createHmac: any;
let randomBytes: any;

if (typeof window === 'undefined') {
  // Apenas no servidor
  const crypto = require('crypto');
  createHmac = crypto.createHmac;
  randomBytes = crypto.randomBytes;
}

// Tipos para os tokens
type TokenPayload = {
  email: string;
  exp: number;
  iat: number;
  type: 'access' | 'refresh';
  role?: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// Configurações de expiração (em segundos)
const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutos
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 dias
  secret: process.env.JWT_SECRET || 'seu-segredo-seguro-aqui',
};

// Gera uma assinatura segura para o token
function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('base64')
    .replace(/\=+$/, ''); // Remove padding
}

// Gera um token JWT seguro
export function generateToken(payload: Omit<TokenPayload, 'exp' | 'iat'>, expiresIn: number): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  // Codifica o payload
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  
  // Cria a assinatura
  const signature = sign(encodedPayload, TOKEN_CONFIG.secret);
  
  return `${encodedPayload}.${signature}`;
}

// Verifica se um token é válido
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encodedPayload, signature] = token.split('.');
    
    if (!encodedPayload || !signature) {
      return null; // Formato inválido
    }
    
    // Verifica a assinatura
    const expectedSignature = sign(encodedPayload, TOKEN_CONFIG.secret);
    if (signature !== expectedSignature) {
      return null; // Assinatura inválida
    }
    
    // Decodifica o payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    
    // Verifica a expiração
    if (payload.exp < now) {
      return null; // Token expirado
    }
    
    return payload as TokenPayload;
  } catch (error) {
    console.error('[JWT] Erro ao verificar token:', error);
    return null; // Token inválido
  }
}

// Gera um par de tokens (access + refresh)
export function generateTokenPair(email: string): TokenPair {
  const accessToken = generateToken(
    { email, type: 'access' },
    TOKEN_CONFIG.accessTokenExpiry
  );
  
  const refreshToken = generateToken(
    { email, type: 'refresh' },
    TOKEN_CONFIG.refreshTokenExpiry
  );
  
  return { accessToken, refreshToken };
}

// Tipos para os cookies
interface CookieStore {
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, options?: any): void;
  delete(name: string): void;
}

// Obtém os cookies da requisição (versão compatível com middleware)
async function getRequestCookies(request?: any): Promise<CookieStore> {
  if (request && request.cookies) {
    // Se for chamado do middleware (NextRequest)
    return {
      get: (name: string) => {
        const cookie = request.cookies.get(name);
        return cookie ? { name: cookie.name, value: cookie.value } : undefined;
      },
      set: (name: string, value: string, options?: any) => {
        // Não implementado para middleware
      },
      delete: (name: string) => {
        // Não implementado para middleware
      }
    };
  } else {
    // Se for chamado de um componente de servidor
    const { cookies } = await import('next/headers');
    return cookies() as unknown as CookieStore;
  }
}

// Verifica se o usuário está autenticado
export async function isAuthenticated(request?: any): Promise<boolean> {
  try {
    const cookieStore = await getRequestCookies(request);
    const token = cookieStore.get('auth_token')?.value;
    
    console.log('[JWT] Verificando autenticação - Token encontrado:', !!token);
    
    if (!token) {
      console.log('[JWT] Nenhum token de autenticação encontrado');
      return false;
    }
    
    const payload = verifyToken(token);
    const isValid = !!payload && payload.type === 'access';
    
    console.log('[JWT] Token válido:', isValid, 'Payload:', payload ? { email: payload.email, exp: payload.exp, type: payload.type } : null);
    
    return isValid;
  } catch (error) {
    console.error('[JWT] Erro ao verificar autenticação:', error);
    return false;
  }
}

// Obtém o payload do token de acesso
export async function getAuthPayload(request?: Request): Promise<TokenPayload | null> {
  try {
    const cookieStore = await getRequestCookies(request);
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    return verifyToken(token);
  } catch (error) {
    console.error('Erro ao obter payload do token:', error);
    return null;
  }
}

// Obtém o refresh token
export async function getRefreshToken(request?: Request): Promise<string | null> {
  try {
    const cookieStore = await getRequestCookies(request);
    const token = cookieStore.get('refresh_token')?.value;
    return token || null;
  } catch (error) {
    console.error('Erro ao obter refresh token:', error);
    return null;
  }
}

// Cria uma resposta de autenticação com os cookies configurados
export function createAuthResponse(
  data: any,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const response = NextResponse.json(data);
  
  // Access Token (15 minutos)
  response.cookies.set({
    name: 'auth_token',
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_CONFIG.accessTokenExpiry,
    path: '/',
  });
  
  // Refresh Token (7 dias, acessível apenas pelo servidor)
  response.cookies.set({
    name: 'refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_CONFIG.refreshTokenExpiry,
    path: '/api/auth/refresh',
  });
  
  return response;
}

// Cria uma resposta de logout
export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json({ success: true });
  
  // Remove os cookies de autenticação de forma mais agressiva
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
  
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
  
  // Também remove usando delete como backup
  response.cookies.delete('auth_token');
  response.cookies.delete('refresh_token');
  
  console.log('[JWT] Cookies de autenticação removidos no logout');
  
  return response;
}
