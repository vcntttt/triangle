import { defineConfig, lazyPlugins } from 'vite-plus';
import { nitro } from 'nitro/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const generated = ['src/routeTree.gen.ts', 'convex/_generated/**'];

export default defineConfig({
   server: {
      port: 3000,
   },
   resolve: {
      tsconfigPaths: true,
   },
   // Lazy so `vp check`, `vp lint` and `vp fmt` don't load the app plugins.
   plugins: lazyPlugins(() => [nitro(), tanstackStart(), tailwindcss(), react()]),
   lint: {
      categories: { correctness: 'error' },
      ignorePatterns: ['.output/**', ...generated],
      options: { typeAware: true, typeCheck: true },
      overrides: [
         // node:test tracks the promise that test() returns.
         { files: ['**/*.test.ts'], rules: { 'typescript/no-floating-promises': 'off' } },
      ],
   },
   fmt: {
      printWidth: 100,
      tabWidth: 3,
      singleQuote: true,
      quoteProps: 'consistent',
      trailingComma: 'es5',
      sortPackageJson: false,
      ignorePatterns: ['public/**', 'bun.lock', '.github/**', ...generated],
   },
});
