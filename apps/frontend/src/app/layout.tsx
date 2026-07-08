import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'ScolarPaie',
  description: 'Interface de gestion ScolarPaie',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
