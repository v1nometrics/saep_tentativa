import { NextRequest, NextResponse } from 'next/server';
import { generateTokenPair, createAuthResponse, createLogoutResponse } from '@/lib/jwt';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

// Interface para o usuário
type User = {
  password: string;
  role: string;
  username?: string; // novo campo para autenticação por usuário
  name?: string;     // opcional: nome completo ou de exibição
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
    const { email, username, identifier, password } = await request.json();
    const loginId: string | undefined = email || username || identifier;

    // Validação básica
    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, message: 'Identificador e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Carregar usuários
    const users = await loadUsers();
    let userEmail: string | null = null;
    let user: User | undefined = users[loginId]; // tenta primeiro como e-mail

    // Se não encontrou por e-mail, tenta buscar por username
    if (!user) {
      for (const [mail, u] of Object.entries(users)) {
        if (u.username && u.username === loginId) {
          user = u as User;
          userEmail = mail;
          break;
        }
      }
    } else {
      userEmail = loginId;
    }

    // Verificar credenciais
    if (!user || user.password !== password || !userEmail) {
      console.warn(`Tentativa de login inválida para o identificador: ${loginId}`);
      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokenPair(userEmail);

    // Criar e retornar resposta de autenticação
    return createAuthResponse(
      {
        success: true,
        email: userEmail,
        username: user.username ?? null,
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
