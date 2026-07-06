import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
   {
      ignores: [
         '.next/**',
         '.output/**',
         'dist/**',
         'node_modules/**',
         'src/routeTree.gen.ts',
         'convex/_generated/**',
      ],
   },
   js.configs.recommended,
   ...tseslint.configs.recommended,
   prettier,
   {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
         parserOptions: {
            projectService: true,
         },
      },
      rules: {
         '@typescript-eslint/no-explicit-any': 'off',
      },
   }
);
