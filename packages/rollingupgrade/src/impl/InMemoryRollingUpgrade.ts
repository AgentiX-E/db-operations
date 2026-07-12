import type { IRollingUpgrade } from '../interfaces/index.js';
import type { UpgradePhase, UpgradePlan } from '../interfaces/types.js';

export class InMemoryRollingUpgrade implements IRollingUpgrade {
  private phases: UpgradePhase[] = [];
  private paused = false;
  private currentStep = 0;

  async execute(plan: UpgradePlan): Promise<UpgradePhase[]> {
    this.phases = [];
    this.currentStep = 0;
    this.paused = false;

    // Pre-script phase
    this.phases.push({ step: `pre-script: ${plan.preScript}`, status: 'running' });
    this.phases.push({ step: `pre-script: ${plan.preScript}`, status: 'completed' });

    // Batch upgrade phases
    const batches = Math.ceil(plan.nodes.length / plan.batchSize);
    for (let i = 0; i < batches; i++) {
      const batchNodes = plan.nodes.slice(i * plan.batchSize, (i + 1) * plan.batchSize);
      const step = `upgrade-batch-${i + 1}: ${batchNodes.join(',')}`;

      if (this.paused) {
        this.phases.push({ step, status: 'pending' });
        continue;
      }

      this.phases.push({ step, status: 'running' });
      this.currentStep++;
      this.phases.push({ step, status: 'completed' });
    }

    // Post-script phase
    if (!this.paused) {
      this.phases.push({ step: `post-script: ${plan.postScript}`, status: 'running' });
      this.phases.push({ step: `post-script: ${plan.postScript}`, status: 'completed' });
    }

    return this.getStatus();
  }

  getStatus(): UpgradePhase[] {
    return [...this.phases];
  }

  async rollback(): Promise<void> {
    this.phases = this.phases.map(p =>
      p.status === 'running' ? { ...p, status: 'failed' as const } : p,
    );
    this.paused = false;
    this.currentStep = 0;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
  }
}
