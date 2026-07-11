# db-operations — Unified Database Operations Framework

## Design Philosophy

db-operations is the **single abstraction layer** for all operational concerns across
Agentix-E's database engines (sqlvec-db, graphvec-db, and future engines).

It replaces the ad-hoc `ops/` directories in each project with a canonical,
engine-agnostic interface suite that both engines can implement via adapters.

### Guiding Principles

1. **Engine-Agnostic Core** — Zero dependency on any engine type. Operations are
   defined in terms of abstract primitives (storage, topology, query workload).

2. **Interface-First Design** — Interfaces are stable contracts. Implementations
   are adapters that bridge the gap between the generic interface and the
   engine-specific internals.

3. **Composability** — Small, focused interfaces compose into higher-level
   orchestration (e.g., `IHealthProbe` + `IComponentRegistrar` = `IHealthOrchestrator`).

4. **Pluggability** — Every interface can have multiple implementations:
   - `SqlVecXxxAdapter(sqlvec-internals)` — bridges to sqlvec-db
   - `GraphVecXxxAdapter(graphvec-internals)` — bridges to graphvec-db
   - `NoopXxx()` — no-op fallback for testing

5. **Production-Grade Everywhere** — Every interface includes error types,
   observability hooks, and capacity/state inspection methods.

### Package Architecture

```
db-operations/                    # Monorepo root
├── packages/
│   ├── core/                    # Base types, providers, registry
│   │   ├── src/
│   │   │   ├── types.ts          # Canonical type definitions
│   │   │   ├── provider.ts       # Provider pattern (IProviderRegistry)
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── health/                  # ✅ Health probes (K8s-style + deep)
│   │   ├── src/
│   │   │   ├── interfaces/       # IHealthProbe, IComponentRegistrar, IHealthOrchestrator
│   │   │   ├── index.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── metrics/                 # ✅ Metrics registry + exporters
│   ├── logger/                  # ✅ Structured logging with trace context
│   ├── backup/                  # ✅ Backup + PITR abstraction
│   ├── migration/               # ✅ Schema migration framework
│   ├── audit/                   # ✅ Audit log + export + SCIM sync
│   ├── security/                # ✅ TLS cert monitor, encryption, RBAC, rate limit
│   ├── monitoring/              # ✅ Slow query, deadlock, connection pool, alert rules, resource quota
│   ├── maintenance/             # ✅ VACUUM, ANALYZE, REINDEX
│   ├── import-export/           # ✅ Batch import/export (CSV, JSONL, NDJSON)
│   ├── replication/             # ✅ Cross-DC replication monitoring
│   ├── observability/           # ✅ Distributed tracing, telemetry
│   ├── scheduling/              # ✅ Cron/scheduler for periodic ops tasks
│   └── config/                  # ✅ Runtime config management
└── package.json
```

Packages marked with ✅ are the **Sprint 1 scope** — all existing operations
from graphvec-db and sqlvec-db are covered.

### Interface Categories

| Category | Interfaces | Existing in sqlvec-db | Existing in graphvec-db |
|----------|-----------|----------------------|------------------------|
| **Health** | IHealthProbe, IComponentRegistrar, IHealthOrchestrator | HealthCheckServer | Health class (K8s probes) |
| **Metrics** | IMetricsRegistry, ICounter, IHistogram, IGauge | PinoLogger + RaftMetrics + RouteMetrics | Metrics class + OTelMetrics |
| **Logger** | ILogger, ITraceContextProvider | PinoLogger | Logger class |
| **Backup** | IBackupManager, IPITRManager, IBackupScheduler, IStorageBackend, IBackupRetentionPolicy | PITRManager, PITRWriter, PITRReader, ContinuousWalArchiver, ParallelBackup | IncrementalBackupManager |
| **Migration** | IMigrationProvider, IMigrationExecutor | (via SQL schema migration) | (none yet) |
| **Audit** | IAuditStore, IAuditExporter | AuditLogger | AuditLog, AuditExporter |
| **Security** | ITLSManager, ICertMonitor, IEncryptionManager, IRBACProvider, IRateLimiter, ISCIMSyncProvider | (TLS via db-cluster) | CertMonitor, SecurityAuditor |
| **Monitoring** | ISlowQueryRecorder, IDeadlockDetector, IConnectionMonitor, IAlertRuleManager, IResourceQuotaManager | SlowQueryRecorder, DeadlockDetector | QuerySlowLog, AlertRules, ResourceQuota |
| **Maintenance** | IVacuumExecutor, IAnalyzeExecutor, IReindexExecutor | OpsCommands (VACUUM, ANALYZE, REINDEX) | (none directly) |
| **Import/Export** | IBatchImporter, IBatchExporter | (via pgwire COPY) | Importer, BatchIO |
| **Replication** | IReplicationLagMonitor | ReplicationLagMonitor | (via consensus-provider) |
| **Observability** | IDistributedTracer, ITelemetryExporter | DistributedTracer | (via OTel) |
| **Scheduling** | IScheduler | (none) | (none) |
| **Config** | IRuntimeConfigProvider | (env-based) | (env-based) |

### Adapter Pattern

Each engine provides adapter packages:

```
db-operations/packages/monitor/src/
  interfaces/     ← canonical interfaces (no engine deps)
  adapters/
    sqlvec/       ← SqlVecSlowQueryRecorder, SqlVecDeadlockDetector
    graphvec/     ← GraphVecSlowQueryRecorder, GraphVecDeadlockDetector
    noop/         ← NoopSlowQueryRecorder for testing
```

Adapters live inside db-operations because:
1. They have zero engine dependency — they accept engine-specific config at
   construction time
2. They can be tested standalone with mocks
3. They form the complete "batteries included" package
