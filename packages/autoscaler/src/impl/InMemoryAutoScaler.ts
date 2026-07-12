import type { IAutoScaler } from '../interfaces/index.js';
import type { ScaleAction, AutoScalerMetrics } from '../interfaces/types.js';

export class InMemoryAutoScaler implements IAutoScaler {
  private history: ScaleAction[] = [];
  private min = 1;
  private max = 10;
  private scaleUpThreshold = 0.8;
  private scaleDownThreshold = 0.2;

  configure(min: number, max: number, scaleUpThreshold: number, scaleDownThreshold: number): void {
    this.min = min;
    this.max = max;
    this.scaleUpThreshold = scaleUpThreshold;
    this.scaleDownThreshold = scaleDownThreshold;
  }

  async evaluate(metrics: AutoScalerMetrics): Promise<ScaleAction | null> {
    if (metrics.cpu > this.scaleUpThreshold || metrics.qps >= 10000) {
      const action: ScaleAction = {
        action: 'scale_up',
        amount: Math.ceil((metrics.cpu - this.scaleUpThreshold) * 10) || 1,
        reason: `CPU at ${(metrics.cpu * 100).toFixed(0)}% exceeding threshold ${(this.scaleUpThreshold * 100).toFixed(0)}%`,
      };
      this.history.push(action);
      return action;
    }
    if (metrics.cpu < this.scaleDownThreshold) {
      const action: ScaleAction = {
        action: 'scale_down',
        amount: 1,
        reason: `CPU at ${(metrics.cpu * 100).toFixed(0)}% below threshold ${(this.scaleDownThreshold * 100).toFixed(0)}%`,
      };
      this.history.push(action);
      return action;
    }
    return null;
  }

  getHistory(): ScaleAction[] {
    return [...this.history];
  }
}
