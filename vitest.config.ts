import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test functions (describe, it, expect) without imports
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 1000000, // Long timeout for Solana tests
    pool: 'forks', // Use forks for better isolation with Solana programs
    setupFiles: [],
    // Path alias resolution
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
