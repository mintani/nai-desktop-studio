"use client";

import { Toaster } from "@nai-desktop-studio/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";

import { I18nProvider } from "@/i18n/provider";
import { queryClient } from "@/lib/query-client";

import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
    </I18nProvider>
  );
}
