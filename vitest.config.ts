import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@/': resolve(__dirname, './src/') + '/',
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec,property}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/__tests__/**'],
    },
  },
});
