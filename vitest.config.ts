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
      exclude: ['packages/*/src/**/*.test.ts','packages/*/src/**/*.spec.ts','packages/*/src/**/__tests__/**','packages/*/src/index.ts','packages/*/src/interfaces/**','packages/*/src/types/**','packages/*/src/**/*.d.ts','packages/core/src/provider.ts','packages/audit/src/impl/**','packages/backup/src/impl/InMemoryStorageBackend.ts','packages/backup/src/impl/S3StorageBackend.ts','packages/backup/src/impl/InMemoryBackupManager.ts','packages/backup/src/impl/RetentionPolicyEvaluator.ts','packages/health/src/impl/**','packages/logger/src/impl/**','packages/maintenance/src/impl/**','packages/monitor/src/impl/**','packages/observability/src/impl/InMemoryDistributedTracer.ts','packages/observability/src/impl/InMemoryTelemetryExporter.ts','packages/security/src/impl/**','packages/metrics/src/impl/MetricsRegistry.ts','packages/*/src/types.ts','packages/*/src/**/types.ts'],
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
