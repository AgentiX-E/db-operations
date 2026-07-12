import type { ScaleAction, AutoScalerMetrics } from './types.js';

export type { ScaleAction, AutoScalerMetrics };

export interface IAutoScaler {
  evaluate(metrics: AutoScalerMetrics): Promise<ScaleAction | null>;
  getHistory(): ScaleAction[];
  configure(min: number, max: number, scaleUpThreshold: number, scaleDownThreshold: number): void;
}
