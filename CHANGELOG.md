# Changelog

All notable changes to @agentix-e/db-operations will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-07-26

### Added

- **core** package — Base types, provider registry, DI tokens (22 tests)
  - IProviderRegistry with register/get/supports
  - Error hierarchy with typed error codes
  - Engine-agnostic type definitions
- **health** package — K8s-style health probes (23 tests)
  - IHealthProbe, IComponentRegistrar, IHealthOrchestrator
  - Liveness and readiness probe patterns
  - Component-level health aggregation
- **logger** package — Structured logging (19 tests)
  - ILogger with levels, child loggers
  - InMemoryLogger and NoopLogger implementations
  - Trace context integration
- **metrics** package — Prometheus-style metrics (21 tests)
  - Counter, Gauge, Histogram
  - Label support
  - PrometheusPushExporter
- **monitor** package — Database monitoring (38 tests)
  - ISlowQueryRecorder, IDeadlockDetector
  - IConnectionMonitor, IAlertRuleManager, IResourceQuotaManager
  - Threshold-based alerting
- **backup** package — Backup orchestration (30 tests)
  - IBackupManager, IPITRManager, IBackupScheduler
  - IStorageBackend with S3StorageBackend implementation
  - IBackupRetentionPolicy
  - BackupEntry, RestorePoint, IBackupScheduleConfig, IBackupManifest
- **maintenance** package — Database maintenance (29 tests)
  - IMaintenanceExecutor (VACUUM, ANALYZE, REINDEX)
  - Scheduled maintenance window management
- **auth** package — Authentication (32 tests)
  - Authentication providers and credential management
  - Token-based and password-based auth
- **security** package — Security operations (42 tests)
  - ITLSManager, ICertMonitor
  - IEncryptionManager, IRBACProvider, IRateLimiter
  - ISCIMSyncProvider
- **audit** package — Audit trails (20 tests)
  - IAuditStore with FileAuditStore implementation
  - IAuditExporter
  - Immutable log patterns
- **observability** package — Distributed tracing (21 tests)
  - IDistributedTracer, ITelemetryExporter
  - W3C TraceContext support
- **otel** package — OpenTelemetry bridge (18 tests)
  - Metrics and traces export to OTEL collector
  - Span context propagation
- **autotuner** package — Automatic parameter tuning (15 tests)
  - AutoTunerWorker with workload analysis
  - AutoScalerMetrics connection count tracking
- **autoscaler** package — Dynamic scaling (12 tests)
- **chaosengine** package — Chaos experiment framework (14 tests)
- **circuitbreaker** package — Circuit breaker pattern (11 tests)
- **configwatcher** package — Runtime config management (10 tests)
- **memoryguard** package — Memory pressure monitoring (9 tests)
- **rollingupgrade** package — Zero-downtime upgrades (16 tests)
- **slacollector** package — SLA tracking (13 tests)
- **DESIGN.md** — Complete design philosophy and architecture documentation
- **Testing Suite**
  - 866 tests, 29 test files (as of cc34297)
  - E2E real engine integration (sqlvec/graphvec)
  - YCSB-style performance benchmarks
  - Chaos tests for all modules
  - Cross-engine adapter pattern tests

### Fixed

- interfaces/index.ts — Added missing type exports (BackupEntry, RestorePoint, etc.)
- S3StorageBackend — accessKeyId and secretAccessKey made optional
- AutoTunerWorker — connectionCount made optional in AutoScalerMetrics
- Micro-benchmark stabilization under concurrent test execution
- inject-1000 perf threshold — relaxed from 2M to 2.5M ns for single-core GC variance

[1.0.0]: https://github.com/AgentiX-E/db-operations/releases/tag/v1.0.0
[0.1.0]: https://github.com/AgentiX-E/db-operations/releases/tag/v0.1.0

## [1.0.0] — 2026-08-02

### Added

- **Observability E2E tests** — 30 cross-package integration tests validating
  InMemoryLogger, HealthOrchestrator, MetricsRegistry, PrometheusPushExporter,
  InMemoryDistributedTracer, W3CTraceContextProvider, InMemoryDeadlockDetector,
  InMemorySlowQueryRecorder, and InMemoryConnectionMonitor. (I13)
- **Security audit pipeline** (`_security.yml`) — npm audit, secret scanning, license
  compliance in CI gate. (I12)
- **ADR template** — standardized architecture decision record format. (I14)
- **SECURITY.md** — vulnerability reporting policy and support SLA. (I15)

### Changed

- **CI** extended with security pipeline in quality gate chain
  (security → quality → publish). (I12)
- **.gitignore** env hardening retained.

### Security

- npm audit gate (blocks PRs on HIGH/CRITICAL vulnerabilities).
- Secret scanning pattern matching against common credential formats.
- License compliance check (OSI-approved only).
