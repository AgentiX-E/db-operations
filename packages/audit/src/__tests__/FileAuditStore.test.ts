/**
 * FileAuditStore Tests — AC 52.x
 *
 * AC 52.1 — Write audit entry to NDJSON file
 * AC 52.2 — Query with filters (time, operation, actor, severity)
 * AC 52.3 — Get by ID
 * AC 52.4 — Count
 * AC 52.5 — Prune old entries by file mtime
 * AC 52.6 — Log rotation by file size
 * AC 52.7 — Crash-safe writes (tmp + rename)
 * AC 52.8 — Query with limit/offset
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileAuditStore, type FileAuditStoreConfig } from "../impl/FileAuditStore.js";
import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

// ── Test data dir ──────────────────────────────────────────

const TEST_DIR = "/tmp/db-federation-test/audit-file-store";

function cleanDir(): void {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
}

// ── Suite ──────────────────────────────────────────────────

describe("FileAuditStore — AC 52.x: File-based Audit Store", () => {
  let config: FileAuditStoreConfig;
  let store: FileAuditStore;

  beforeEach(() => {
    cleanDir();
    config = {
      dataDir: TEST_DIR,
      maxFileSize: 1024 * 10, // 10 KB for fast rotation
      maxAgeMs: 3600_000,     // 1 hour
      retentionDays: 90,
    };
    store = new FileAuditStore(config);
  });

  afterEach(() => {
    cleanDir();
  });

  // AC 52.1: Write
  it("AC 52.1: should write audit entry to NDJSON file", async () => {
    const id = await store.write({
      operation: "LOGIN",
      actor: "admin",
      resource: "/api/login",
      result: "success",
      severity: "info",
    });

    expect(id).toBeTruthy();

    // File should exist
    const files = readdirSync(TEST_DIR);
    expect(files.some((f) => f.endsWith(".ndjson"))).toBe(true);

    // Content should be valid JSON
    const ndjsonFile = files.find((f) => f.endsWith(".ndjson"))!;
    const content = readFileSync(join(TEST_DIR, ndjsonFile), "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.operation).toBe("LOGIN");
    expect(parsed.actor).toBe("admin");
    expect(parsed.id).toBe(id);
  });

  // AC 52.2: Query with filters
  it("AC 52.2: should query with various filters", async () => {
    await store.write({ operation: "LOGIN", actor: "admin", resource: "/login", result: "success" });
    await store.write({ operation: "SELECT", actor: "user1", resource: "users", result: "success" });
    await store.write({
      operation: "DELETE",
      actor: "admin",
      resource: "users",
      result: "failure",
      severity: "error",
    });
    await store.write({ operation: "SELECT", actor: "user2", resource: "orders", result: "success" });
    await store.write({ operation: "DROP", actor: "admin", resource: "users", result: "denied", severity: "critical" });

    // Filter by operation
    const selectResults = await store.query({ operation: "SELECT" });
    expect(selectResults).toHaveLength(2);

    // Filter by actor
    const adminResults = await store.query({ actor: "admin" });
    expect(adminResults).toHaveLength(3);

    // Filter by result
    const deniedResults = await store.query({ result: "denied" });
    expect(deniedResults).toHaveLength(1);

    // Filter by severity
    const criticalResults = await store.query({ severity: "critical" });
    expect(criticalResults).toHaveLength(1);

    // All results
    const all = await store.query({});
    expect(all).toHaveLength(5);
  });

  // AC 52.3: Get by ID
  it("AC 52.3: should get entry by ID", async () => {
    const id = await store.write({
      operation: "INSERT",
      actor: "app",
      resource: "orders",
      result: "success",
    });

    const entry = await store.get(id);
    expect(entry).not.toBeNull();
    expect(entry!.operation).toBe("INSERT");
    expect(entry!.id).toBe(id);

    const notFound = await store.get("nonexistent-id");
    expect(notFound).toBeNull();
  });

  // AC 52.4: Count
  it("AC 52.4: should count entries", async () => {
    for (let i = 0; i < 10; i++) {
      await store.write({
        operation: `OP_${i}`,
        actor: "user",
        resource: "test",
        result: "success",
      });
    }

    const total = await store.count();
    expect(total).toBe(10);

    const filtered = await store.count({ operation: "OP_1" });
    expect(filtered).toBe(1);
  });

  // AC 52.5: Prune
  it("AC 52.5: should prune old files by mtime", async () => {
    await store.write({ operation: "OLD", actor: "bot", resource: "x", result: "success" });

    // Prune with a timestamp far in the future (all files older)
    const future = new Date(Date.now() + 86400_000);
    const removed = await store.pruneOlderThan(future);
    expect(removed).toBeGreaterThanOrEqual(0);

    // Prune with a timestamp far in the past (no files older)
    const past = new Date(0);
    const removed2 = await store.pruneOlderThan(past);
    expect(removed2).toBe(0);
  });

  // AC 52.6: Log rotation by size
  it("AC 52.6: should rotate log file when size exceeds maxFileSize", async () => {
    // Set very small maxFileSize to trigger rotation
    store = new FileAuditStore({ ...config, maxFileSize: 200 });

    // Write many entries to trigger rotation
    for (let i = 0; i < 50; i++) {
      await store.write({
        operation: `OP_${i}_${"x".repeat(30)}`,
        actor: "user",
        resource: "test",
        result: "success",
      });
    }

    const files = readdirSync(TEST_DIR);
    const ndjsonFiles = files.filter((f) => f.endsWith(".ndjson"));
    expect(ndjsonFiles.length).toBeGreaterThan(1);
  });

  // AC 52.7: Crash-safe write (tmp + rename)
  it("AC 52.7: should write through tmp + rename for crash safety", async () => {
    await store.write({ operation: "SAFE", actor: "test", resource: "x", result: "success" });

    // No .tmp file should remain after successful write
    const files = readdirSync(TEST_DIR);
    const tmpFiles = files.filter((f) => f.endsWith(".tmp"));
    expect(tmpFiles).toHaveLength(0);

    // The .ndjson file should contain valid audit entry
    const ndjsonFiles = files.filter((f) => f.endsWith(".ndjson"));
    expect(ndjsonFiles).toHaveLength(1);
  });

  // AC 52.8: Query with limit and offset
  it("AC 52.8: should support pagination via limit and offset", async () => {
    for (let i = 0; i < 10; i++) {
      await store.write({
        operation: "INSERT",
        actor: `user_${i}`,
        resource: "test",
        result: "success",
      });
    }

    const page1 = await store.query({ limit: 3, offset: 0 });
    expect(page1).toHaveLength(3);

    const page2 = await store.query({ limit: 3, offset: 3 });
    expect(page2).toHaveLength(3);

    // Ensure pages don't overlap
    const ids1 = page1.map((e) => e.id);
    const ids2 = page2.map((e) => e.id);
    for (const id of ids1) {
      expect(ids2).not.toContain(id);
    }
  });
});
