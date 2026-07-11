/**
 * RetentionPolicyEvaluator — Evaluates snapshots against a retention policy.
 *
 * @module @agentix-e/db-operations-backup/impl
 */

import type { IBackupRetentionPolicy } from '../interfaces/index.js';
import type { BackupMetadata, RetentionPolicy } from '@agentix-e/db-operations-core/types';

/**
 * Evaluates which backup snapshots to prune based on a RetentionPolicy.
 *
 * Rules:
 * 1. Keep the first `maxFullSnapshots` full snapshots (sorted newest first).
 * 2. If `keepRecent` is set, snapshots younger than that are skipped.
 * 3. If `minAge` is set, only snapshots at least that old are deletable.
 * 4. Enforce `maxTotalBytes` — excess bytes beyond the limit are deleted.
 */
export class RetentionPolicyEvaluator implements IBackupRetentionPolicy {
  private policy: RetentionPolicy;

  constructor(policy: RetentionPolicy) {
    this.policy = { ...policy };
  }

  /** @inheritdoc */
  evaluate(snapshots: BackupMetadata[]): BackupMetadata[] {
    const toDelete: BackupMetadata[] = [];

    if (snapshots.length === 0) {
      return toDelete;
    }

    // Sort newest first by createdAt
    const sorted = [...snapshots].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Keep first maxFullSnapshots full snapshots
    const fullSnapshots = sorted.filter(s => s.type === 'full');
    const remainingFull = fullSnapshots.slice(this.policy.maxFullSnapshots);

    // Collect candidates from the remaining full snapshots pool
    const candidates = sorted.filter(s => remainingFull.includes(s));

    for (const snap of candidates) {
      // Skip if keepRecent is set and snapshot is younger than the duration
      if (this.policy.keepRecent) {
        const age = Date.now() - new Date(snap.createdAt).getTime();
        const keepRecentMs = parseDurationToMs(this.policy.keepRecent);
        if (age < keepRecentMs) {
          continue;
        }
      }

      // Skip if minAge is set and snapshot not old enough
      if (this.policy.minAge) {
        const age = Date.now() - new Date(snap.createdAt).getTime();
        const minAgeMs = parseDurationToMs(this.policy.minAge);
        if (age < minAgeMs) {
          continue;
        }
      }

      toDelete.push(snap);
    }

    // Enforce maxTotalBytes — if total exceeds limit, mark for deletion
    if (this.policy.maxTotalBytes > 0) {
      const remainingSnapshots = sorted.filter(s => !toDelete.includes(s));
      const totalBytes = remainingSnapshots.reduce((sum, s) => sum + s.sizeBytes, 0);
      if (totalBytes > this.policy.maxTotalBytes) {
        // Mark oldest non-kept snapshots for deletion until under limit
        const orderedByAge = [...remainingSnapshots].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        let excess = totalBytes - this.policy.maxTotalBytes;
        for (const snap of orderedByAge) {
          if (excess <= 0) break;
          if (!toDelete.includes(snap)) {
            toDelete.push(snap);
            excess -= snap.sizeBytes;
          }
        }
      }
    }

    return toDelete;
  }

  /** @inheritdoc */
  getConfig(): RetentionPolicy {
    return { ...this.policy };
  }

  /** @inheritdoc */
  updateConfig(config: Partial<RetentionPolicy>): void {
    this.policy = { ...this.policy, ...config };
  }
}

/**
 * Parse a simple ISO-8601 duration string to milliseconds.
 * Supports days (P7D), hours (PT1H), minutes (PT30M), seconds (PT30S).
 */
function parseDurationToMs(duration: string): number {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) {
    // Fallback: try to parse as a plain number of hours
    const hours = Number(duration);
    if (!Number.isNaN(hours)) {
      return hours * 3_600_000;
    }
    return 0;
  }

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);

  return (
    days * 86_400_000 +
    hours * 3_600_000 +
    minutes * 60_000 +
    seconds * 1_000
  );
}
