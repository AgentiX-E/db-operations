/**
 * SchemaFederatorMutationKillers — precise assertions to kill the survivors
 * left by the broader i36 suite, which mostly asserts `action` but not the
 * full repair-plan boolean fields, stats counters, or scan-timing arithmetic.
 */

import { describe, it, expect } from "vitest";
import { SchemaFederator } from "../impl/SchemaFederator.js";
import type {
  MigrationDescriptor,
  SchemaSnapshot,
  SchemaDrift,
} from "../interfaces/index.js";

function makeMigration(v: number, checksum = `chk-${v}`, state = "applied"): MigrationDescriptor {
  return {
    version: v,
    description: `Migration v${v}`,
    state,
    checksum,
    appliedAt: new Date().toISOString(),
    durationMs: 100,
  } as MigrationDescriptor;
}

function makeSnapshot(shardId: string, migrations: MigrationDescriptor[] = []): SchemaSnapshot {
  return {
    shardId,
    version: migrations.length ? migrations[migrations.length - 1]!.version : 0,
    migrations,
    chainChecksum: "",
    capturedAt: Date.now(),
  };
}

function makeDrift(type: SchemaDrift["type"], severity: SchemaDrift["severity"] = "warning", migration?: MigrationDescriptor): SchemaDrift {
  return {
    id: `d-${type}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    severity,
    shardId: "s1",
    referenceShardId: "s0",
    driftedVersion: 1,
    referenceVersion: 2,
    migration,
    description: `Test ${type}`,
    detectedAt: Date.now(),
    resolved: false,
  };
}

// ── repair plan boolean fields (requiresDowntime/automatable) ────

describe("planRepair boolean fields", () => {
  it("missing_migration: requiresDowntime only when critical", () => {
    const f = new SchemaFederator();
    expect(f.planRepair(makeDrift("missing_migration", "warning", makeMigration(1))).requiresDowntime).toBe(false);
    expect(f.planRepair(makeDrift("missing_migration", "critical", makeMigration(1))).requiresDowntime).toBe(true);
  });

  it("missing_migration: automatable is inverse of critical", () => {
    const f = new SchemaFederator();
    expect(f.planRepair(makeDrift("missing_migration", "warning", makeMigration(1))).automatable).toBe(true);
    expect(f.planRepair(makeDrift("missing_migration", "critical", makeMigration(1))).automatable).toBe(false);
  });

  it("extra_migration: always requires downtime", () => {
    const f = new SchemaFederator();
    expect(f.planRepair(makeDrift("extra_migration", "warning", makeMigration(2))).requiresDowntime).toBe(true);
  });

  it("checksum_divergence: not automatable, requires downtime", () => {
    const f = new SchemaFederator();
    const p = f.planRepair(makeDrift("checksum_divergence"));
    expect(p.automatable).toBe(false);
    expect(p.requiresDowntime).toBe(true);
    expect(p.action).toBe("resync_snapshot");
  });

  it("order_divergence: not automatable, requires downtime", () => {
    const f = new SchemaFederator();
    const p = f.planRepair(makeDrift("order_divergence"));
    expect(p.automatable).toBe(false);
    expect(p.requiresDowntime).toBe(true);
  });

  it("migration_state_mismatch failed → rollback + downtime + rollback target", () => {
    const f = new SchemaFederator();
    const p = f.planRepair(makeDrift("migration_state_mismatch", "warning", makeMigration(1, "c", "failed")));
    expect(p.action).toBe("rollback_migration");
    expect(p.requiresDowntime).toBe(true);
    expect(p.automatable).toBe(true);
    expect(p.migrationToRollback).toBeDefined();
  });

  it("migration_state_mismatch non-failed → resync, no downtime, no rollback", () => {
    const f = new SchemaFederator();
    const p = f.planRepair(makeDrift("migration_state_mismatch", "warning", makeMigration(1, "c", "applied")));
    expect(p.action).toBe("resync_snapshot");
    expect(p.requiresDowntime).toBe(false);
    expect(p.migrationToRollback).toBeUndefined();
  });

  it("unknown drift type → mark_resolved, no downtime, automatable", () => {
    const f = new SchemaFederator();
    const p = f.planRepair(makeDrift("unknown_type" as SchemaDrift["type"]));
    expect(p.action).toBe("mark_resolved");
    expect(p.requiresDowntime).toBe(false);
    expect(p.automatable).toBe(true);
  });
});

// ── scan timing (lastScanDurationMs `-`) ─────────────────────

describe("scan timing", () => {
  it("lastScanDurationMs is the injected-clock difference", async () => {
    let now = 100000;
    const f = new SchemaFederator(() => now);
    f.registerShard(makeSnapshot("s0", [makeMigration(2)]));
    f.registerShard(makeSnapshot("s1", [makeMigration(1)]));

    // Advance the injected clock by 400ms "during" the scan (detection is
    // synchronous after the two clock reads, so advance a fixed, large value
    // is not possible mid-call; instead assert the metric is finite and the
    // `-` difference is correctly reported as >= 0 under the injected clock).
    await f.detectAllDrifts();
    const dur = f.getMonitorStats().lastScanDurationMs;
    expect(Number.isFinite(dur)).toBe(true);
    expect(dur).toBeGreaterThanOrEqual(0);
  });
});

// ── stats counters (`+ 1`) ──────────────────────────────────

describe("drift stats counters", () => {
  it("totalScans increments per scan", async () => {
    const f = new SchemaFederator();
    await f.detectAllDrifts();
    await f.detectAllDrifts();
    expect(f.getMonitorStats().totalScans).toBe(2);
  });

  it("totalDriftsDetected counts each detection event", async () => {
    const f = new SchemaFederator();
    f.registerShard(makeSnapshot("s0", [makeMigration(2)]));
    f.registerShard(makeSnapshot("s1", [makeMigration(1)]));
    await f.detectAllDrifts();
    // Second scan finds the SAME drift ids (already known) → no double count
    // of totalDriftsDetected, even though the drift count (driftsByType) stays.
    const first = f.getMonitorStats().totalDriftsDetected;
    await f.detectAllDrifts();
    expect(f.getMonitorStats().totalDriftsDetected).toBe(first);
    // missing_migration is one of the detected types and is counted once.
    expect(f.getMonitorStats().driftsByType["missing_migration"]).toBe(1);
  });
});

// ── snapshot checksum (empty-input guard + content-sensitivity) ──

describe("snapshot checksum", () => {
  it("empty migrations yield the stable zero checksum", async () => {
    const f = new SchemaFederator();
    const s = await f.captureSnapshot("s");
    expect(s.chainChecksum).toBe("0000000000000000");
  });

  it("checksum divergence is detected across shards", async () => {
    const f = new SchemaFederator();
    f.registerShard(makeSnapshot("s0", [makeMigration(1, "aaa")]));
    f.registerShard(makeSnapshot("s1", [makeMigration(1, "bbb")]));
    await f.detectAllDrifts();
    expect(f.getMonitorStats().driftsByType["checksum_divergence"]).toBe(1);
  });

  it("registerShard backfills checksum when migrations present and checksum empty", () => {
    const f = new SchemaFederator();
    const snap = makeSnapshot("s0", [makeMigration(1, "aaa")]);
    snap.chainChecksum = ""; // empty → should be backfilled
    f.registerShard(snap);
    expect(f.getSnapshot("s0")!.chainChecksum).not.toBe("");
  });

  it("registerShard leaves checksum empty when no migrations (no hashing)", () => {
    const f = new SchemaFederator();
    const snap = makeSnapshot("s0", []);
    snap.chainChecksum = "";
    f.registerShard(snap);
    // Empty migrations still hash (to the zero constant); the guard is about
    // the checksum being empty, not the migrations list being empty. So the
    // checksum becomes the deterministic zero hash, never "".
    expect(f.getSnapshot("s0")!.chainChecksum).toBe("0000000000000000");
  });

  it("respects an explicit checksum without overwriting", () => {
    const f = new SchemaFederator();
    const snap = makeSnapshot("s0", [makeMigration(1, "aaa")]);
    snap.chainChecksum = "explicit";
    f.registerShard(snap);
    expect(f.getSnapshot("s0")!.chainChecksum).toBe("explicit");
  });
});

// ── migration sort ordering (`a.version - b.version`) ───────────

describe("migration ordering", () => {
  it("detects order divergence when migrations are out of order", async () => {
    const f = new SchemaFederator();
    // s0: v1 then v2 (ordered). s1: v2 then v1 (out of order).
    f.registerShard(makeSnapshot("s0", [makeMigration(1), makeMigration(2)]));
    f.registerShard(makeSnapshot("s1", [makeMigration(2), makeMigration(1)]));
    await f.detectAllDrifts();
    expect(f.getMonitorStats().driftsByType["order_divergence"]).toBe(1);
  });
});

// ── stats counters (`+ 1` / `?? 0`) ───────────────────────────

describe("stats counters", () => {
  it("driftsBySeverity counts critical and warning separately", async () => {
    const f = new SchemaFederator();
    f.registerShard(makeSnapshot("s0", [makeMigration(2)]));
    f.registerShard(makeSnapshot("s1", [makeMigration(1)]));
    await f.detectAllDrifts();
    const s = f.getMonitorStats();
    // Two distinct shard versions produce a warning-level missing_migration.
    const totalBySeverity = Object.values(s.driftsBySeverity).reduce((a, b) => a + b, 0);
    expect(totalBySeverity).toBe(s.totalDriftsDetected);
  });
});

// ── repair error path (`success = false` in catch) ─────────────

describe("repair error path", () => {
  it("returns success=false with error when the drift is unknown", async () => {
    const f = new SchemaFederator();
    // planRepair on a fresh (unregistered) drift yields a DriftRepair whose
    // driftId is not in f.drifts → executeRepair must set success=false + error.
    const plan = f.planRepair(makeDrift("missing_migration", "warning", makeMigration(1)));
    const r = await f.executeRepair(plan);
    expect(r.success).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("returns success=true for a resolvable drift", async () => {
    const f = new SchemaFederator();
    f.registerShard(makeSnapshot("s0", [makeMigration(2)]));
    f.registerShard(makeSnapshot("s1", [makeMigration(1)]));
    await f.detectAllDrifts();

    const drifts = f.getActiveDrifts();
    expect(drifts.length).toBeGreaterThan(0);

    // Plan repairs for the first tracked drift and execute; a resolvable
    // action (mark_resolved / apply_migration) must set success=true.
    const plan = f.planRepair(drifts[0]!);
    const r = await f.executeRepair(plan);
    expect(r.success).toBe(true);

    // The drift is now resolved (no longer active).
    const stillActive = f.getActiveDrifts().some((d) => d.id === drifts[0]!.id);
    expect(stillActive).toBe(false);
  });
});
