'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import MiniFooter from './MiniFooter';

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  
  // Não exibir o layout em páginas de autenticação
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <MiniFooter />
    </>
  );
}
