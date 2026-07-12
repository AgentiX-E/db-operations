import type { UpgradePhase, UpgradePlan } from './types.js';

export type { UpgradePhase, UpgradePlan };

export interface IRollingUpgrade {
  execute(plan: UpgradePlan): Promise<UpgradePhase[]>;
  getStatus(): UpgradePhase[];
  rollback(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}
