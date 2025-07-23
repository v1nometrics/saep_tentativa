import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateTokenPair, createAuthResponse } from '@/lib/jwt';

export const runtime = 'nodejs';

// Endpoint para renovar o token de acesso usando o refresh token
export async function POST(request: NextRequest) {
  try {
    // Obter o refresh token do cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar se o refresh token é válido
    const payload = verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { success: false, message: 'Refresh token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Gerar novos tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(payload.email);
    
    // Criar resposta com os novos tokens
    return createAuthResponse(
      { 
        success: true, 
        email: payload.email,
        // Inclua outros dados do usuário se necessário
      },
      accessToken,
      newRefreshToken
    );
    
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro ao renovar token de acesso' },
      { status: 500 }
    );
  }
}

// Método não permitido
export function GET() {
  return new NextResponse('Método não permitido', { status: 405 });
}

// Método não permitido
export function PUT() {
  return new NextResponse('Método não permitido', { status: 405 });
}

// Método não permitido
export function DELETE() {
  return new NextResponse('Método não permitido', { status: 405 });
}
