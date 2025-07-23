import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Endpoint para encerrar sessão: remove cookie auth_token
export async function POST() {
  const response = NextResponse.json({ success: true });

  // Apaga o cookie definindo maxAge 0
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
