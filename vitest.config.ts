import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.test.ts',
        'packages/*/src/**/*.spec.ts',
        'packages/*/src/**/__tests__/**',
        'packages/*/src/index.ts',
      ],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@agentix-e/db-operations-core': path.resolve(__dirname, 'packages/core/src'),
      '@agentix-e/db-operations-health': path.resolve(__dirname, 'packages/health/src'),
      '@agentix-e/db-operations-scheduler': path.resolve(__dirname, 'packages/scheduler/src'),
    },
  },
});
