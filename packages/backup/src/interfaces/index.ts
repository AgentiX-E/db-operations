// ── Existing Interfaces ──

export interface IBackupManager {
  /** Create a new backup */
  createBackup(metadata: BackupMetadata): Promise<string>;
  /** Restore from a specific backup */
  restore(backupId: string, targetDatabase?: string): Promise<void>;
  /** List all available backups */
  listBackups(filters?: BackupFilter): Promise<BackupEntry[]>;
  /** Delete a backup */
  deleteBackup(backupId: string): Promise<void>;
  /** Get backup status */
  getStatus(backupId: string): Promise<BackupStatus>;
}

export interface BackupMetadata {
  database: string;
  type: 'full' | 'incremental' | 'differential';
  description?: string;
  tags?: string[];
  retentionDays?: number;
}

export interface BackupEntry {
  id: string;
  database: string;
  type: 'full' | 'incremental' | 'differential';
  sizeBytes: number;
  createdAt: Date;
  status: BackupStatus;
  description?: string;
  tags: string[];
}

export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'expired';

export interface BackupFilter {
  database?: string;
  type?: 'full' | 'incremental' | 'differential';
  status?: BackupStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface IPITRManager {
  /** Create a restore point in time */
  createRestorePoint(timestamp: Date): Promise<string>;
  /** Restore database to a specific point in time */
  restoreToPointInTime(targetTimestamp: Date, targetDatabase?: string): Promise<void>;
  /** List available PITR restore points */
  listRestorePoints(): Promise<RestorePoint[]>;
  /** Get recovery window details */
  getRecoveryWindow(): Promise<{ earliest: Date; latest: Date }>;
}

export interface RestorePoint {
  id: string;
  timestamp: Date;
  database: string;
  type: 'full' | 'log';
  sizeBytes: number;
}

export interface IStorageBackend {
  /** Upload backup data */
  upload(backupId: string, data: Buffer, metadata: Record<string, unknown>): Promise<void>;
  /** Download backup data */
  download(backupId: string): Promise<Buffer>;
  /** Check if backup exists */
  exists(backupId: string): Promise<boolean>;
  /** Delete backup data */
  delete(backupId: string): Promise<void>;
  /** Get storage usage statistics */
  getUsage(): Promise<StorageUsage>;
}

export interface StorageUsage {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  backupCount: number;
}

// ── Sprint 1.2 New Interfaces ──

export interface IBackupScheduleConfig {
  /** Whether the scheduled backup is enabled */
  enabled: boolean;
  /** Interval between scheduled backups in milliseconds */
  intervalMs: number;
  /** Number of backups to retain (FIFO rotation) */
  retentionCount: number;
}

export interface IBackupScheduler {
  /** Start the backup scheduler */
  start(): Promise<void>;
  /** Stop the backup scheduler */
  stop(): Promise<void>;
  /** Get the timestamp of the next scheduled backup */
  getNextScheduled(): Promise<Date | null>;
  /** Trigger an immediate backup outside the normal schedule */
  triggerNow(): Promise<string>;
  /** Callback invoked when a scheduled backup completes and is ready */
  onBackupReady(callback: (backupId: string) => void): void;
}

export interface IBackupManifest {
  /** Unique backup identifier */
  id: string;
  /** Backup metadata */
  metadata: BackupMetadata;
  /** Current backup status */
  status: BackupStatus;
  /** Backup size in bytes */
  sizeBytes: number;
  /** Timestamp when the backup was created */
  createdAt: Date;
}

export interface IBackupRetentionRule {
  /** Maximum number of backups to retain */
  maxCount: number;
  /** Maximum age of a backup in days before it can be removed */
  maxAgeDays: number;
  /** Minimum interval in hours between retained backups */
  minInterval: number;
}

export interface IBackupRetentionPolicy {
  /** Evaluate a list of backup manifests and return those eligible for deletion */
  evaluate(manifests: IBackupManifest[]): Promise<IBackupManifest[]>;
  /** Get the current retention policy configuration */
  getPolicy(): Promise<IBackupRetentionRule[]>;
  /** Set a new retention policy configuration */
  setPolicy(rules: IBackupRetentionRule[]): Promise<void>;
}
