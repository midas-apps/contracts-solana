import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test functions (describe, it, expect) without imports
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 1000000, // Long timeout for Solana tests
    pool: 'forks', // Use forks for better isolation with Solana programs
    fileParallelism: false, // Run test files sequentially to prevent resource exhaustion
    teardownTimeout: 10000, // 10 second timeout for cleanup
    hookTimeout: 30000, // 30 second timeout for hooks
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
