import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/jwt';

export async function GET() {
  try {
    console.log('[AuthMe] Verificando autenticação do usuário...');
    const payload = await getAuthPayload();
    
    console.log('[AuthMe] Payload obtido:', payload ? { email: payload.email, exp: payload.exp, type: payload.type } : null);
    
    if (!payload) {
      console.log('[AuthMe] Usuário não autenticado');
      return NextResponse.json(
        { isAuthenticated: false },
        { status: 200 }
      );
    }
    
    console.log('[AuthMe] Usuário autenticado:', payload.email);
    return NextResponse.json({
      isAuthenticated: true,
      user: {
        email: payload.email,
        role: payload.role
      }
    });
  } catch (error) {
    console.error('[AuthMe] Erro ao verificar autenticação:', error);
    return NextResponse.json(
      { isAuthenticated: false, error: 'Erro ao verificar autenticação' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
