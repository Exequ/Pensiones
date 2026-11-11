import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Librerías prohibidas por el sistema de diseño (ver CLAUDE.md). */
const LIBRERIAS_PROHIBIDAS = [
  {
    group: ['tailwindcss', 'tailwindcss/*', '@tailwindcss/*'],
    message: 'Tailwind está prohibido: CSS propio con tokens.',
  },
  { group: ['@shadcn/*', 'shadcn', 'shadcn/*'], message: 'shadcn/ui está prohibido.' },
  { group: ['@mui/*', '@material-ui/*', '@material/*'], message: 'Material está prohibido.' },
  { group: ['@chakra-ui/*'], message: 'Chakra está prohibido.' },
  { group: ['@radix-ui/*', 'radix-ui'], message: 'Radix está prohibido.' },
  {
    group: ['recharts', 'recharts/*'],
    message: 'Recharts está prohibido: usa <Chart> con Observable Plot.',
  },
  {
    group: ['styled-components', '@emotion/*', 'antd', 'bootstrap', 'react-bootstrap'],
    message: 'Librería de estilos o componentes prohibida.',
  },
];

export default defineConfig(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results', 'capturas'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-restricted-imports': ['error', { patterns: LIBRERIAS_PROHIBIDAS }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      // Las regiones desplazables (tablas anchas) deben poder enfocarse con el teclado.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'Nada de estilos en línea: usa clases CSS basadas en los tokens (src/styles/tokens.css).',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['scripts/**/*.ts', 'e2e/**/*.ts', '*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
