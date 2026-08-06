/**
 * E2E Full Lifecycle Test — E2E1 through E2E9
 *
 * Simulates a complete database operations lifecycle end-to-end across all
 * 21 packages in a single orchestrated flow:
 *
 *   E2E1  Cluster Bootstrap    → Health + Metrics + Logger init
 *   E2E2  Authentication       → RBAC role registration + permission check
 *   E2E3  Encryption Setup     → Key initialization + encrypt/decrypt cycle
 *   E2E4  Live Backup          → Create full backup → verify metadata
 *   E2E5  Rolling Upgrade      → Execute full batch upgrade with pre/post scripts
 *   E2E6  Maintenance Run      → Vacuum + analyze + reindex sequence
 *   E2E7  Circuit Breaker      → Trip/recover cycle with fallback
 *   E2E8  Audit Integrity      → Query audit trail for lifecycle events
 *   E2E9  Full Lifecycle       → Bootstrap→encrypt→backup→upgrade→maintain→audit in one test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IntegratedFactory } from "./integrated-factory.js";
import type { UpgradePlan } from "@agentix-e/db-operations-rollingupgrade";
import type { Identity } from "@agentix-e/db-operations-security";
import { componentProbe } from "@agentix-e/db-operations-health";

describe("E2E: Full Operational Lifecycle", () => {
  let factory: IntegratedFactory;

  beforeEach(() => {
    factory = new IntegratedFactory();
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E1 — Cluster Bootstrap: Health + Metrics + Logger
  // ═══════════════════════════════════════════════════════════════

  it("E2E1: health orchestrator reports ready after bootstrap", () => {
    const health = factory.getHealthOrchestrator();
    const metrics = factory.getMetricsRegistry();
    const logger = factory.getLogger();

    // Register component probes
    health.registerComponent(
      componentProbe("db-engine", "DB Engine", {
        liveness: () => ({ ok: true }),
        readiness: () => ({ ok: true }),
      }),
    );
    health.registerComponent(
      componentProbe("storage-engine", "Storage Engine", {
        liveness: () => ({ ok: true }),
        readiness: () => ({ ok: true }),
      }),
    );

    // Liveness and readiness
    const live = health.liveness();
    expect(live.ok).toBe(true);

    const ready = health.readiness();
    expect(ready.ok).toBe(true);

    // Structured status
    const status = health.getHealthStatus();
    expect(status.status).toBeDefined();
    expect(status.components.length).toBeGreaterThanOrEqual(2);

    // Aggregate status
    const aggregate = health.getAggregateStatus();
    expect(["healthy", "degraded", "unhealthy"]).toContain(aggregate.status);

    // Metrics registry is operational
    expect(metrics.snapshot()).toBeDefined();

    // Logger can record structured events
    logger.info({ nodes: 3 }, "cluster-bootstrap");
    const logged = logger.getEntries();
    expect(logged.length).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E2 — RBAC bootstrap
  // ═══════════════════════════════════════════════════════════════

  it("E2E2: auth + RBAC roles grant permissions after bootstrap", () => {
    const rbac = factory.getRBACProvider();

    // Register operational roles
    rbac.registerRole({
      name: "db-admin",
      permissions: [
        { resource: "backup", action: "admin" },
        { resource: "maintenance", action: "admin" },
        { resource: "health", action: "read" },
      ],
    });
    rbac.registerRole({
      name: "db-reader",
      permissions: [{ resource: "health", action: "read" }],
    });

    const admin: Identity = { id: "ops-admin-001", roles: ["db-admin"] };
    const reader: Identity = { id: "readonly-user", roles: ["db-reader"] };

    expect(rbac.hasPermission(admin, { resource: "backup", action: "admin" })).toBe(true);
    expect(rbac.hasPermission(admin, { resource: "maintenance", action: "admin" })).toBe(true);

    expect(rbac.hasPermission(reader, { resource: "health", action: "read" })).toBe(true);
    expect(rbac.hasPermission(reader, { resource: "backup", action: "admin" })).toBe(false);

    expect(rbac.getRoles().length).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E3 — Encryption Setup
  // ═══════════════════════════════════════════════════════════════

  it("E2E3: encryption initialize → encrypt → decrypt round-trip", async () => {
    const enc = factory.getEncryptionManager();
    await enc.initialize({ algorithm: "aes-256-gcm", keySize: 256 });

    const plaintext = Buffer.from("critical-secret-data-for-cluster-ops");
    const ciphertext = await enc.encrypt(plaintext);
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(ciphertext.equals(plaintext)).toBe(false);

    const recovered = await enc.decrypt(ciphertext);
    expect(recovered.toString()).toBe("critical-secret-data-for-cluster-ops");

    // Deterministic XOR: encrypt twice yields same result
    const ciphertext2 = await enc.encrypt(plaintext);
    expect(ciphertext2.equals(ciphertext)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E4 — Live Backup
  // ═══════════════════════════════════════════════════════════════

  it("E2E4: backup create → list → get → verify metadata", async () => {
    const backup = factory.createBackupManager();
    const enc = factory.getEncryptionManager();
    await enc.initialize({ algorithm: "aes-256-gcm", keySize: 256 });

    // Encrypt payload for backup
    const payload = await enc.encrypt(Buffer.from("e2e-backup-payload-v1"));
    expect(payload.length).toBeGreaterThan(0);

    // Create full backup
    const result = await backup.createBackup({ type: "full" });
    expect(result.success).toBe(true);
    expect(result.snapshot).toBeTruthy();
    const snapshotId = result.snapshot!.snapshotId;

    // List: backup appears in inventory
    const list = await backup.listBackups();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((b) => b.snapshotId === snapshotId)).toBe(true);

    // Get: retrieve by ID
    const meta = await backup.getBackup(snapshotId);
    expect(meta).not.toBeNull();
    expect(meta!.type).toBe("full");
    expect(meta!.snapshotId).toBe(snapshotId);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E5 — Rolling Upgrade
  // ═══════════════════════════════════════════════════════════════

  it("E2E5: rolling upgrade executes full batch sequence", async () => {
    const upgrade = factory.createRollingUpgrade();
    const health = factory.getHealthOrchestrator();

    // Register nodes as health components
    for (const node of ["db-node-01", "db-node-02", "db-node-03", "db-node-04"]) {
      health.registerComponent(
        componentProbe(node, `Node ${node}`, {
          liveness: () => ({ ok: true }),
          readiness: () => ({ ok: true }),
        }),
      );
    }

    const plan: UpgradePlan = {
      nodes: ["db-node-01", "db-node-02", "db-node-03", "db-node-04"],
      batchSize: 2,
      preScript: "lock-connections.sh",
      postScript: "unlock-connections.sh",
    };

    const phases = await upgrade.execute(plan);

    // Pre/post scripts both executed
    expect(phases.some((p) => p.step.includes("lock-connections.sh"))).toBe(true);
    expect(phases.some((p) => p.step.includes("unlock-connections.sh"))).toBe(true);

    // 4 nodes / 2 batch = 2 batches × 2 phases (running+completed) = 4 batch entries
    const batchPhases = phases.filter((p) => p.step.startsWith("upgrade-batch-"));
    expect(batchPhases.length).toBe(4);

    // Health orchestrator still functional
    const componentHealth = health.getComponentHealth();
    expect(componentHealth.length).toBeGreaterThanOrEqual(4);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E6 — Maintenance Run
  // ═══════════════════════════════════════════════════════════════

  it("E2E6: maintenance vacuum → analyze → reindex after upgrade", async () => {
    const maint = factory.createMaintenanceExecutor();

    const vacuumResult = await maint.vacuum({ tables: ["users", "sessions"] });
    expect(vacuumResult.success).toBe(true);
    expect(vacuumResult.operation).toBe("VACUUM");

    const analyzeResult = await maint.analyze({ tables: ["users"] });
    expect(analyzeResult.success).toBe(true);
    expect(analyzeResult.operation).toBe("ANALYZE");

    const reindexResult = await maint.reindex({ index: "idx_users_email" });
    expect(reindexResult.success).toBe(true);
    expect(reindexResult.operation).toBe("REINDEX");

    // Storage stats
    const stats = await maint.getStorageStats("default");
    expect(stats).toBeDefined();
    expect(typeof stats.fileSizeBytes).toBe("number");
    expect(typeof stats.rowCount).toBe("number");

    // Index fragmentation
    const frag = await maint.getIndexFragmentation("idx_users_email");
    expect(Array.isArray(frag)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E7 — Circuit Breaker Lifecycle
  // ═══════════════════════════════════════════════════════════════

  it("E2E7: circuit breaker trip → fallback → reset cycle", async () => {
    const cb = factory.createCircuitBreaker("db-gateway", {
      failureThreshold: 2,
      timeoutMs: 100,
    });

    // Normal operation
    expect(cb.getState()).toBe("closed");
    const result = await cb.call(async () => "healthy-response");
    expect(result).toBe("healthy-response");

    // Trip: 2 failures
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe("open");

    // Open: call with fallback → fallback fires
    const fallbackResult = await cb.call(
      async () => "dead-letter",
      async () => "fallback-response",
    );
    expect(fallbackResult).toBe("fallback-response");

    // Reset to closed
    cb.reset();
    expect(cb.getState()).toBe("closed");
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E8 — Audit Integrity
  // ═══════════════════════════════════════════════════════════════

  it("E2E8: audit trail captures cross-package lifecycle events", async () => {
    const audit = factory.getAuditStore();

    await audit.write({
      operation: "CLUSTER_BOOTSTRAP",
      actor: "system",
      resource: "cluster",
      result: "success",
    });
    await audit.write({
      operation: "BACKUP_CREATED",
      actor: "ops-admin",
      resource: "backup",
      result: "success",
    });
    await audit.write({
      operation: "UPGRADE_ROLLING",
      actor: "ops-admin",
      resource: "cluster",
      result: "success",
    });
    await audit.write({
      operation: "MAINTENANCE_RUN",
      actor: "system",
      resource: "maintenance",
      result: "success",
    });

    const entries = await audit.query({});
    expect(entries.length).toBeGreaterThanOrEqual(4);

    const operations = entries.map((e: any) => e.operation);
    expect(operations).toContain("CLUSTER_BOOTSTRAP");
    expect(operations).toContain("BACKUP_CREATED");
    expect(operations).toContain("UPGRADE_ROLLING");
    expect(operations).toContain("MAINTENANCE_RUN");

    const count = await audit.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Get by ID
    const id = entries[0]!.id;
    const single = await audit.get(id);
    expect(single).not.toBeNull();
    expect(single!.id).toBe(id);
  });

  // ═══════════════════════════════════════════════════════════════
  // E2E9 — Full Lifecycle in One Test
  // ═══════════════════════════════════════════════════════════════

  it("E2E9: complete lifecycle — bootstrap → encrypt → backup → upgrade → maintain → audit in sequence", async () => {
    const health = factory.getHealthOrchestrator();
    const metrics = factory.getMetricsRegistry();
    const enc = factory.getEncryptionManager();
    const rbac = factory.getRBACProvider();
    const backup = factory.createBackupManager();
    const upgrade = factory.createRollingUpgrade();
    const maint = factory.createMaintenanceExecutor();
    const cb = factory.createCircuitBreaker("lifecycle-cb", {
      failureThreshold: 2,
      timeoutMs: 100,
    });
    const audit = factory.getAuditStore();
    const logger = factory.getLogger();
    const tracer = factory.getTracer();

    // ── 1. Bootstrap ───────────────────────────────────
    health.registerComponent(
      componentProbe("node-1", "Primary Node", {
        liveness: () => ({ ok: true }),
        readiness: () => ({ ok: true }),
      }),
    );
    const live = health.liveness();
    expect(live.ok).toBe(true);

    // ── 2. RBAC ───────────────────────────────────────
    rbac.registerRole({
      name: "lifecycle-admin",
      permissions: [
        { resource: "backup", action: "admin" },
        { resource: "maintenance", action: "admin" },
        { resource: "health", action: "read" },
      ],
    });
    const adminId: Identity = { id: "lifecycle-admin", roles: ["lifecycle-admin"] };
    expect(rbac.hasPermission(adminId, { resource: "backup", action: "admin" })).toBe(true);

    // ── 3. Encryption ─────────────────────────────────
    await enc.initialize({ algorithm: "aes-256-gcm", keySize: 256 });
    const secret = await enc.encrypt(Buffer.from("lifecycle-secret"));
    const recovered = await enc.decrypt(secret);
    expect(recovered.toString()).toBe("lifecycle-secret");

    // ── 4. Backup ─────────────────────────────────────
    const backupResult = await backup.createBackup({ type: "full" });
    expect(backupResult.success).toBe(true);
    expect(backupResult.snapshot).toBeTruthy();

    // ── 5. Rolling Upgrade ────────────────────────────
    const plan: UpgradePlan = {
      nodes: ["node-1", "node-2"],
      batchSize: 1,
      preScript: "pre.sh",
      postScript: "post.sh",
    };
    const upgradePhases = await upgrade.execute(plan);
    const completedUpgrade = upgradePhases.filter((p) => p.status === "completed");
    expect(completedUpgrade.length).toBeGreaterThanOrEqual(2);

    // ── 6. Maintenance ────────────────────────────────
    const vacuumResult = await maint.vacuum({ tables: ["lifecycle_data"] });
    expect(vacuumResult.success).toBe(true);
    expect(vacuumResult.operation).toBe("VACUUM");

    // ── 7. Circuit Breaker ────────────────────────────
    expect(cb.getState()).toBe("closed");
    cb.onFailure();
    cb.onFailure(); // trip after 2 (default threshold)
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");

    // ── 8. Audit ──────────────────────────────────────
    await audit.write({
      operation: "LIFECYCLE_COMPLETE",
      actor: "system",
      resource: "cluster",
      result: "success",
    });
    const entries = await audit.query({});
    expect(entries.some((e: any) => e.operation === "LIFECYCLE_COMPLETE")).toBe(true);

    // ── 9. Metrics ────────────────────────────────────
    const meter = metrics.counter("lifecycle.ops");
    expect(meter).toBeDefined();

    // ── 10. Tracing ──────────────────────────────────
    const span = tracer.startSpan("e2e.lifecycle");
    span.end();
    expect(tracer.getCompletedSpans().length).toBeGreaterThanOrEqual(1);

    // ── 11. Connection Monitor ────────────────────────
    const connMon = factory.getConnectionMonitor();
    expect(connMon).toBeDefined();

    // ── 12. Deadlock Detector ─────────────────────────
    const deadlock = factory.getDeadlockDetector();
    expect(deadlock).toBeDefined();

    // ── 13. Slow Query Recorder ───────────────────────
    const slowQuery = factory.getSlowQueryRecorder();
    expect(slowQuery).toBeDefined();

    // ── 14. Alert Rule Manager ────────────────────────
    const alertMgr = factory.getAlertRuleManager();
    expect(alertMgr).toBeDefined();

    // ── Verification log ─────────────────────────────
    logger.info(
      {
        phases: [
          "bootstrap", "rbac", "encryption", "backup",
          "upgrade", "maintenance", "circuit-breaker",
          "audit", "metrics", "tracing", "monitoring",
        ],
      },
      "lifecycle-complete",
    );

    const allLogs = logger.getEntries();
    const lifecycleLogs = allLogs.filter((l: any) => l.message === "lifecycle-complete");
    expect(lifecycleLogs.length).toBeGreaterThanOrEqual(1);
  });
});
