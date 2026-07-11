/**
 * InMemoryBackupManager — Simulates backup orchestration entirely in memory.
 *
 * @module @agentix-e/db-operations-backup/impl
 */

import type { IBackupManager, IStorageBackend, IBackupRetentionPolicy, CreateBackupOptions, ListBackupsOptions, RestoreOptions } from '../interfaces/index.js';
import type { BackupMetadata, BackupResult, RestoreResult, PITRTarget } from '@agentix-e/db-operations-core/types';

/** Simple counter for generating unique IDs. */
let idCounter = 0;

/**
 * Generate a unique snapshot ID.
 */
function generateSnapshotId(): string {
  idCounter += 1;
  const ts = Date.now().toString(36);
  const seq = idCounter.toString(36);
  return `snap-${ts}-${seq}`;
}

/**
 * Simulate a delay for async backup operations.
 */
const simulateWork = (ms = 5): Promise<void> => new Promise(r => setTimeout(r, ms));

/**
 * In-memory implementation of IBackupManager.
 *
 * Stores all snapshot metadata in a Map and delegates storage/retention
 * to injected IStorageBackend and IBackupRetentionPolicy instances.
 */
export class InMemoryBackupManager implements IBackupManager {
  private readonly snapshots: Map<string, BackupMetadata> = new Map();

  constructor(
    private readonly storage: IStorageBackend,
    private readonly retention: IBackupRetentionPolicy,
  ) {}

  /** @inheritdoc */
  async createBackup(options: CreateBackupOptions): Promise<BackupResult> {
    const id = generateSnapshotId();
    const now = new Date().toISOString();

    const snapshot: BackupMetadata = {
      snapshotId: id,
      type: options.type,
      state: 'in-progress',
      createdAt: now,
      sizeBytes: 1024,
      fileCount: 1,
      location: `/backups/${id}`,
    };

    this.snapshots.set(id, snapshot);

    // Simulate backup work
    await simulateWork();

    // Mark as completed
    snapshot.state = 'completed';
    snapshot.completedAt = new Date().toISOString();

    return { success: true, snapshot };
  }

  /** @inheritdoc */
  async listBackups(options?: ListBackupsOptions): Promise<BackupMetadata[]> {
    let results = Array.from(this.snapshots.values());

    if (options?.type) {
      results = results.filter(s => s.type === options.type);
    }

    if (options?.newerThan) {
      const newerThanMs = new Date(options.newerThan).getTime();
      results = results.filter(s => new Date(s.createdAt).getTime() > newerThanMs);
    }

    // Sort by createdAt descending (newest first)
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit !== undefined && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /** @inheritdoc */
  async getBackup(snapshotId: string): Promise<BackupMetadata | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  /** @inheritdoc */
  async deleteBackup(snapshotId: string): Promise<boolean> {
    return this.snapshots.delete(snapshotId);
  }

  /** @inheritdoc */
  async restoreFromSnapshot(snapshotId: string, _options?: RestoreOptions): Promise<RestoreResult> {
    if (!this.snapshots.has(snapshotId)) {
      return { success: false, error: 'not found', durationMs: 0 };
    }

    return { success: true, durationMs: 10, recoveryPoint: snapshotId };
  }

  /** @inheritdoc */
  async pitr(target: PITRTarget, _options?: RestoreOptions): Promise<RestoreResult> {
    const recoveryPoint = target.targetTime ?? target.targetLsn ?? 'unknown';

    return { success: true, durationMs: 20, recoveryPoint };
  }

  /** @inheritdoc */
  async prune(): Promise<number> {
    const allSnapshots = Array.from(this.snapshots.values());
    const deletable = this.retention.evaluate(allSnapshots);

    for (const snap of deletable) {
      this.snapshots.delete(snap.snapshotId);
    }

    return deletable.length;
  }
}
