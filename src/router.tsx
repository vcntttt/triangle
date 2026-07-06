import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { routeTree } from './routeTree.gen';

export function getRouter() {
   const convexUrl =
      (typeof process !== 'undefined' && process.env?.CONVEX_SELF_HOSTED_URL) ||
      (typeof process !== 'undefined' && process.env?.VITE_CONVEX_URL) ||
      (import.meta.env.VITE_CONVEX_URL as string | undefined);

   if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL.');
   }

   const convexClient = new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
   });
   const convexQueryClient = new ConvexQueryClient(convexClient);
   const queryClient = new QueryClient({
      defaultOptions: {
         queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
         },
      },
   });

   convexQueryClient.connect(queryClient);

   const router = createRouter({
      routeTree,
      context: {
         queryClient,
         convexClient,
         convexQueryClient,
      },
      scrollRestoration: true,
      Wrap: ({ children }) => (
         <ConvexProvider client={convexQueryClient.convexClient}>{children}</ConvexProvider>
      ),
   });

   setupRouterSsrQueryIntegration({ router, queryClient });

   return router;
}

declare module '@tanstack/react-router' {
   interface Register {
      router: ReturnType<typeof getRouter>;
   }
}
