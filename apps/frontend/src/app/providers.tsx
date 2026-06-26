'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { ToastProvider } from '@/components/ui/Toast';
import ThemeProvider from '@/components/template/Theme/ThemeProvider';
import NavigationProvider from '@/components/template/Navigation/NavigationProvider';
import { themeConfig } from '@/configs/theme.config';
import navigationConfig from '@/configs/navigation.config';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={themeConfig} locale="fr">
        <NavigationProvider navigationTree={navigationConfig}>
          <ToastProvider>
            <AuthBootstrap>{children}</AuthBootstrap>
          </ToastProvider>
        </NavigationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
