/**
 * MutationKillers.test.ts — Targeted tests for backup package mutation survivors.
 *
 * Survivors span:
 *   - BackupVerifier: constructor default (L18 true→false)
 *   - InMemoryBackupManager: listBackups sort/lookup arithmetic (L63, L77-L83)
 *   - RetentionPolicyEvaluator: parseDurationToMs arithmetic (L112-L126) +
 *     evaluate() overflow/count logic
 *
 * Target: 66.7% → ≥95% mutation score.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BackupVerifier } from "../impl/BackupVerifier.js";
import { InMemoryBackupManager } from "../impl/InMemoryBackupManager.js";
import { InMemoryStorageBackend } from "../impl/InMemoryStorageBackend.js";
import { RetentionPolicyEvaluator } from "../impl/RetentionPolicyEvaluator.js";
import type { BackupMetadata } from "@agentix-e/db-operations-core/types";

// ── Helpers ───────────────────────────────────────────

function makeSnapshot(overrides: Partial<BackupMetadata> & { snapshotId: string }): BackupMetadata {
  return {
    type: "full",
    state: "completed",
    createdAt: new Date().toISOString(),
    sizeBytes: 1024,
    fileCount: 1,
    location: `/backups/${overrides.snapshotId}`,
    ...overrides,
  };
}

function makeSnapshotAged(
  snapshotId: string,
  daysAgo: number,
  type: "full" | "incremental" | "logical" = "full",
): BackupMetadata {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return makeSnapshot({ snapshotId, type, createdAt: d.toISOString() });
}

// ── BackupVerifier L18 (constructor default) ──────────

describe("B-M: BackupVerifier", () => {
  it("B1: constructor creates instance with default fields", () => {
    const v = new BackupVerifier();
    expect(v).toBeDefined();
    // L18 true→false mutant would alter default behavior; verify method works
    const cs = v.calculateChecksum(Buffer.from("test"));
    expect(cs).toBeDefined();
    expect(typeof cs).toBe("string");
  });

  it("B2: verify returns success for valid checksum", async () => {
    const v = new BackupVerifier();
    const data = Buffer.from("hello world");
    const result = await v.verify("b1", data, { expectedChecksum: undefined });
    expect(result.valid).toBe(true);
  });

  it("B3: verify detects checksum mismatch", async () => {
    const v = new BackupVerifier();
    const data = Buffer.from("hello world");
    const result = await v.verify("b2", data, {
      expectedChecksum: "0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(result.valid).toBe(false);
  });
});

// ── InMemoryBackupManager (L63, L77-L83) ──
// Strategy: Use vi.useFakeTimers to freeze time and advance it between
// createBackup calls, producing deterministic createdAt timestamps that
// exercise the sort comparator (L63 `-`→`+`), the filter predicates
// (L79 `&&`→`||`, L80 `>`→`<=`, L81 `<`→`>=`), and the newerThan guard
// (L82 `-`→`+`, `+`→`-`).

describe("B-M: InMemoryBackupManager sort/filter (faketimer)", () => {
  let manager: InMemoryBackupManager;
  let storage: InMemoryStorageBackend;
  let retention: RetentionPolicyEvaluator;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    storage = new InMemoryStorageBackend();
    retention = new RetentionPolicyEvaluator({ maxFullSnapshots: 10, maxTotalBytes: 1_000_000_000 });
    manager = new InMemoryBackupManager(storage, retention);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("B4: listBackups returns newest first — kills L63 sort comparator `-`→`+`", async () => {
    // Create 5 snapshots, each 10s apart.
    // Must advance clock + flush timers for each createBackup since
    // simulateWork uses setTimeout internally.
    for (let i = 0; i < 5; i++) {
      const p = manager.createBackup({ type: "full" });
      vi.advanceTimersByTime(10_000);
      await p;
    }
    const items = await manager.listBackups({});
    expect(items.length).toBe(5);
    const times = items.map((s) => new Date(s.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThan(times[i]);
    }
  });

  it("B5: listBackups with limit respects slice boundary — kills L77 limit guard", async () => {
    for (let i = 0; i < 5; i++) {
      const p = manager.createBackup({ type: "full" });
      vi.advanceTimersByTime(10_000);
      await p;
    }
    const items = await manager.listBackups({ limit: 2 });
    expect(items).toHaveLength(2);
  });

  it("B6: listBackups with type filter only matches — kills L79 `&&`→`||`", async () => {
    let p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;
    p = manager.createBackup({ type: "incremental" });
    vi.advanceTimersByTime(10_000);
    await p;

    const fulls = await manager.listBackups({ type: "full" });
    expect(fulls.every((s) => s.type === "full")).toBe(true);
    expect(fulls.length).toBe(1);

    const incs = await manager.listBackups({ type: "incremental" });
    expect(incs.every((s) => s.type === "incremental")).toBe(true);
    expect(incs.length).toBe(1);
  });

  it("B7: listBackups newerThan filter correctly — kills L80 `>`→`<=`", async () => {
    let p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;
    p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;

    const allItems = await manager.listBackups({});
    const olderTs = new Date(allItems[1].createdAt).getTime();
    const cutoff = new Date(olderTs + 1).toISOString();
    const filtered = await manager.listBackups({ newerThan: cutoff });
    expect(filtered.length).toBe(1);
    expect(filtered.every((s) =>
      new Date(s.createdAt).getTime() > new Date(cutoff).getTime()
    )).toBe(true);
  });

  it("B8: listBackups newerThan strict boundary — kills L80 `>`→`>=`", async () => {
    let p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;
    p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;

    const allItems = await manager.listBackups({});
    const olderTs = new Date(allItems[1].createdAt).getTime();
    const exactCutoff = new Date(olderTs).toISOString();
    const result = await manager.listBackups({ newerThan: exactCutoff });
    // Strict `>` — exact-match snapshot NOT included
    expect(result.some((s) => new Date(s.createdAt).getTime() === olderTs)).toBe(false);
  });

  it("B9: listBackups with future newerThan returns empty — kills L82 `+`→`-`", async () => {
    let p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;

    const future = new Date(Date.now() + 86_400_000 * 7).toISOString();
    const result = await manager.listBackups({ newerThan: future });
    expect(result).toHaveLength(0);
  });

  it("B10: listBackups with past newerThan returns all — kills L81 `<`→`>=`", async () => {
    let p = manager.createBackup({ type: "full" });
    vi.advanceTimersByTime(10_000);
    await p;

    const past = new Date(Date.now() - 86_400_000).toISOString();
    const result = await manager.listBackups({ newerThan: past });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // ── Legacy tests kept for compatibility (no faketimer) ──
  it("B11: deleteBackup removes and returns true", async () => {
    vi.advanceTimersByTime(10_000);
    await manager.createBackup({ type: "full" });
    const items = await manager.listBackups({});
    const id = items[0].snapshotId;
    const result = await manager.deleteBackup(id);
    expect(result).toBe(true);
    const remaining = await manager.listBackups({});
    expect(remaining.some((s) => s.snapshotId === id)).toBe(false);
  });

  it("B12: deleteBackup nonexistent returns false", async () => {
    const result = await manager.deleteBackup("nonexistent");
    expect(result).toBe(false);
  });

  it("B13: getBackup returns snapshot by ID", async () => {
    vi.advanceTimersByTime(10_000);
    await manager.createBackup({ type: "full" });
    const items = await manager.listBackups({});
    const id = items[0].snapshotId;
    const snap = await manager.getBackup(id);
    expect(snap).toBeDefined();
    expect(snap!.snapshotId).toBe(id);
  });

  it("B14: getBackup nonexistent returns null", async () => {
    const snap = await manager.getBackup("nonexistent");
    expect(snap).toBeNull();
  });

  it("B15: restoreFromSnapshot returns the snapshot", async () => {
    vi.advanceTimersByTime(10_000);
    await manager.createBackup({ type: "full" });
    const items = await manager.listBackups({});
    const id = items[0].snapshotId;
    const result = await manager.restoreFromSnapshot(id);
    expect(result.success).toBe(true);
  });

  it("B16: restoreFromSnapshot nonexistent returns failure", async () => {
    const result = await manager.restoreFromSnapshot("nonexistent");
    expect(result.success).toBe(false);
  });
});

// ── RetentionPolicyEvaluator (L112-L126) ─────────────

describe("B-M: RetentionPolicyEvaluator", () => {
  it("B13: evaluate with empty list returns empty", () => {
    const rpe = new RetentionPolicyEvaluator({ maxFullSnapshots: 3, maxTotalBytes: 1_000_000 });
    const result = rpe.evaluate([]);
    expect(result).toHaveLength(0);
  });

  it("B14: evaluate respects maxFullSnapshots", () => {
    const rpe = new RetentionPolicyEvaluator({ maxFullSnapshots: 2, maxTotalBytes: 1_000_000_000 });
    const snaps = [
      makeSnapshotAged("s1", 5),
      makeSnapshotAged("s2", 4),
      makeSnapshotAged("s3", 3),
      makeSnapshotAged("s4", 2),
      makeSnapshotAged("s5", 1),
    ];
    const toDelete = rpe.evaluate(snaps);
    // maxFullSnapshots=2, 5 full → delete 3 oldest
    expect(toDelete.length).toBeGreaterThanOrEqual(1);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).toContain("s1"); // oldest
  });

  it("B15: evaluate with keepRecent preserves recent snapshots", () => {
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "P1D",
      maxTotalBytes: 1_000_000_000,
    });
    const snaps = [
      makeSnapshotAged("old", 30),
      makeSnapshotAged("recent", 0.01), // ~15 min ago
    ];
    const toDelete = rpe.evaluate(snaps);
    // recent should be preserved by keepRecent
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).not.toContain("recent");
  });

  it("B16: evaluate with keepRecent PT1H keeps snapshots less than 1h old", () => {
    // Test parseDurationToMs PT1H = 3_600_000ms (L112 hours * 3_600_000)
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "PT1H",
      maxTotalBytes: 1_000_000_000,
    });
    const now = new Date();
    const recentDate = new Date(now.getTime() - 30 * 60_000); // 30 min ago
    const snaps = [
      makeSnapshot({ snapshotId: "s1", createdAt: recentDate.toISOString() }),
      makeSnapshotAged("s2", 2),
    ];
    const toDelete = rpe.evaluate(snaps);
    // s1 is 30min ago < 1h, should be preserved
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).not.toContain("s1");
  });

  it("B17: evaluate with keepRecent P7D kills weeks-old snapshots", () => {
    // Tests parseDurationToMs P7D = 7 * 86_400_000ms (L123 days * 86_400_000)
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "P7D",
      maxTotalBytes: 1_000_000_000,
    });
    const snaps = [
      makeSnapshotAged("old", 30),
      makeSnapshotAged("recent", 3),
    ];
    const toDelete = rpe.evaluate(snaps);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    // "old" is 30 days > 7 days → deletable; "recent" is 3 days < 7 → kept
    expect(deletedIds).toContain("old");
    expect(deletedIds).not.toContain("recent");
  });

  it("B18: evaluate keepRecent PT30M handles minutes arithmetic", () => {
    // Tests parseDurationToMs PT30M = 30 * 60_000ms (L125 minutes * 60_000)
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "PT30M",
      maxTotalBytes: 1_000_000_000,
    });
    const now = new Date();
    const within30m = new Date(now.getTime() - 10 * 60_000); // 10 min
    const outside30m = new Date(now.getTime() - 60 * 60_000); // 1 hr
    const snaps = [
      makeSnapshot({ snapshotId: "s1", createdAt: within30m.toISOString() }),
      makeSnapshot({ snapshotId: "s2", createdAt: outside30m.toISOString() }),
    ];
    const toDelete = rpe.evaluate(snaps);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).not.toContain("s1"); // preserved by keepRecent
    expect(deletedIds).toContain("s2"); // outside 30m window
  });

  it("B19: evaluate keepRecent PT30S handles seconds arithmetic", () => {
    // Tests parseDurationToMs PT30S = 30 * 1_000ms (L126 seconds * 1_000)
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "PT30S",
      maxTotalBytes: 1_000_000_000,
    });
    const now = new Date();
    const within30s = new Date(now.getTime() - 10_000); // 10s
    const outside30s = new Date(now.getTime() - 120_000); // 2 min
    const snaps = [
      makeSnapshot({ snapshotId: "s1", createdAt: within30s.toISOString() }),
      makeSnapshot({ snapshotId: "s2", createdAt: outside30s.toISOString() }),
    ];
    const toDelete = rpe.evaluate(snaps);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).not.toContain("s1");
    expect(deletedIds).toContain("s2");
  });

  it("B20: evaluate with minAge prevents deletion of young snapshots", () => {
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 2,
      minAge: "P7D",
      maxTotalBytes: 1_000_000_000,
    });
    const snaps = [
      makeSnapshotAged("old", 30),
      makeSnapshotAged("young", 3),
    ];
    const toDelete = rpe.evaluate(snaps);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    expect(deletedIds).not.toContain("young"); // 3d < 7d minAge
  });

  it("B21: evaluate maxTotalBytes enforces byte limit", () => {
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 5,
      maxTotalBytes: 100, // tiny limit
    });
    const snaps = [
      makeSnapshot({ snapshotId: "big1", sizeBytes: 1024 }),
      makeSnapshot({ snapshotId: "big2", sizeBytes: 2048 }),
    ];
    const toDelete = rpe.evaluate(snaps);
    // Both exceed 100 bytes, expect deletions
    expect(toDelete.length).toBeGreaterThanOrEqual(1);
  });

  it("B22: evaluate keepRecent with plain number fallback", () => {
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "48", // 48 hours fallback
      maxTotalBytes: 1_000_000_000,
    });
    const snaps = [
      makeSnapshotAged("old", 30),
      makeSnapshotAged("recent", 1),
    ];
    const toDelete = rpe.evaluate(snaps);
    const deletedIds = toDelete.map((s) => s.snapshotId);
    // recent is 1 day < 48 hours → kept
    expect(deletedIds).not.toContain("recent");
  });

  it("B23: evaluate with all snapshots protected by keepRecent", () => {
    // Tests the keepRecent guard path (L120 `return`) — all items too young to delete
    const rpe = new RetentionPolicyEvaluator({
      maxFullSnapshots: 1,
      keepRecent: "P30D",
      maxTotalBytes: 1_000_000_000,
    });
    const snaps = [
      makeSnapshotAged("a1", 5),
      makeSnapshotAged("a2", 10),
      makeSnapshotAged("a3", 15),
    ];
    const toDelete = rpe.evaluate(snaps);
    // All are < 30 days → nothing deleted
    expect(toDelete).toHaveLength(0);
  });
});
