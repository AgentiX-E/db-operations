/**
 * INT3 — AutoScale ↔ Maintenance ↔ RollingUpgrade Integration Tests
 *
 * Cross-package scenarios:
 *   - Rolling upgrade full batch sequence
 *   - Pause/resume cycle integrity
 *   - Rollback state transitions
 *   - Maintenance + upgrade coexistence
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IntegratedFactory } from "./integrated-factory.js";
import type { UpgradePlan } from "@agentix-e/db-operations-rollingupgrade";

describe("INT3: AutoScale ↔ Maintenance ↔ RollingUpgrade", () => {
  let factory: IntegratedFactory;

  beforeEach(() => {
    factory = new IntegratedFactory();
  });

  afterEach(async () => {
    await factory.cleanup();
  });

  // ── INT3.1: Rolling upgrade full batch sequence ─

  it("INT3.1: rolling upgrade executes complete batch sequence", async () => {
    const upgrade = factory.createRollingUpgrade();
    const plan: UpgradePlan = {
      nodes: ["n1", "n2", "n3"],
      batchSize: 1,
      preScript: "validate.sh",
      postScript: "check.sh",
    };

    const phases = await upgrade.execute(plan);
    expect(phases.length).toBeGreaterThan(3);
    // Each batch produces running + completed, so completed >= 3
    expect(phases.filter((p) => p.status === "completed").length).toBeGreaterThanOrEqual(3);
  });

  // ── INT3.2: Pre-script + post-script both executed ─

  it("INT3.2: pre-script and post-script phases are included", async () => {
    const upgrade = factory.createRollingUpgrade();
    const plan: UpgradePlan = {
      nodes: ["x"],
      batchSize: 1,
      preScript: "lock.sh",
      postScript: "unlock.sh",
    };

    const phases = await upgrade.execute(plan);

    expect(phases.some((p) => p.step.includes("lock.sh"))).toBe(true);
    expect(phases.some((p) => p.step.includes("unlock.sh"))).toBe(true);
  });

  // ── INT3.3: Pause flag toggles without error ─

  it("INT3.3: pause flag cycles correctly", async () => {
    const upgrade = factory.createRollingUpgrade();
    await upgrade.pause();
    await upgrade.resume();

    const plan: UpgradePlan = {
      nodes: ["a", "b", "c", "d"],
      batchSize: 2,
      preScript: "pre.sh",
      postScript: "post.sh",
    };
    const phases = await upgrade.execute(plan);

    // execute() resets pause flag — all phases should be completed or running
    expect(phases.length).toBeGreaterThan(0);
    expect(phases.filter((p) => p.status === "completed").length).toBeGreaterThan(0);
  });

  // ── INT3.4: Rollback marks phases correctly ─

  it("INT3.4: rollback removes running status from all phases", async () => {
    const upgrade = factory.createRollingUpgrade();
    const plan: UpgradePlan = {
      nodes: ["x1", "x2"],
      batchSize: 1,
      preScript: "pre.sh",
      postScript: "post.sh",
    };

    await upgrade.execute(plan);
    await upgrade.rollback();

    const phases = upgrade.getStatus();
    expect(phases.every((p) => p.status !== "running")).toBe(true);
  });

  // ── INT3.5: Maintenance executor runs vacuum ─

  it("INT3.5: maintenance executor vacuum task succeeds", async () => {
    const exec = factory.createMaintenanceExecutor();
    const result = await exec.vacuum({ tables: ["test_table"] });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  // ── INT3.6: Maintenance executor analyze task ─

  it("INT3.6: maintenance executor analyze task succeeds", async () => {
    const exec = factory.createMaintenanceExecutor();
    const result = await exec.analyze({ tables: ["metrics"] });
    expect(result.success).toBe(true);
  });

  // ── INT3.7: Maintenance executor reindex ─

  it("INT3.7: maintenance executor reindex task succeeds", async () => {
    const exec = factory.createMaintenanceExecutor();
    const result = await exec.reindex({ index: "idx_users" });
    expect(result.success).toBe(true);
  });

  // ── INT3.8: Maintenance and upgrade compose in same session ─

  it("INT3.8: maintenance and rolling upgrade coexist in one factory", async () => {
    const exec = factory.createMaintenanceExecutor();
    const upgrade = factory.createRollingUpgrade();

    const mResult = await exec.reindex({ index: "pk_users" });
    const plan: UpgradePlan = {
      nodes: ["a"],
      batchSize: 1,
      preScript: "pre.sh",
      postScript: "post.sh",
    };
    const uPhases = await upgrade.execute(plan);

    expect(mResult.success).toBe(true);
    expect(uPhases.length).toBeGreaterThan(0);
  });

  // ── INT3.9: Storage stats accessible ─

  it("INT3.9: maintenance executor returns storage stats", async () => {
    const exec = factory.createMaintenanceExecutor();
    const stats = await exec.getStorageStats("default");
    expect(stats).toBeDefined();
    expect(typeof stats.fileSizeBytes).toBe("number");
  });

  // ── INT3.10: Index fragmentation queryable ─

  it("INT3.10: maintenance executor returns index fragmentation", async () => {
    const exec = factory.createMaintenanceExecutor();
    const fragmentation = await exec.getIndexFragmentation("idx_test");
    expect(Array.isArray(fragmentation)).toBe(true);
  });
});
