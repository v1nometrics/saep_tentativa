export interface LoginResponse {
  success: boolean;
  message?: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, message: data.message || 'Erro ao autenticar' };
    }

    const data = await res.json();
    // opcional: armazenar no localStorage caso queira
    if (data?.token) {
      localStorage.setItem('auth_token', data.token);
    }

    return { success: true };
  } catch (error) {
    console.error('Erro no login', error);
    return { success: false, message: 'Falha de rede' };
  }
}

export function logout() {
  // Limpa token localStorage
  localStorage.removeItem('auth_token');
  fetch('/api/logout', { method: 'POST' }).finally(() => {
    window.location.href = '/login';
  });
}

export function isAuthenticated(): boolean {
  // Primeiro verifica cookie, senão localStorage
  if (typeof document !== 'undefined') {
    return document.cookie.includes('auth_token=') || !!localStorage.getItem('auth_token');
  }
  return false;
}
