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
