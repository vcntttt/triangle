/// <reference types="vite/client" />

import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute, Link } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/geist-mono';
import globalsCss from '@/src/styles/globals.css?url';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AppSidebar } from '@/components/layout/sidebar/app-sidebar';
import { CreateIssueModalProvider } from '@/components/common/issues/create-issue-modal-provider';
import { GlobalShortcuts } from '@/components/common/shortcuts/global-shortcuts';
import { CommandPalette } from '@/components/common/command-palette';
import { ShortcutsHelpProvider } from '@/components/common/shortcuts/shortcuts-help-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import {
   projectAttentionListQuery,
   projectOptionsQuery,
   projectPriorityListQuery,
   projectStatusListQuery,
} from '@/src/data/projects';

export const Route = createRootRoute({
   loader: ({ context }) =>
      Promise.all([
         context.queryClient.ensureQueryData(projectOptionsQuery()),
         context.queryClient.ensureQueryData(projectStatusListQuery()),
         context.queryClient.ensureQueryData(projectPriorityListQuery()),
         context.queryClient.ensureQueryData(projectAttentionListQuery()),
      ]),
   head: () => ({
      meta: [
         { charSet: 'utf-8' },
         {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
         },
         { name: 'theme-color', content: '#101116' },
         { name: 'mobile-web-app-capable', content: 'yes' },
         { name: 'apple-mobile-web-app-capable', content: 'yes' },
         { name: 'apple-mobile-web-app-title', content: 'Triangle' },
         { title: 'Triangle' },
         {
            name: 'description',
            content:
               'Fork personal de Triangle, una UI inspirada en Linear, recortada para gestionar proyectos, issues y etiquetas.',
         },
      ],
      links: [
         { rel: 'stylesheet', href: globalsCss },
         { rel: 'manifest', href: '/manifest.webmanifest' },
         { rel: 'icon', type: 'image/png', href: '/triangle.png' },
         { rel: 'apple-touch-icon', href: '/triangle.png' },
      ],
   }),
   notFoundComponent: NotFoundComponent,
   errorComponent: RootErrorComponent,
   component: RootComponent,
});

function RootComponent() {
   const queryClient = Route.useRouteContext({ select: (context) => context.queryClient });

   return (
      <QueryClientProvider client={queryClient}>
         <RootDocument>
            <Outlet />
         </RootDocument>
      </QueryClientProvider>
   );
}

function RootDocument({ children }: { children: ReactNode }) {
   return (
      <html lang="en" suppressHydrationWarning>
         <head>
            <HeadContent />
         </head>
         <body className="antialiased bg-background">
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
               <SidebarProvider>
                  <CreateIssueModalProvider />
                  <ShortcutsHelpProvider />
                  <GlobalShortcuts />
                  <CommandPalette />
                  <AppSidebar />
                  {children}
               </SidebarProvider>
               <Toaster />
            </ThemeProvider>
            <TanStackRouterDevtools position="bottom-right" />
            <Scripts />
         </body>
      </html>
   );
}

function NotFoundComponent() {
   return (
      <div className="min-h-svh flex items-center justify-center p-6 bg-background text-foreground">
         <div className="w-full max-w-md rounded-lg border bg-card p-6 space-y-4 text-center">
            <img src="/triangle.png" alt="Triangle" className="size-7 mx-auto" />
            <h1 className="text-lg font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">
               The route does not exist in the personal Triangle workspace.
            </p>
            <Link to="/projects" className="text-sm underline underline-offset-4">
               Go to projects
            </Link>
         </div>
      </div>
   );
}

function RootErrorComponent({ error }: { error: unknown }) {
   const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

   return (
      <RootDocument>
         <div className="min-h-svh flex items-center justify-center p-6 bg-background text-foreground">
            <div className="w-full max-w-lg rounded-lg border bg-card p-6 space-y-4 text-center">
               <img src="/triangle.png" alt="Triangle" className="size-7 mx-auto" />
               <h1 className="text-lg font-semibold">Something went wrong</h1>
               <p className="text-sm text-muted-foreground">{message}</p>
               <Link to="/issues" className="text-sm underline underline-offset-4">
                  Go to issues
               </Link>
            </div>
         </div>
      </RootDocument>
   );
}
