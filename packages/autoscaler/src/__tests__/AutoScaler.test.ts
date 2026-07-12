import { describe, it, expect } from 'vitest';
import { InMemoryAutoScaler } from '../impl/InMemoryAutoScaler.js';
import type { AutoScalerMetrics } from '../interfaces/types.js';

describe('InMemoryAutoScaler', () => {
  it('returns null when metrics are within bounds', async () => {
    const scaler = new InMemoryAutoScaler();
    const metrics: AutoScalerMetrics = { cpu: 0.5, qps: 1000, latency: 50, connectionCount: 5 };
    const result = await scaler.evaluate(metrics);
    expect(result).toBeNull();
  });

  it('returns scale_up when CPU exceeds threshold', async () => {
    const scaler = new InMemoryAutoScaler();
    const metrics: AutoScalerMetrics = { cpu: 0.9, qps: 1000, latency: 50, connectionCount: 5 };
    const result = await scaler.evaluate(metrics);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('scale_up');
  });

  it('returns scale_down when CPU is below threshold', async () => {
    const scaler = new InMemoryAutoScaler();
    const metrics: AutoScalerMetrics = { cpu: 0.1, qps: 100, latency: 10, connectionCount: 2 };
    const result = await scaler.evaluate(metrics);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('scale_down');
  });

  it('handles configure updates correctly', async () => {
    const scaler = new InMemoryAutoScaler();
    scaler.configure(2, 20, 0.5, 0.1);
    const metrics: AutoScalerMetrics = { cpu: 0.6, qps: 100, latency: 10, connectionCount: 2 };
    const result = await scaler.evaluate(metrics);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('scale_up');
  });

  it('returns scale_up on high QPS even if CPU is low', async () => {
    const scaler = new InMemoryAutoScaler();
    const metrics: AutoScalerMetrics = { cpu: 0.3, qps: 15000, latency: 100, connectionCount: 10 };
    const result = await scaler.evaluate(metrics);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('scale_up');
  });

  it('tracks history of all evaluations', async () => {
    const scaler = new InMemoryAutoScaler();
    await scaler.evaluate({ cpu: 0.9, qps: 100, latency: 50, connectionCount: 5 });
    await scaler.evaluate({ cpu: 0.5, qps: 100, latency: 50, connectionCount: 5 });
    await scaler.evaluate({ cpu: 0.1, qps: 100, latency: 50, connectionCount: 5 });
    expect(scaler.getHistory()).toHaveLength(2);
  });

  it('empty history before any evaluations', () => {
    const scaler = new InMemoryAutoScaler();
    expect(scaler.getHistory()).toEqual([]);
  });

  it('scale_up includes reason', async () => {
    const scaler = new InMemoryAutoScaler();
    const result = await scaler.evaluate({ cpu: 0.95, qps: 100, latency: 50, connectionCount: 5 });
    expect(result!.reason).toContain('CPU at 95%');
  });

  it('scale_down includes reason', async () => {
    const scaler = new InMemoryAutoScaler();
    const result = await scaler.evaluate({ cpu: 0.1, qps: 100, latency: 50, connectionCount: 5 });
    expect(result!.reason).toContain('CPU at 10%');
  });

  it('handles zero metrics gracefully', async () => {
    const scaler = new InMemoryAutoScaler();
    const result = await scaler.evaluate({ cpu: 0, qps: 0, latency: 0, connectionCount: 0 });
    expect(result).toBeNull();
  });

  it('returns null when CPU is exactly at threshold', async () => {
    const scaler = new InMemoryAutoScaler();
    scaler.configure(1, 10, 0.5, 0.5);
    const result = await scaler.evaluate({ cpu: 0.5, qps: 1000, latency: 50, connectionCount: 5 });
    expect(result).toBeNull();
  });
});
