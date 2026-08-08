/**
 * MutationKillers.test.ts — Targeted tests for health package mutation survivors.
 *
 * Covers: componentProbe nullish coalescing, HealthOrchestrator startup/readiness/liveness
 * aggregate computation, uptime arithmetic, error boundaries.
 *
 * Target: 48.1% → ≥95% mutation score.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { componentProbe } from "../impl/ComponentProbe.js";
import { HealthOrchestrator } from "../impl/HealthOrchestrator.js";
import type { IHealthProbe } from "../interfaces/IHealthProbe.js";
import type { ProbeResult } from "@agentix-e/db-operations-core/types";

function ok(): ProbeResult { return { ok: true }; }
function fail(msg = "fail"): ProbeResult { return { ok: false, message: msg }; }
function boom(): ProbeResult { throw new Error("BOOM"); }

describe("H-M: componentProbe nullish coalescing", () => {
  it("H1: readiness undefined falls to liveness", () => {
    const p = componentProbe("p1", "c1", { liveness: ok });
    expect(p.readiness!()).toEqual(ok());
  });

  it("H2: startup undefined falls to readiness when readiness exists", () => {
    const p = componentProbe("p2", "c2", { liveness: ok, readiness: fail });
    expect(p.startup!()).toEqual(fail());
  });

  it("H3: startup falls to liveness when neither startup nor readiness", () => {
    const p = componentProbe("p3", "c3", { liveness: fail });
    expect(p.startup!()).toEqual(fail());
  });

  it("H4: all three checks independent", () => {
    const p = componentProbe("p4", "c4", { liveness: ok, readiness: fail, startup: () => ({ ok: true }) });
    expect(p.liveness()).toEqual(ok());
    expect(p.readiness!()).toEqual(fail());
    expect(p.startup!()).toEqual({ ok: true });
  });

  it("H4b: startup falls through when undefined but readiness already defined", () => {
    // Covers L47 true→false mutant in nullish coalescing chain
    const p = componentProbe("p4b", "c4b", {
      liveness: () => ({ ok: false, message: "bad" }),
      readiness: () => ({ ok: true, message: "good" }),
    });
    // startup is undefined → falls to readiness (which is set)
    expect(p.startup!()).toEqual({ ok: true, message: "good" });
  });
});

describe("H-M: HealthOrchestrator lifecycle", () => {
  let orch: HealthOrchestrator;
  beforeEach(() => { orch = new HealthOrchestrator(); });

  it("H5: registerFunctional with passing liveness", () => {
    orch.registerFunctional("db", "DB", { liveness: ok });
    expect(orch.hasComponent("db")).toBe(true);
    const r = orch.liveness();
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("H6: registerFunctional with throwing liveness", () => {
    orch.registerFunctional("db", "DB", { liveness: boom });
    const r = orch.liveness();
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("db");
  });

  it("H7: startup with all passing probes", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, startup: ok });
    const r = orch.startup();
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(orch.isStartupComplete()).toBe(true);
  });

  it("H7b: startup with failing probe leaves startupComplete false", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, startup: fail });
    const r = orch.startup();
    expect(r.ok).toBe(false);
    expect(orch.isStartupComplete()).toBe(false);
  });

  it("H8: startup with one failing probe", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, startup: fail });
    const r = orch.startup();
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("H9: readiness all passing", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: ok });
    const r = orch.readiness();
    expect(r.ok).toBe(true);
  });

  it("H10: readiness with one failing probe", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: fail });
    const r = orch.readiness();
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("H11: readiness mixed healthy + unhealthy", () => {
    orch.registerFunctional("pass", "Pass", { liveness: ok, readiness: ok });
    orch.registerFunctional("fail", "Fail", { liveness: fail, readiness: fail });
    const r = orch.readiness();
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
  });

  it("H12: unregisterComponent removes probe", () => {
    orch.registerFunctional("db", "DB", { liveness: ok });
    orch.unregisterComponent("db");
    expect(orch.hasComponent("db")).toBe(false);
  });

  it("H13: duplicated startup is idempotent", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, startup: ok });
    const r1 = orch.startup();
    const r2 = orch.startup();
    expect(r2.ok).toBe(true);
    expect(r2.errors).toHaveLength(0);
  });

  it("H14: registerComponent with probeId + probe works via functional", () => {
    orch.registerFunctional("p1", "PC", {
      liveness: ok,
      readiness: ok,
      startup: ok,
    });
    expect(orch.hasComponent("p1")).toBe(true);
    const r = orch.liveness();
    expect(r.ok).toBe(true);
  });

  it("H15: unregister nonexistent is no-op", () => {
    orch.unregisterComponent("ghost");
    // Should not throw
  });

  it("H16: liveness with multiple probes aggregate", () => {
    orch.registerFunctional("a", "A", { liveness: ok });
    orch.registerFunctional("b", "B", { liveness: fail });
    const r = orch.liveness();
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes("b"))).toBe(true);
  });

  it("H17: startup catches thrown errors gracefully", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, startup: boom });
    const r = orch.startup();
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.includes("db"))).toBe(true);
  });

  it("H18: getAggregateStatus with all healthy", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: ok });
    const s = orch.getAggregateStatus();
    expect(s.status).toBe("healthy");
    expect(s.count).toBe(1);
  });

  it("H19: getAggregateStatus with all unhealthy", () => {
    orch.registerFunctional("db", "DB", { liveness: fail, readiness: fail });
    const s = orch.getAggregateStatus();
    expect(s.status).toBe("unhealthy");
    expect(s.count).toBe(1);
  });

  it("H20: getAggregateStatus with mixed = degraded", () => {
    orch.registerFunctional("pass", "P", { liveness: ok, readiness: ok });
    orch.registerFunctional("fail", "F", { liveness: fail, readiness: fail });
    const s = orch.getAggregateStatus();
    expect(s.status).toBe("degraded");
    expect(s.count).toBe(2);
  });

  it("H21b: getComponentHealth uptimeSeconds in normal range", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: ok });
    const components = orch.getComponentHealth();
    expect(components).toHaveLength(1);
    // uptimeSeconds = floor((now - registeredAt) / 1000) — fresh component
    expect(components[0].uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(components[0].uptimeSeconds).toBeLessThan(60);
  });

  it("H21: getHealthStatus reports healthy with all passing", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: ok });
    const hs = orch.getHealthStatus();
    expect(hs.status).toBe("healthy");
    // uptimeSeconds = floor((now - start) / 1000). With `/`→`*` mutant: ms*1000 (huge).
    // With `-`→`+` mutant: ms+1000 (large but not deadly). Kill by range check.
    expect(hs.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(hs.uptimeSeconds).toBeLessThan(60);
    expect(hs.lastError).toBeNull();
  });

  it("H22: getHealthStatus reports unhealthy with all failing", () => {
    orch.registerFunctional("db", "DB", { liveness: fail, readiness: fail });
    const hs = orch.getHealthStatus();
    expect(hs.status).toBe("unhealthy");
  });

  it("H23: getHealthStatus reports degraded with mixed", () => {
    orch.registerFunctional("pass", "P", { liveness: ok, readiness: ok });
    orch.registerFunctional("fail", "F", { liveness: fail, readiness: fail });
    const hs = orch.getHealthStatus();
    expect(hs.status).toBe("degraded");
    expect(hs.components.length).toBe(2);
  });

  it("H24: getHealthStatus captures lastError after liveness check", () => {
    orch.registerFunctional("db", "DB", { liveness: fail, readiness: fail });
    // Trigger liveness check to store lastError
    orch.liveness();
    const hs = orch.getHealthStatus();
    expect(hs.lastError).toBeDefined();
    expect(hs.lastError).toEqual("fail");
  });

  it("H25: getSummary returns non-empty string", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: ok });
    const summary = orch.getSummary();
    expect(summary).toContain("healthy");
  });

  it("H26: getComponentHealth returns array with correct structure", () => {
    orch.registerFunctional("db", "DB", { liveness: ok, readiness: fail });
    const components = orch.getComponentHealth();
    expect(components).toHaveLength(1);
    expect(components[0].liveness.ok).toBe(true);
    expect(components[0].readiness.ok).toBe(false);
  });
});
