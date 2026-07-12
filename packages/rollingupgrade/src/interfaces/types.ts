export interface UpgradePhase {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface UpgradePlan {
  nodes: string[];
  batchSize: number;
  preScript: string;
  postScript: string;
}
