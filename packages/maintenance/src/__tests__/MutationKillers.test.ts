/**
 * MutationKillers — Targeted tests for InMemoryMaintenanceExecutor survivors.
 *
 * Covers: vacuum dryRun/full, reindex fragmentation/pageCount,
 * getIndexFragmentation filtering, opsLog, constructor overrides,
 * NoopMaintenanceExecutor, getAutoVacuumStatus.
 *
 * @module @agentix-e/db-operations-maintenance/__tests__
 */

import { describe, it, expect } from "vitest";
import { InMemoryMaintenanceExecutor } from "../impl/InMemoryMaintenanceExecutor.js";
import { NoopMaintenanceExecutor } from "../impl/NoopMaintenanceExecutor.js";

function fresh(): InMemoryMaintenanceExecutor {
  return new InMemoryMaintenanceExecutor();
}

describe("M-M: InMemoryMaintenanceExecutor", () => {
  // --- vacuum ---

  it("M1: vacuum dryRun does not mutate internal state", async () => {
    const m = fresh();
    await m.vacuum({ target: "*", dryRun: true });
    const stats = await m.getStorageStats("*");
    expect(stats.freeSpaceRatio).toBe(0.3);
    expect(stats.deadRowCount).toBe(150_000);
    expect(m.opsLog.length).toBe(1);
  });

  it("M2: vacuum reduces freeSpaceRatio and deadRowCount", async () => {
    const m = fresh();
    const result = await m.vacuum({ target: "*" });
    const stats = await m.getStorageStats("*");
    expect(result.success).toBe(true);
    expect(stats.freeSpaceRatio).toBe(0.05);
    expect(stats.deadRowCount).toBe(10_000);
  });

  it("M3: full vacuum additionally reduces pageCount and fileSize", async () => {
    const m = fresh();
    const before = await m.getStorageStats("*");
    await m.vacuum({ target: "*", full: true });
    const after = await m.getStorageStats("*");
    // full vacuum reduces page count
    expect(after.pageCount).toBeLessThan(before.pageCount);
    // fileSize = pageCount * pageSize
    expect(after.fileSizeBytes).toBe(after.pageCount * after.pageSize);
  });

  it("M4: vacuum deadRowCount floor boundary", async () => {
    // M2 already verifies 150k→10k (150k-140k = 10k)
    const m = fresh();
    // Run vacuum twice — deadRowCount should stay at 0, not go negative
    await m.vacuum({ target: "*" });
    await m.vacuum({ target: "*" });
    const stats = await m.getStorageStats("*");
    expect(stats.deadRowCount).toBeGreaterThanOrEqual(0);
  });

  it("M5: vacuum freeSpaceRatio floor boundary", async () => {
    const m = fresh();
    // Run vacuum 3 times — freeSpaceRatio should be 0, not negative
    await m.vacuum({ target: "*" });
    await m.vacuum({ target: "*" });
    await m.vacuum({ target: "*" });
    const stats = await m.getStorageStats("*");
    expect(stats.freeSpaceRatio).toBeGreaterThanOrEqual(0);
  });

  // --- analyze ---

  it("M6: analyze returns success", async () => {
    const m = fresh();
    const r = await m.analyze({ target: "users" });
    expect(r.success).toBe(true);
    expect(r.operation).toBe("ANALYZE");
    expect(r.target).toBe("users");
  });

  it("M7: analyze dryRun flag in details", async () => {
    const m = fresh();
    const r = await m.analyze({ target: "orders", dryRun: true });
    expect(r.details.dryRun).toBe(true);
    expect(m.opsLog.length).toBe(1);
  });

  // --- reindex ---

  it("M8: reindex reduces fragmentation for matching index", async () => {
    const m = fresh();
    const before = await m.getIndexFragmentation("idx_users_email");
    expect(before[0].fragmentationRatio).toBe(0.45);
    await m.reindex({ target: "idx_users_email" });
    const after = await m.getIndexFragmentation("idx_users_email");
    expect(after[0].fragmentationRatio).toBe(0.045);
  });

  it("M9: reindex reduces pageCount for matching index", async () => {
    const m = fresh();
    const before = await m.getIndexFragmentation("idx_users_email");
    expect(before[0].pageCount).toBe(1200);
    await m.reindex({ target: "idx_users_email" });
    const after = await m.getIndexFragmentation("idx_users_email");
    expect(after[0].pageCount).toBe(840);
  });

  it("M10: reindex table flag matches all table indexes", async () => {
    const m = fresh();
    // Original: idx_orders_user_id (0.33), idx_orders_created_at (0.18)
    await m.reindex({ target: "orders", isTable: true });
    const frags = await m.getIndexFragmentation("orders");
    expect(frags.length).toBe(2);
    for (const f of frags) {
      expect(f.fragmentationRatio).toBeLessThan(0.1);
      expect(f.pageCount).toBeLessThanOrEqual(3400);
    }
  });

  it("M11: reindex fragmentation floor boundary", async () => {
    const m = fresh();
    await m.reindex({ target: "idx_products_name" }); // 0.05 → 0.005
    await m.reindex({ target: "idx_products_name" }); // → 0.0012 → floor 0.02
    const after = await m.getIndexFragmentation("idx_products_name");
    // Never below 0.02 (Math.max guard)
    expect(after[0].fragmentationRatio).toBeGreaterThanOrEqual(0.02);
  });

  it("M12: reindex pageCount floor boundary", async () => {
    const m = fresh();
    // hit a small-frag index multiple times — pageCount should floor at 10
    for (let i = 0; i < 10; i++) {
      await m.reindex({ target: "idx_products_name" });
    }
    const after = await m.getIndexFragmentation("idx_products_name");
    expect(after[0].pageCount).toBeGreaterThanOrEqual(10);
  });

  // --- getStorageStats ---

  it("M13: getStorageStats returns defaults", async () => {
    const m = fresh();
    const s = await m.getStorageStats("x");
    expect(s.fileSizeBytes).toBe(104_857_600);
    expect(s.pageCount).toBe(25_600);
    expect(s.rowCount).toBe(1_000_000);
  });

  it("M14: getStorageStats after vacuum", async () => {
    const m = fresh();
    await m.vacuum({ target: "*" });
    const s = await m.getStorageStats("anything");
    expect(s.freeSpaceRatio).toBe(0.05);
  });

  // --- getIndexFragmentation ---

  it("M15: filter by table name", async () => {
    const m = fresh();
    const frags = await m.getIndexFragmentation("orders");
    expect(frags.length).toBe(2);
  });

  it("M16: filter by index name", async () => {
    const m = fresh();
    const frags = await m.getIndexFragmentation("idx_products_name");
    expect(frags.length).toBe(1);
  });

  it("M17: wildcard '*' returns all", async () => {
    const m = fresh();
    const frags = await m.getIndexFragmentation("*");
    expect(frags.length).toBe(4);
  });

  it("M18: unknown target returns empty array", async () => {
    const m = fresh();
    const frags = await m.getIndexFragmentation("nonexistent");
    expect(frags.length).toBe(0);
    expect(Array.isArray(frags)).toBe(true);
  });

  // --- getAutoVacuumStatus ---

  it("M19: default autoVacuum is enabled", () => {
    const m = fresh();
    const s = m.getAutoVacuumStatus();
    expect(s.enabled).toBe(true);
    expect(s.threshold).toBe(200);
  });

  it("M20: custom autoVacuum constructor", () => {
    const m = new InMemoryMaintenanceExecutor(undefined, undefined, false, 500);
    const s = m.getAutoVacuumStatus();
    expect(s.enabled).toBe(false);
    expect(s.threshold).toBe(500);
  });

  it("M21: autoVacuum enabled=undefined defaults to true", () => {
    // third param omitted → defaults to true
    const m = new InMemoryMaintenanceExecutor(undefined, undefined);
    expect(m.getAutoVacuumStatus().enabled).toBe(true);
  });

  // --- constructor overrides ---

  it("M22: custom initialStats merge", async () => {
    const m = new InMemoryMaintenanceExecutor({ rowCount: 50 });
    const s = await m.getStorageStats("*");
    expect(s.rowCount).toBe(50);
    expect(s.pageSize).toBe(4096); // from DEFAULT
  });

  it("M23: custom fragmentation constructor", async () => {
    const m = new InMemoryMaintenanceExecutor(
      undefined,
      [{ indexName: "custom", tableName: "x", pageCount: 100, fragmentationRatio: 0.5 }]
    );
    const frags = await m.getIndexFragmentation("*");
    expect(frags.length).toBe(1);
    expect(frags[0].indexName).toBe("custom");
  });

  // --- opsLog ---

  it("M24: opsLog returns a fresh copy", async () => {
    const m = fresh();
    await m.vacuum({ target: "*" });
    const log1 = m.opsLog;
    const log2 = m.opsLog;
    expect(log1).not.toBe(log2);
    expect(log1.length).toBe(1);
    expect(log2.length).toBe(1);
  });

  it("M25: opsLog accumulates multiple operations", async () => {
    const m = fresh();
    await m.vacuum({ target: "*" });
    await m.analyze({ target: "users" });
    await m.reindex({ target: "idx_test" });
    expect(m.opsLog.length).toBe(3);
  });

  // --- duration ---

  it("M26: successful operations have positive duration", async () => {
    const m = fresh();
    const r = await m.vacuum({ target: "*" });
    expect(r.durationMs).toBeGreaterThan(0);
    const r2 = await m.reindex({ target: "idx_users_email" });
    expect(r2.durationMs).toBeGreaterThan(0);
  });
});

// ── NoopMaintenanceExecutor ────────────────────────────────

describe("M-M: NoopMaintenanceExecutor", () => {
  it("N1: vacuum returns success without side effects", async () => {
    const noop = new NoopMaintenanceExecutor();
    const r = await noop.vacuum({ target: "*" });
    expect(r.success).toBe(true);
    expect(r.operation).toBe("VACUUM");
  });

  it("N2: analyze returns success", async () => {
    const noop = new NoopMaintenanceExecutor();
    const r = await noop.analyze({ target: "users" });
    expect(r.success).toBe(true);
  });

  it("N3: reindex returns success", async () => {
    const noop = new NoopMaintenanceExecutor();
    const r = await noop.reindex({ target: "idx_test" });
    expect(r.success).toBe(true);
  });

  it("N4: getStorageStats returns zeros", async () => {
    const noop = new NoopMaintenanceExecutor();
    const s = await noop.getStorageStats("*");
    expect(s.fileSizeBytes).toBe(0);
    expect(s.pageCount).toBe(0);
  });

  it("N5: getIndexFragmentation returns empty", async () => {
    const noop = new NoopMaintenanceExecutor();
    const frags = await noop.getIndexFragmentation("*");
    expect(frags).toEqual([]);
  });

  it("N6: getAutoVacuumStatus exists", () => {
    const noop = new NoopMaintenanceExecutor();
    const s = noop.getAutoVacuumStatus();
    expect(s).toHaveProperty("enabled");
    expect(s).toHaveProperty("threshold");
  });
});
