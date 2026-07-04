import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['integration/**/*.test.ts', 'kernel/**/*.test.ts', 'Hemp-Agent-main/**/*.test.ts', 'Hemp OS DB/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 10_000,
    typecheck: {
      tsconfig: './Hemp-Agent-main/tsconfig.json',
    },
  },
});
