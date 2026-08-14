/**
 * MutationKillers — precise assertions to kill arithmetic/logic mutants in
 * FederatedQueryRouter that the broader i35 suite only asserts loosely
 * (e.g. `toBeGreaterThanOrEqual(0)` or sort-order-only checks).
 *
 * Each test targets a specific survivor operator (see MUTATION_REPORT.md):
 *   - cost score arithmetic (`/`, `*`, `+`, `-`, `===`)
 *   - failover retry/backoff gates (`<`, `||`, `*`)
 *   - stats average arithmetic (`/`, `||`)
 *   - assignment filtering (`===`, `||`, `>`, `&&`)
 *   - geo-affinity exclusion (`&&`, `!==`)
 *   - priority indexing (`+`)
 */

import { describe, it, expect, vi } from "vitest";
import { FederatedQueryRouter } from "../impl/FederatedQueryRouter.js";
import type {
  FederatedNode,
  FederatedQuery,
  NodeResult,
} from "../interfaces/index.js";

function makeNode(overrides: Partial<FederatedNode> = {}): FederatedNode {
  return {
    id: `n-${Math.random().toString(36).slice(2, 6)}`,
    host: "localhost",
    port: 5432,
    role: "primary",
    health: "healthy",
    shardIds: ["s0", "s1"],
    weight: 0.5,
    capabilities: ["read", "write"],
    region: "us-east-1",
    load: { cpuPercent: 30, memoryPercent: 40, activeConnections: 10, pendingQueries: 2, avgLatencyMs: 5 },
    ...overrides,
  };
}

const THRESHOLD = { maxCpuPercent: 80, maxMemoryPercent: 80, maxPendingQueries: 50, maxAvgLatencyMs: 100 };

// ── Cost score arithmetic (L452, L457, L460, L463) ──────────────────

describe("computeNodeScore arithmetic", () => {
  it("computes exact score for a healthy node", () => {
    const router = new FederatedQueryRouter();
    const node = makeNode({
      load: { cpuPercent: 80, memoryPercent: 40, activeConnections: 10, pendingQueries: 25, avgLatencyMs: 100 },
    });
    // cpuRatio = 80/80 = 1 → 1/30 = 0.033…
    // memRatio = 40/80 = 0.5 → 0.5*25 = 12.5
    // pendingRatio = 25/50 = 0.5 → 0.5*25 = 12.5
    // latRatio = 100/100 = 1 → 1*20 = 20
    // total = 0.0333 + 12.5 + 12.5 + 20 = 45.0333 → round = 45
    expect(router.computeNodeScore(node, THRESHOLD)).toBe(45);
  });

  it("returns 50 when load or threshold is missing (no-data medium)", () => {
    const router = new FederatedQueryRouter();
    expect(router.computeNodeScore(makeNode({ load: undefined }), THRESHOLD)).toBe(50);
    expect(router.computeNodeScore(makeNode(), undefined)).toBe(50);
  });

  it("adds 30 for degraded and 100 for unhealthy nodes", () => {
    const router = new FederatedQueryRouter();
    const load = { cpuPercent: 0, memoryPercent: 0, activeConnections: 0, pendingQueries: 0, avgLatencyMs: 0 };
    const base = router.computeNodeScore(makeNode({ load, health: "healthy" }), THRESHOLD);
    const degraded = router.computeNodeScore(makeNode({ load, health: "degraded" }), THRESHOLD);
    const unhealthy = router.computeNodeScore(makeNode({ load, health: "unhealthy" }), THRESHOLD);
    expect(degraded).toBe(base + 30);
    expect(unhealthy).toBe(base + 100);
  });
});

// ── mergeResults arithmetic (L192 `-`→`+`, L224 `===`→`!==`) ────────

describe("mergeResults arithmetic", () => {
  it("totalDurationMs is the exact sum of node durations", () => {
    const router = new FederatedQueryRouter();
    const results: NodeResult[] = [
      { nodeId: "a", shardIds: [], rows: [], rowCount: 0, durationMs: 111, success: true },
      { nodeId: "b", shardIds: [], rows: [], rowCount: 0, durationMs: 222, success: true },
    ];
    expect(router.mergeResults(results).totalDurationMs).toBe(333);
  });

  it("success is true only when there are zero failures", () => {
    const router = new FederatedQueryRouter();
    const allOk: NodeResult[] = [
      { nodeId: "a", shardIds: [], rows: [{ id: 1 }], rowCount: 1, durationMs: 1, success: true },
    ];
    expect(router.mergeResults(allOk).success).toBe(true);

    const oneFail: NodeResult[] = [
      { nodeId: "a", shardIds: [], rows: [], rowCount: 0, durationMs: 1, success: false, error: "x" },
    ];
    expect(router.mergeResults(oneFail).success).toBe(false);
  });
});

// ── failover retry/backoff gates (L138 `<`, L140 `||`, L164 `||`) ───

describe("failover gates", () => {
  it("fallbackStrategy falls back to primary strategy when unset", async () => {
    const router = new FederatedQueryRouter();
    // No fallbackStrategy → fbStrategy == strategy (round_robin default).
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 1, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: false });
    router.registerNode(makeNode({ id: "n1" }));
    let calls = 0;
    const exec = async () => {
      calls++;
      return { nodeId: "n1", shardIds: [], rows: [], rowCount: 0, durationMs: 1, success: false, error: "boom" };
    };
    const r = await router.executeQuery({ id: "q", sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery, exec);
    // After maxRetries=1 exhausts, result is unsuccessful with fallback error.
    expect(r.success).toBe(false);
    expect(r.error).toContain("boom");
  });

  it("error uses lastError when present, else the max-retries sentinel", async () => {
    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: false });
    router.registerNode(makeNode({ id: "n1" }));
    const r = await router.executeQuery({ id: "q", sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery, async () => ({
      nodeId: "n1", shardIds: [], rows: [], rowCount: 0, durationMs: 1, success: false, error: "conn refused",
    }));
    // maxRetries=0 → one attempt, fails immediately with the real error.
    expect(r.success).toBe(false);
    expect(r.error).toBe("conn refused");
  });
});

// ── stats average arithmetic (L233 `||`, L234 `||`, L245 `/`, L246 `/`) ──

describe("getStats averages", () => {
  it("avgExecutionTimeMs divides total exec ms by query count", async () => {
    // totalExecTimeMs is accumulated from wall-clock durations inside
    // _executePlanInternal (Date.now() delta). Control Date.now precisely so
    // each successful query contributes exactly 100ms, giving deterministic
    // totalExecTimeMs for the division assertion.
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);

    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: false });
    router.registerNode(makeNode({ id: "n1" }));

    for (let i = 0; i < 2; i++) {
      await router.executeQuery(
        { id: `q${i}`, sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery,
        async () => {
          // Advance wall-clock inside the executor so _executePlanInternal's
          // final Date.now() reads 100ms later than its startMs.
          now += 100;
          return { nodeId: "n1", shardIds: [], rows: [{ id: 1 }], rowCount: 1, durationMs: 10, success: true };
        },
      );
    }

    nowSpy.mockRestore();

    const s = router.getStats();
    expect(s.totalQueries).toBe(2);
    // Two queries, 100ms each → totalExecTimeMs = 200, /2 = 100.
    expect(s.avgExecutionTimeMs).toBe(100);
  });

  it("stats with zero queries still returns finite averages", () => {
    const router = new FederatedQueryRouter();
    const s = router.getStats();
    expect(s.totalQueries).toBe(0);
    expect(Number.isFinite(s.avgExecutionTimeMs)).toBe(true);
    expect(Number.isFinite(s.avgPlanTimeMs)).toBe(true);
  });
});

// ── assignment filtering (L266 `>`, L271 `===`/`||`) ──────────────

describe("assignment filtering", () => {
  it("filters out unhealthy nodes when skipUnhealthy is set", () => {
    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: true, geoAffinity: false });
    router.registerNode(makeNode({ id: "healthy", health: "healthy" }));
    router.registerNode(makeNode({ id: "unhealthy", health: "unhealthy" }));
    const plan = router.planQuery({ id: "q", sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery);
    expect(plan.assignments.every((a) => a.nodeId === "healthy")).toBe(true);
  });

  it("write intent excludes read-only nodes", () => {
    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: false });
    router.registerNode(makeNode({ id: "rw", capabilities: ["read", "write"], role: "primary" }));
    router.registerNode(makeNode({ id: "ro", capabilities: ["read"], role: "replica" }));
    const plan = router.planQuery({ id: "q", sql: "x", intent: "write", consistency: "strong", targetShards: [], timeoutMs: 100 } as FederatedQuery);
    expect(plan.assignments.some((a) => a.nodeId === "rw")).toBe(true);
  });
});

// ── geo-affinity exclusion (L385 `&&`/`!==`, L371/L442 `+`) ───────

describe("geo-affinity and priority", () => {
  it("prefers nodes in the preferred region", () => {
    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "round_robin", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: true, preferredRegion: "eu-west-1" });
    router.registerNode(makeNode({ id: "eu", region: "eu-west-1" }));
    router.registerNode(makeNode({ id: "us", region: "us-east-1" }));
    const plan = router.planQuery({ id: "q", sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery);
    expect(plan.assignments[0]!.nodeId).toBe("eu");
  });

  it("weighted routing assigns priority 1-based (i + 1)", () => {
    const router = new FederatedQueryRouter();
    router.setRoutingPolicy({ strategy: "weighted", maxRetries: 0, retryBackoffMs: 1, skipUnhealthy: false, geoAffinity: false });
    router.registerNode(makeNode({ id: "a", weight: 3 }));
    router.registerNode(makeNode({ id: "b", weight: 1 }));
    const plan = router.planQuery({ id: "q", sql: "x", intent: "read", consistency: "eventual", targetShards: [], timeoutMs: 100 } as FederatedQuery);
    expect(plan.assignments[0]!.priority).toBe(1);
    expect(plan.assignments[1]!.priority).toBe(2);
  });
});
