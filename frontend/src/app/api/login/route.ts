import { NextRequest, NextResponse } from 'next/server';
import { generateTokenPair, createAuthResponse, createLogoutResponse } from '@/lib/jwt';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// Interface para o usuário
type User = {
  password: string;
  role: string;
  name: string;
};

// Cache de usuários em memória (opcional, para performance)
let usersCache: Record<string, User> | null = null;

// Carrega os usuários do arquivo JSON
async function loadUsers() {
  if (usersCache) return usersCache;
  
  try {
    const usersPath = path.join(process.cwd(), 'config', 'users.json');
    const usersBuffer = await fs.readFile(usersPath);
    usersCache = JSON.parse(usersBuffer.toString());
    return usersCache as Record<string, User>;
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    return {};
  }
}

// Endpoint de login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Carregar usuários
    const users = await loadUsers();
    const user = users[email];

    // Verificar credenciais
    if (!user || user.password !== password) {
      // Log de tentativa de login inválida (em produção, use um serviço de logging)
      console.warn(`Tentativa de login inválida para o e-mail: ${email}`);
      
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokenPair(email);
    
    // Criar e retornar resposta de autenticação
    return createAuthResponse(
      {
        success: true,
        email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken
    );
    
  } catch (error) {
    console.error('Erro durante o login:', error);
    
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para logout
export async function DELETE() {
  return createLogoutResponse();
}

// Métodos não permitidos
export function GET() {
  return new NextResponse('Método não permitido', { status: 405 });
}

export function PUT() {
  return new NextResponse('Método não permitido', { status: 405 });
}

export function PATCH() {
  return new NextResponse('Método não permitido', { status: 405 });
}
