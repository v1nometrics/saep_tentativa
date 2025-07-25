'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, LoginCredentials } from '../../hooks/useAuth';
import { useCsrfToken, CSRF_HEADER } from '../../lib/csrf';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const router = useRouter();
  const csrfToken = useCsrfToken();

  // Efeito para redirecionar usuários já autenticados
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[LoginPage] Verificando autenticação...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        console.log('[LoginPage] Resposta da verificação:', response.status, response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[LoginPage] Dados da autenticação:', data);
          
          // Verifica se o usuário realmente está autenticado
          if (data.isAuthenticated === true) {
            console.log('[LoginPage] Usuário já autenticado, redirecionando...');
            router.push('/');
          } else {
            console.log('[LoginPage] Usuário não autenticado, permanecendo na página de login');
          }
        } else {
          console.log('[LoginPage] Erro na verificação, permanecendo na página de login');
        }
      } catch (error) {
        console.error('[LoginPage] Erro ao verificar autenticação:', error);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Iniciando processo de login...');
      console.log('Token CSRF disponível:', !!csrfToken);
      
      const credentials: LoginCredentials = { 
        email: email.trim(), 
        password: password.trim()
      };
      
      // Adiciona o token CSRF apenas se existir
      if (csrfToken) {
        console.log('Adicionando token CSRF à requisição');
        credentials[CSRF_HEADER] = csrfToken;
      } else {
        console.warn('Token CSRF não encontrado. A requisição pode falhar por falta de proteção CSRF.');
      }
      
      console.log('Enviando credenciais para login...');
      await login(credentials);
      console.log('Login realizado com sucesso!');
    } catch (error) {
      // O erro já é tratado pelo hook useAuth
      console.error('Erro durante o login:', error);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white shadow-2xl rounded-xl overflow-hidden">

        {/* Coluna da Marca (Clara) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-gray-100 text-gray-800 flex flex-col justify-center items-center">
          <img 
            src="https://www.innovatismc.com.br/wp-content/uploads/2023/12/logo-innovatis-flatico-150x150.png" 
            alt="Logo Innovatis" 
            className="w-24 h-24 mb-6"
          />
          <h1 className="text-2xl font-bold text-center mb-2">Sistema de Análise de Emendas Parlamentares</h1>
          <p className="text-gray-600 text-center">Innovatis - Inteligência em Gestão</p>
        </div>

        {/* Coluna do Formulário (Escura) */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-slate-900">
          <h2 className="text-2xl font-bold text-white mb-1">Acesse sua conta</h2>
          <p className="text-slate-300 mb-8">Bem-vindo de volta!<br/>Por favor, insira seus dados.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Adiciona o token CSRF como um campo oculto apenas se existir */}
            {csrfToken && (
              <input 
                type="hidden" 
                name="x-csrf-token" 
                value={csrfToken} 
              />
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-70"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300" htmlFor="password">
                  Senha
                </label>
                <a href="/esqueci-senha" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:opacity-70"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                onKeyDown={handleKeyDown}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-70 disabled:transform-none ${
                isLoading ? 'cursor-wait' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Autenticando...
                </>
              ) : 'Entrar'}
            </button>
            
            <div className="text-center text-sm text-slate-400 mt-4">
              Ainda não tem uma conta?{' '}
              <a href="/cadastro" className="text-blue-400 hover:text-blue-300 font-medium">
                Solicitar acesso
              </a>
            </div>
          </form>
        </div>

      </div>
    </div>
    </Suspense>
  );
}
