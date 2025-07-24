// Server-side CSRF utilities
// This file should only be used in server components or API routes

import { NextRequest, NextResponse } from 'next/server';

export const CSRF_TOKEN_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || 'your-secret-key-change-in-production';

// Generate random bytes for token generation
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// Safe string comparison to prevent timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// Generate a CSRF token and its hash
export async function generateCsrfToken(): Promise<{ token: string; hash: string }> {
  const randomBytes = await generateRandomBytes(32);
  const token = bytesToHex(randomBytes);
  const hash = await sha256(`${token}${CSRF_SECRET}`);
  return { token, hash };
}

// Validate a CSRF token against its hash
export async function validateCsrfToken(token: string, hash: string): Promise<boolean> {
  if (!token || !hash) return false;
  const expectedHash = await sha256(`${token}${CSRF_SECRET}`);
  return safeEqual(hash, expectedHash);
}

// Verify CSRF token from request
export async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }

  // Get token from header or body
  const csrfToken = request.headers.get(CSRF_HEADER);
  let csrfTokenFromBody: string | null = null;
  
  try {
    const requestClone = request.clone();
    const body = await requestClone.json().catch(() => ({}));
    csrfTokenFromBody = body?.[CSRF_HEADER] || null;
  } catch (error) {
    console.error('Error reading request body:', error);
  }
  
  const token = csrfToken || csrfTokenFromBody;
  const csrfCookie = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  
  if (!token || !csrfCookie) {
    return false;
  }
  
  return validateCsrfToken(token, csrfCookie);
}

// Set CSRF token in response cookie
export async function setCsrfCookie(response: NextResponse): Promise<NextResponse> {
  const { token, hash } = await generateCsrfToken();
  
  // Set cookie with security attributes
  response.cookies.set({
    name: CSRF_TOKEN_COOKIE,
    value: hash,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  
  return response;
}

// CSRF middleware for Next.js API routes
export async function csrfMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Verify CSRF token for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const isValid = await verifyCsrfToken(request);
    if (!isValid) {
      return new NextResponse('Invalid CSRF token', { status: 403 });
    }
  }
  
  // Add CSRF token to response if not present
  const csrfCookie = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;
  if (!csrfCookie) {
    await setCsrfCookie(response);
  }
  
  return response;
}
