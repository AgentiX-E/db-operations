import { describe, it, expect, vi } from 'vitest';
import type {
  IMetricsRegistry,
  ISlowQueryRecorder,
  IAlertRuleManager,
  IHealthCheck,
  SlowQueryRecord,
  AlertRule,
  ComponentStatus,
} from '../interfaces/index.js';

describe('IMetricsRegistry', () => {
  const mockRegistry: IMetricsRegistry = {
    incrementCounter: vi.fn(),
    observeHistogram: vi.fn(),
    setGauge: vi.fn(),
    snapshot: vi.fn().mockResolvedValue({ http_requests_total: 100 }),
    reset: vi.fn(),
  };

  it('should increment a counter', () => {
    mockRegistry.incrementCounter('http_requests_total', { method: 'GET' });
    expect(mockRegistry.incrementCounter).toHaveBeenCalledWith('http_requests_total', { method: 'GET' });
  });

  it('should observe a histogram value', () => {
    mockRegistry.observeHistogram('request_duration_ms', 150, { endpoint: '/api' });
    expect(mockRegistry.observeHistogram).toHaveBeenCalledWith('request_duration_ms', 150, { endpoint: '/api' });
  });

  it('should set a gauge', () => {
    mockRegistry.setGauge('active_connections', 42);
    expect(mockRegistry.setGauge).toHaveBeenCalledWith('active_connections', 42);
  });

  it('should take a snapshot', async () => {
    const snapshot = await mockRegistry.snapshot();
    expect(snapshot.http_requests_total).toBe(100);
  });

  it('should reset all metrics', () => {
    mockRegistry.reset();
    expect(mockRegistry.reset).toHaveBeenCalled();
  });
});

describe('ISlowQueryRecorder', () => {
  const createSlowQuery = (overrides: Partial<SlowQueryRecord> = {}): SlowQueryRecord => ({
    query: 'SELECT * FROM orders',
    durationMs: 2500,
    timestamp: new Date(),
    database: 'production',
    ...overrides,
  });

  const mockRecorder: ISlowQueryRecorder = {
    record: vi.fn().mockResolvedValue(undefined),
    getSlowQueries: vi.fn().mockResolvedValue([createSlowQuery()]),
    analyzePatterns: vi.fn().mockResolvedValue([
      { pattern: 'SELECT * FROM orders WHERE ...', averageDurationMs: 1200, count: 5, lastSeen: new Date() },
    ]),
  };

  it('should record a slow query', async () => {
    const query = createSlowQuery();
    await mockRecorder.record(query);
    expect(mockRecorder.record).toHaveBeenCalled();
  });

  it('should retrieve slow queries', async () => {
    const queries = await mockRecorder.getSlowQueries(1000);
    expect(queries[0].durationMs).toBeGreaterThanOrEqual(1000);
  });

  it('should analyze query patterns', async () => {
    const patterns = await mockRecorder.analyzePatterns();
    expect(patterns[0]).toHaveProperty('pattern');
    expect(patterns[0]).toHaveProperty('averageDurationMs');
    expect(patterns[0]).toHaveProperty('count');
  });

  it('should create a valid slow query record', () => {
    const query = createSlowQuery();
    expect(query).toHaveProperty('query');
    expect(query).toHaveProperty('durationMs');
    expect(query).toHaveProperty('database');
  });
});

describe('IAlertRuleManager', () => {
  const mockRuleManager: IAlertRuleManager = {
    createRule: vi.fn().mockResolvedValue('rule-1'),
    updateRule: vi.fn().mockResolvedValue(undefined),
    deleteRule: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue([
      { ruleId: 'rule-1', ruleName: 'High CPU', severity: 'critical', value: 95, threshold: 90, triggeredAt: new Date(), message: 'CPU usage exceeded 90%' },
    ]),
    silenceRule: vi.fn().mockResolvedValue(undefined),
  };

  it('should create a rule', async () => {
    const rule: AlertRule = { name: 'High CPU', metric: 'cpu_usage', condition: 'gt', threshold: 90, durationMs: 60000, severity: 'critical', enabled: true };
    const id = await mockRuleManager.createRule(rule);
    expect(id).toBe('rule-1');
  });

  it('should update a rule', async () => {
    await expect(mockRuleManager.updateRule('rule-1', { threshold: 95 })).resolves.toBeUndefined();
  });

  it('should delete a rule', async () => {
    await expect(mockRuleManager.deleteRule('rule-1')).resolves.toBeUndefined();
  });

  it('should evaluate rules', async () => {
    const alerts = await mockRuleManager.evaluate();
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].value).toBeGreaterThan(alerts[0].threshold);
  });

  it('should silence a rule', async () => {
    await expect(mockRuleManager.silenceRule('rule-1', 300000)).resolves.toBeUndefined();
  });
});

describe('IHealthCheck', () => {
  const componentStatus: ComponentStatus = { name: 'database', healthy: true, message: 'OK', lastChecked: new Date(), latencyMs: 5 };

  const mockHealthCheck: IHealthCheck = {
    check: vi.fn().mockResolvedValue({ overall: true, components: [componentStatus], timestamp: new Date() }),
    getHistory: vi.fn().mockResolvedValue([
      { overall: true, components: [componentStatus], timestamp: new Date() },
    ]),
    registerComponent: vi.fn(),
  };

  it('should perform a health check', async () => {
    const result = await mockHealthCheck.check();
    expect(result.overall).toBe(true);
    expect(result.components[0].healthy).toBe(true);
  });

  it('should get health check history', async () => {
    const history = await mockHealthCheck.getHistory(5);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should register a new component', () => {
    mockHealthCheck.registerComponent('cache', async () => ({ name: 'cache', healthy: true, message: 'OK', lastChecked: new Date(), latencyMs: 1 }));
    expect(mockHealthCheck.registerComponent).toHaveBeenCalled();
  });

  it('should create a valid component status', () => {
    expect(componentStatus).toHaveProperty('name');
    expect(componentStatus).toHaveProperty('healthy');
    expect(componentStatus).toHaveProperty('latencyMs');
  });
});
