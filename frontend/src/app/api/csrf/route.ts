import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';

export async function GET() {
  try {
    // Gera um novo token CSRF
    const { token } = await generateCsrfToken();
    
    // Cria a resposta com o token
    const response = NextResponse.json({ token });
    
    // Configura o cookie CSRF
    await setCsrfCookie(response);
    
    return response;
  } catch (error) {
    console.error('Erro ao gerar token CSRF:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar token CSRF' },
      { status: 500 }
    );
  }
}

// Configuração para evitar cache da rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
