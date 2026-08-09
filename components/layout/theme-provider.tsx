'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
   return (
      <NextThemesProvider
         {...props}
         themes={['light', 'dark', 'pure-light', 'classic-dark']}
         enableSystem
         enableColorScheme
         disableTransitionOnChange
      >
         {children}
      </NextThemesProvider>
   );
}
