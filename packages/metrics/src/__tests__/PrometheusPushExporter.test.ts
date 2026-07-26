/**
 * PrometheusPushExporter Tests — AC 51.x
 *
 * AC 51.1 — Counter → Prometheus text format
 * AC 51.2 — Gauge → Prometheus text format
 * AC 51.3 — Histogram → Prometheus text format with buckets
 * AC 51.4 — Labels formatted correctly
 * AC 51.5 — URL construction with grouping keys
 * AC 51.6 — HTTP push (with mock fetch)
 * AC 51.7 — PushGateway error handling
 * AC 51.8 — Push timeout handling
 * AC 51.9 — Label value escaping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrometheusPushExporter, type PrometheusPushExporterConfig } from "../impl/PrometheusPushExporter.js";
import { MetricsRegistry } from "../impl/MetricsRegistry.js";

// ── Suite ────────────────────────────────────────────────────────

describe("PrometheusPushExporter — AC 51.x: Prometheus Push Exporter", () => {
  let registry: MetricsRegistry;
  let config: PrometheusPushExporterConfig;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    registry = new MetricsRegistry();
    config = {
      pushGatewayUrl: "http://pushgateway:9091",
      job: "sqlvec-db",
      instance: "node-1",
      pushIntervalMs: 0, // manual only
      timeoutMs: 5_000,
    };
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // AC 51.1: Counter format
  it("AC 51.1: should format counter metric", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const counter = registry.counter("test_requests_total", { method: "GET" });
    counter.incBy(42);

    // Trigger push to build URL and body (we'll check fetch call)
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("http://pushgateway:9091/metrics/job/sqlvec-db/instance/node-1");
    expect(opts.method).toBe("PUT");
    expect(opts.body).toContain("# HELP test_requests_total Counter metric");
    expect(opts.body).toContain("# TYPE test_requests_total counter");
    expect(opts.body).toContain('test_requests_total{method="GET"} 42');
  });

  // AC 51.2: Gauge format
  it("AC 51.2: should format gauge metric", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const gauge = registry.gauge("db_connections");
    gauge.set(15);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    const body = mockFetch.mock.calls[0][1].body;
    expect(body).toContain("# HELP db_connections Gauge metric");
    expect(body).toContain("# TYPE db_connections gauge");
    expect(body).toContain("db_connections 15");
  });

  // AC 51.3: Histogram format with buckets
  it("AC 51.3: should format histogram with buckets", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const hist = registry.histogram("query_duration_ms", { endpoint: "/users" }, [1, 10, 100]);
    hist.observe(5);
    hist.observe(50);
    hist.observe(150);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    const body = mockFetch.mock.calls[0][1].body;
    expect(body).toContain("# HELP query_duration_ms Histogram metric");
    expect(body).toContain("# TYPE query_duration_ms histogram");
    expect(body).toContain('query_duration_ms_count{endpoint="/users"} 3');
    expect(body).toContain('query_duration_ms_sum{endpoint="/users"}');
    expect(body).toContain('{endpoint="/users"}'); // label formatting check
  });

  // AC 51.4: Labels without group labels
  it("AC 51.4: should format counter without labels", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    registry.counter("simple_total").inc();

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    const body = mockFetch.mock.calls[0][1].body;
    expect(body).toContain("simple_total 1");
  });

  // AC 51.5: URL construction
  it("AC 51.5: should build URL with grouping keys", async () => {
    const extendedConfig: PrometheusPushExporterConfig = {
      ...config,
      groupingLabels: { dc: "us-east-1", rack: "rack-42" },
    };
    const exporter = new PrometheusPushExporter(registry, extendedConfig);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("job/sqlvec-db");
    expect(url).toContain("instance/node-1");
    expect(url).toContain("dc/us-east-1");
    expect(url).toContain("rack/rack-42");
  });

  // AC 51.6: HTTP push with ok response
  it("AC 51.6: should succeed on 200 OK", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await expect(exporter.push()).resolves.toBeUndefined();
  });

  // AC 51.7: PushGateway error handling
  it("AC 51.7: should throw on non-ok response", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: "Service Unavailable" });

    await expect(exporter.push()).rejects.toThrow("503");
  });

  // AC 51.8: Push timeout
  it("AC 51.8: should throw on fetch abort", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new DOMException("The operation was aborted", "AbortError"));

    await expect(exporter.push()).rejects.toThrow();
  });

  // AC 51.9: Label value escaping
  it("AC 51.9: should escape special characters in label values", async () => {
    const exporter = new PrometheusPushExporter(registry, config);

    registry.counter("test_metric", { path: '/path/with"quotes"and\nnewlines' }).inc();

    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({ ok: true });

    await exporter.push();

    const body = mockFetch.mock.calls[0][1].body;
    expect(body).toContain('path="');
    expect(body).toContain('\\"');
    expect(body).toContain('\\n');
  });

  // AC 51.10: Start/stop lifecycle
  it("AC 51.10: start/stop should set/clear interval", async () => {
    vi.useFakeTimers();

    const exporter = new PrometheusPushExporter(registry, {
      ...config,
      pushIntervalMs: 5000,
    });

    const pushSpy = vi.spyOn(exporter, "push");

    exporter.start();
    expect(pushSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(pushSpy).toHaveBeenCalledTimes(1);

    exporter.stop();
    vi.advanceTimersByTime(10000);
    expect(pushSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
