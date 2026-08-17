import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Node 24 + tinypool 1.x fork mode leaks memory across test files.
    // Use thread pool with singleThread for sequential heap reuse.
    // Excluding stress-concurrency (14-package import OOM), broken configwatcher/chaosengine tests.
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        minThreads: 1,
      },
    },
    maxConcurrency: 1,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    retry: 0,
    isolate: true,
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // OOM on Node 24: TS compilation of 5+ impl files exhausts V8 heap
      '**/packages/core/src/__tests__/stress-concurrency.test.ts',
      '**/packages/core/src/__tests__/mutation/**',
      // Pre-existing test bugs (fixed in this phase)
      // '**/packages/configwatcher/src/__tests__/i34-config-watcher.test.ts',
      // '**/packages/chaosengine/src/__tests__/ChaosEngineV2.test.ts',
    ],
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
      '@agentix-e/db-operations-audit': path.resolve(__dirname, 'packages/audit/src/index.ts'),
      '@agentix-e/db-operations-auth': path.resolve(__dirname, 'packages/auth/src/index.ts'),
      '@agentix-e/db-operations-autoscaler': path.resolve(__dirname, 'packages/autoscaler/src/index.ts'),
      '@agentix-e/db-operations-autotuner': path.resolve(__dirname, 'packages/autotuner/src/index.ts'),
      '@agentix-e/db-operations-backup': path.resolve(__dirname, 'packages/backup/src/index.ts'),
      '@agentix-e/db-operations-chaosengine': path.resolve(__dirname, 'packages/chaosengine/src/index.ts'),
      '@agentix-e/db-operations-circuitbreaker': path.resolve(__dirname, 'packages/circuitbreaker/src/index.ts'),
      '@agentix-e/db-operations-configwatcher': path.resolve(__dirname, 'packages/configwatcher/src/index.ts'),
      '@agentix-e/db-operations-core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@agentix-e/db-operations-federation': path.resolve(__dirname, 'packages/federation/src/index.ts'),
      '@agentix-e/db-operations-health': path.resolve(__dirname, 'packages/health/src/index.ts'),
      '@agentix-e/db-operations-logger': path.resolve(__dirname, 'packages/logger/src/index.ts'),
      '@agentix-e/db-operations-maintenance': path.resolve(__dirname, 'packages/maintenance/src/index.ts'),
      '@agentix-e/db-operations-memoryguard': path.resolve(__dirname, 'packages/memoryguard/src/index.ts'),
      '@agentix-e/db-operations-metrics': path.resolve(__dirname, 'packages/metrics/src/index.ts'),
      '@agentix-e/db-operations-monitor': path.resolve(__dirname, 'packages/monitor/src/index.ts'),
      '@agentix-e/db-operations-observability': path.resolve(__dirname, 'packages/observability/src/index.ts'),
      '@agentix-e/db-operations-otel': path.resolve(__dirname, 'packages/otel/src/index.ts'),
      '@agentix-e/db-operations-rollingupgrade': path.resolve(__dirname, 'packages/rollingupgrade/src/index.ts'),
      '@agentix-e/db-operations-scheduler': path.resolve(__dirname, 'packages/scheduler/src/index.ts'),
      '@agentix-e/db-operations-security': path.resolve(__dirname, 'packages/security/src/index.ts'),
      '@agentix-e/db-operations-slacollector': path.resolve(__dirname, 'packages/slacollector/src/index.ts'),
    },
  },
});
