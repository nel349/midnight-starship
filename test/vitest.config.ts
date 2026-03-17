import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    testTimeout: 300_000, // 5 minutes — proofs are slow
    hookTimeout: 300_000,
    include: ['test/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@contract': path.resolve(__dirname, '../contract/src'),
      '@api': path.resolve(__dirname, '../api/src'),
    },
  },
});
