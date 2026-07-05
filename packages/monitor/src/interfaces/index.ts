export interface IMetricsRegistry {
  /** Increment a counter metric */
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
  /** Observe a histogram value */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  /** Set a gauge value */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  /** Get snapshot of all registered metrics */
  snapshot(): Promise<Record<string, unknown>>;
  /** Reset all metrics */
  reset(): void;
}

export interface ISlowQueryRecorder {
  /** Record a slow query event */
  record(query: SlowQueryRecord): Promise<void>;
  /** Get slow queries exceeding a threshold duration */
  getSlowQueries(thresholdMs: number): Promise<SlowQueryRecord[]>;
  /** Analyze query patterns to detect anomalies */
  analyzePatterns(): Promise<QueryPattern[]>;
}

export interface SlowQueryRecord {
  query: string;
  durationMs: number;
  timestamp: Date;
  database: string;
  user?: string;
  rowsExamined?: number;
  rowsSent?: number;
}

export interface QueryPattern {
  pattern: string;
  averageDurationMs: number;
  count: number;
  lastSeen: Date;
}

export interface IAlertRuleManager {
  /** Create a new alert rule */
  createRule(rule: AlertRule): Promise<string>;
  /** Update an existing alert rule */
  updateRule(id: string, rule: Partial<AlertRule>): Promise<void>;
  /** Delete an alert rule */
  deleteRule(id: string): Promise<void>;
  /** Evaluate all rules and return triggered alerts */
  evaluate(): Promise<TriggeredAlert[]>;
  /** Silence a rule for a specified duration */
  silenceRule(id: string, durationMs: number): Promise<void>;
}

export interface AlertRule {
  id?: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  durationMs: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export interface TriggeredAlert {
  ruleId: string;
  ruleName: string;
  severity: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  message: string;
}

export interface IHealthCheck {
  /** Perform a health check and return the result */
  check(): Promise<HealthCheckResult>;
  /** Get health check history */
  getHistory(limit?: number): Promise<HealthCheckResult[]>;
  /** Register a new health check component */
  registerComponent(name: string, checkFn: () => Promise<ComponentStatus>): void;
}

export interface ComponentStatus {
  name: string;
  healthy: boolean;
  message?: string;
  lastChecked: Date;
  latencyMs: number;
}

export interface HealthCheckResult {
  overall: boolean;
  components: ComponentStatus[];
  timestamp: Date;
}
