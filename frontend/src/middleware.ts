// @ts-nocheck
// Nota: Desativamos a verificação de tipos temporariamente para este arquivo
// devido a incompatibilidades com o Edge Runtime

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated, getRefreshToken, verifyToken } from '@/lib/jwt';
import { csrfMiddleware, verifyCsrfToken } from '@/lib/csrf';

// Rotas públicas que não requerem autenticação
const publicRoutes = [
  '/login',
  '/api/login',
  '/api/auth/refresh',
  '/api/csrf',
  '/_next',
  '/favicon.ico',
  '/static',
  '/manifest.json',
  '/icon',
  '/icons',
];

// Rotas que não requerem verificação CSRF
const csrfExcludedRoutes = [
  '/api/auth/refresh',
  '/api/csrf',
  '/_next',
  '/favicon.ico',
  '/static',
  '/manifest.json',
  '/icon',
  '/icons',
];

// Verifica se a rota é pública
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Verifica se a rota está na lista de exclusão CSRF
function isCsrfExcludedRoute(pathname: string): boolean {
  return csrfExcludedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`[Middleware] Rota acessada: ${pathname}`);
  
  // Log especial para rota raiz
  if (pathname === '/') {
    console.log('[Middleware] Processando rota raiz (/) - verificando autenticação...');
  }
  
  // Aplica o middleware CSRF para todas as rotas não excluídas
  if (!isCsrfExcludedRoute(pathname)) {
    const csrfResponse = await csrfMiddleware(request);
    if (csrfResponse) {
      // Se for uma rota de API que modifica dados, verifica o token CSRF
      if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const isCsrfValid = await verifyCsrfToken(request);
        if (!isCsrfValid) {
          console.log(`[Middleware] Token CSRF inválido para rota ${pathname}`);
          return new NextResponse(
            JSON.stringify({ error: 'Token CSRF inválido' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Se for uma resposta de middleware CSRF, retorna ela
      if (csrfResponse instanceof NextResponse) {
        return csrfResponse;
      }
    }
  }
  
  // Se for uma rota de API, permite o acesso (já verificamos CSRF se necessário)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Verifica se a rota é pública
  const isPublic = isPublicRoute(pathname);
  
  // Verifica a autenticação do usuário
  const isAuth = await isAuthenticated(request);
  
  // Se for uma rota pública
  if (isPublic) {
    // Se o usuário está logado e tenta acessar a página de login, redireciona para a home
    if (pathname === '/login' && isAuth) {
      console.log('[Middleware] Usuário autenticado tentando acessar login, redirecionando para /');
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
  
  // Para rotas protegidas (incluindo a raiz '/'), verifica a autenticação
  console.log(`[Middleware] Rota protegida: ${pathname}, Autenticado: ${isAuth}`);
  
  if (!isAuth) {
    // Tenta renovar o token usando o refresh token
    const refreshToken = await getRefreshToken(request);
    
    if (refreshToken) {
      const refreshTokenPayload = verifyToken(refreshToken);
      
      if (refreshTokenPayload && refreshTokenPayload.type === 'refresh') {
        // Se o refresh token for válido, redireciona para a rota de refresh
        const response = NextResponse.redirect(
          new URL('/api/auth/refresh', request.url)
        );
        
        // Adiciona o caminho original para redirecionamento após o refresh
        response.cookies.set('redirect_after_refresh', pathname, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60, // 1 minuto
          path: '/',
        });
        
        return response;
      }
    }
    
    // Se não houver refresh token ou for inválido, redireciona para o login
    console.log(`[Middleware] Redirecionando usuário não autenticado de ${pathname} para /login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    
    return NextResponse.redirect(loginUrl);
  }
  
  // Se o token for válido, permite o acesso à rota solicitada
  console.log(`[Middleware] Usuário autenticado acessando rota protegida: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  // Aplicar o middleware a todas as rotas, incluindo a raiz
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico (ícone de favoritos)
     * - api (rotas de API - protegidas individualmente)
     * - login (página de login)
     * - static (arquivos estáticos)
     */
    '/',
    '/((?!_next/static|_next/image|favicon.ico|api|login|static).*)',
  ],
};
