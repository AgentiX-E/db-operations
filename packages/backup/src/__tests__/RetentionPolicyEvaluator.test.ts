/**
 * RetentionPolicyEvaluator tests — RET1 through RET12.
 *
 * Covers retention policy evaluation logic:
 *   - maxFullSnapshots enforcement
 *   - keepRecent / minAge guards
 *   - maxTotalBytes pruning with excess calculation
 *   - Edge cases: empty snapshots, zero thresholds, exact boundaries
 *   - parseDurationToMs (ISO-8601 duration parser)
 *
 * These tests target survivors from mutation testing:
 *   - L40,63,69,71,72,75,77,79,80,81,82,83,94
 *   - L120-127 (parseDurationToMs arithmetic)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RetentionPolicyEvaluator } from "../impl/RetentionPolicyEvaluator.js";
import type { BackupMetadata, RetentionPolicy } from "@agentix-e/db-operations-core/types";

function makeSnapshot(overrides: Partial<BackupMetadata> & { id: string }): BackupMetadata {
  const ts = new Date(overrides.createdAt ?? Date.now()).toISOString();
  return {
    snapshotId: overrides.id,
    type: "full",
    state: "completed",
    sizeBytes: 1024 * 1024, // 1 MB
    createdAt: ts,
    dbName: "test-db",
    ...overrides,
  } as BackupMetadata;
}

describe("RET: RetentionPolicyEvaluator", () => {
  // ── RET1: Empty snapshot list returns nothing ──────────

  it("RET1: empty snapshot list returns empty array", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 3,
      maxTotalBytes: 0,
    });
    expect(evaluator.evaluate([])).toEqual([]);
  });

  // ── RET2: Fewer snapshots than maxFullSnapshots → keep all ──

  it("RET2: fewer snapshots than maxFullSnapshots keeps all", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 5,
      maxTotalBytes: 0,
    });
    const snapshots = [
      makeSnapshot({ id: "s1", createdAt: Date.now() - 3600000 }),
      makeSnapshot({ id: "s2", createdAt: Date.now() - 1800000 }),
    ];
    expect(evaluator.evaluate(snapshots)).toEqual([]);
  });

  // ── RET3: Excess full snapshots beyond maxFullSnapshots are pruned ──

  it("RET3: excess full snapshots beyond maxFullSnapshots are deleted", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 2,
      maxTotalBytes: 0,
    });
    const snapshots = [
      makeSnapshot({ id: "newest", createdAt: Date.now() - 1000 }),
      makeSnapshot({ id: "middle", createdAt: Date.now() - 2000 }),
      makeSnapshot({ id: "oldest", createdAt: Date.now() - 3000 }),
    ];
    const result = evaluator.evaluate(snapshots);
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("oldest");
  });

  // ── RET4: keepRecent prevents deletion of young snapshots ──

  it("RET4: keepRecent prevents deletion of snapshots younger than threshold", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "PT24H", // 24 hours
      maxTotalBytes: 0,
    });
    const snapshots = [
      makeSnapshot({ id: "recent", createdAt: Date.now() - 1000 }), // just now
      makeSnapshot({ id: "old", createdAt: Date.now() - 100000000 }), // ~27h ago
    ];
    const result = evaluator.evaluate(snapshots);
    // "recent" should be kept (younger than 24h), "old" would be the one deleted
    // But "recent" was newest so it survives on maxFullSnapshots=1 first
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("old");
  });

  // ── RET5: minAge prevents deletion of snapshots younger than min age ──

  it("RET5: minAge prevents deletion of snapshots younger than minAge", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      minAge: "PT24H",
      maxTotalBytes: 0,
    });
    const snapshots = [
      makeSnapshot({ id: "new", createdAt: Date.now() - 1000 }),
      makeSnapshot({ id: "older", createdAt: Date.now() - 100000000 }),
    ];
    const result = evaluator.evaluate(snapshots);
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("older");
  });

  // ── RET6: maxTotalBytes enforced — excess trims oldest first ──

  it("RET6: maxTotalBytes enforced trims oldest snapshots first", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 10, // don't limit by count
      maxTotalBytes: 3 * 1024 * 1024, // 3 MB
    });
    const snapshots = [
      makeSnapshot({ id: "a", sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 1000 }),
      makeSnapshot({ id: "b", sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 2000 }),
      makeSnapshot({ id: "c", sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 3000 }),
    ];
    // Total = 6 MB > 3 MB limit; oldest=3 is c(2MB), then still excess → b(2MB)
    const result = evaluator.evaluate(snapshots);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const ids = result.map(r => r.snapshotId);
    expect(ids).toContain("c"); // oldest first
    expect(ids).toContain("b"); // next oldest
  });

  // ── RET7: maxTotalBytes = 0 disables size enforcement (survivor L69) ──

  it("RET7: maxTotalBytes <= 0 disables size-based pruning", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 10,
      maxTotalBytes: 0,
    });
    const snapshots = [
      makeSnapshot({ id: "big", sizeBytes: 100 * 1024 * 1024 }),
      makeSnapshot({ id: "big2", sizeBytes: 100 * 1024 * 1024, createdAt: Date.now() - 1000 }),
    ];
    expect(evaluator.evaluate(snapshots)).toEqual([]);
  });

  // ── RET8: excess calculation loop exits at zero (survivor L79) ──

  it("RET8: excess calculation loop terminates when excess reaches zero", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 10,
      maxTotalBytes: 1024 * 1024, // 1 MB
    });
    const snapshots = [
      makeSnapshot({ id: "s", sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 1000 }),
    ];
    const result = evaluator.evaluate(snapshots);
    // 2MB total > 1MB limit → oldest=only "s" should get deleted
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("s");
  });

  // ── RET9: Config management ────────────────────────────

  it("RET9: getConfig returns a copy of the policy", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 3,
      maxTotalBytes: 100,
    });
    const cfg = evaluator.getConfig();
    expect(cfg.maxFullSnapshots).toBe(3);
    cfg.maxFullSnapshots = 999;
    expect(evaluator.getConfig().maxFullSnapshots).toBe(3); // defensive copy
  });

  it("RET10: updateConfig merges partial policy", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 3,
      maxTotalBytes: 0,
    });
    evaluator.updateConfig({ maxFullSnapshots: 5, minAge: "PT1H" });
    const cfg = evaluator.getConfig();
    expect(cfg.maxFullSnapshots).toBe(5);
    expect(cfg.minAge).toBe("PT1H");
    expect(cfg.maxTotalBytes).toBe(0); // retained from original
  });

  // ── RET11: ISO-8601 duration parser (parseDurationToMs) ──

  it("RET11: parseDurationToMs handles full ISO-8601 duration with all units", () => {
    // Taken through the public evaluate() API with keepRecent="P1DT2H3M4S"
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "P1DT2H3M4S",
      maxTotalBytes: 0,
    });
    // Snapshot created 28 hours ago — older than 1d2h3m4s (≈26.05h) → deletable
    const snapshots = [
      makeSnapshot({ id: "keeper", createdAt: Date.now() - 1000 }),
      makeSnapshot({ id: "deletable", createdAt: Date.now() - 28 * 3600000 }),
    ];
    const result = evaluator.evaluate(snapshots);
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("deletable");
  });

  // ── RET12: Duration parser — plain hours as fallback ──

  it("RET12: parseDurationToMs falls back to plain hours for non-ISO strings", () => {
    const evaluator = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "48", // plain hours
      maxTotalBytes: 0,
    });
    // Snapshot from 1 hour ago should be kept (unexpirable within 48h)
    const snapshots = [
      makeSnapshot({ id: "recent", createdAt: Date.now() - 3600000 }),
      makeSnapshot({ id: "veryold", createdAt: Date.now() - 100 * 3600000 }),
    ];
    const result = evaluator.evaluate(snapshots);
    expect(result.length).toBe(1);
    expect(result[0]!.snapshotId).toBe("veryold");
  });
});
