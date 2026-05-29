import type { Metadata } from 'next';
import './globals.css'; // Global styles
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import ScrollbarController from '@/components/ScrollbarController';

export const metadata: Metadata = {
  title: 'QuieroSIM | Internet para viajar | Conéctate al instante en 190+ Países',
  description: 'Adquiere tu tarjeta eSIM virtual prepago en USD con activación inmediata por código QR. Internet móvil sin roaming y soporte 24/7 de QUIERO LLC.',
  metadataBase: new URL('https://quierosim.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased text-slate-800 bg-white" suppressHydrationWarning>
        <ScrollbarController />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
