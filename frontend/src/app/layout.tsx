import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./globals"; // Force load all lib modules for Vercel build
import { ToastProvider } from "@/components/ui/Toast";
import { MainLayout } from "@/components/layout/MainLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: "Painel Innovatis - Sistema de Análise de Emendas Parlamentares",
  description: "Plataforma institucional para monitoramento e análise estratégica de emendas parlamentares - R$ 77.6 bilhões em oportunidades",
  keywords: ["emendas parlamentares", "innovatis", "oportunidades", "siop", "orçamento", "análise parlamentar"],
  authors: [{ name: "Innovatis" }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo_innovatis_preta.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/logo_innovatis_preta.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Innovatis - Emendas',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/logo_innovatis_preta.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900 h-full`}>
        <ToastProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
