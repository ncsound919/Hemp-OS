import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**', 'e2e/**',
      'Hemp-Agent-main/**', 'Hemp OS DB/**', 'AgentBrowser-main/**',
      'mem0-main/**', 'Data_Visualization-main/**'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'kernel/**/*.ts', 'integration/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['warn', 'always'],
      'curly': 'warn',
      'no-throw-literal': 'warn',
      'prefer-template': 'warn',
    },
  },
];
