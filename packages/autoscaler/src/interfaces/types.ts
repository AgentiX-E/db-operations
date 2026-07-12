export interface ScaleAction {
  action: 'scale_up' | 'scale_down';
  amount: number;
  reason: string;
}

export interface AutoScalerMetrics {
  cpu: number;
  qps: number;
  latency: number;
  connectionCount: number;
}
