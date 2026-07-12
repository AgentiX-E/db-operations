# db-operations — Unified Database Operations Framework

[![Test Status](https://github.com/AgentiX-E/db-operations/actions/workflows/ci.yml/badge.svg)](https://github.com/AgentiX-E/db-operations/actions)
[![npm version](https://img.shields.io/npm/v/@agentix-e/db-operations-core)](https://www.npmjs.com/package/@agentix-e/db-operations-core)

**A production-grade, engine-agnostic operations abstraction layer for database systems.**

Replace ad-hoc `ops/` directories with a canonical interface suite that every database engine implements via adapters.

## Why db-operations?

Every database engine needs: health checks, backup/restore, monitoring, security, audit, metrics, logging, maintenance, auth, and observability.

Without a shared framework, each engine implements these from scratch — with incompatible APIs, inconsistent error handling, and duplicated testing effort.

**db-operations solves this** with an interface-first, composable, pluggable architecture that 11 packages deliver as a cohesive whole.

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| [`core`](./packages/core/README.md) | ✅ 22 tests | Base types, provider registry, error hierarchy |
| [`health`](./packages/health/README.md) | ✅ 23 tests | Component probes, orchestration, K8s-style liveness |
| [`logger`](./packages/logger/README.md) | ✅ 19 tests | Structured logging with levels, child loggers, backends |
| [`metrics`](./packages/metrics/README.md) | ✅ 21 tests | Counters, gauges, histograms with label support |
| [`monitor`](./packages/monitor/README.md) | ✅ 38 tests | Slow queries, deadlock detection, alerts, resource quotas |
| [`backup`](./packages/backup/README.md) | ✅ 30 tests | Backup orchestration, PITR, retention policies |
| [`maintenance`](./packages/maintenance/README.md) | ✅ 29 tests | VACUUM, ANALYZE, REINDEX scheduling |
| [`auth`](./packages/auth/README.md) | ✅ 32 tests | Authentication providers and credential management |
| [`security`](./packages/security/README.md) | ✅ 42 tests | TLS, encryption, RBAC, rate limiting, compliance |
| [`audit`](./packages/audit/README.md) | ✅ 20 tests | Immutable audit trails with export |
| [`observability`](./packages/observability/README.md) | ✅ 21 tests | Distributed tracing (W3C TraceContext), telemetry |

**Total: 866 tests, 29 test files, 0 failures.**

## Quick Start

```typescript
import { ProviderRegistry, token } from '@agentix-e/db-operations-core';
import { HealthOrchestrator } from '@agentix-e/db-operations-health';
import { InMemoryLogger } from '@agentix-e/db-operations-logger';
import { MetricsRegistry } from '@agentix-e/db-operations-metrics';

// 1. Create provider registry
const registry = new ProviderRegistry();

// 2. Register implementations
const ILogger = token<ILogger>('ILogger');
registry.register(ILogger, new InMemoryLogger({ level: 'info' }));
registry.register(token<MetricsRegistry>('MetricsRegistry'), new MetricsRegistry());

// 3. Build composed services
const orchestrator = new HealthOrchestrator(registry);
const status = await orchestrator.evaluateComponentHealth('database-1');
console.log('Health:', status);
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   db-operations Framework                │
├───────────┬──────────┬──────────┬──────────┬────────────┤
│   core    │  health  │  logger  │ metrics  │   ...      │
│  (types)  │ (lively) │ (format) │ (count)  │            │
├───────────┴──────────┴──────────┴──────────┴────────────┤
│                   Adapter Layer                          │
├──────────────────────┬──────────────────────────────────┤
│ SqlVecXxxAdapter     │ GraphVecXxxAdapter               │
│ (sqlvec-db bridge)   │ (graphvec-db bridge)             │
├──────────────────────┴──────────────────────────────────┤
│              Database Engines                            │
│  sqlvec-db  │  graphvec-db  │  future engines           │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Engine-Agnostic Core** — Zero dependency on any engine type.
2. **Interface-First Design** — Interfaces are stable contracts; implementations are adapters.
3. **Composability** — Small interfaces compose into higher-level orchestration.
4. **Pluggability** — Every interface has multiple implementations (InMemory, Noop, SqlVec, GraphVec).
5. **Production-Grade** — Error types, observability hooks, capacity inspection everywhere.

## Development

```bash
# Setup
git clone https://github.com/AgentiX-E/db-operations.git
cd db-operations
npm install

# Build
npm run build

# Test (all 866)
npm test

# Test a single package
npm test -- packages/core

# Clean
npm run clean
```

## License

MIT — see [LICENSE](./LICENSE)

## Author

[AgentiX Engineering](https://github.com/AgentiX-E)
