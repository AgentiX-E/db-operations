import { describe, it, expect, vi } from 'vitest';
import type {
  IBackupManager,
  IPITRManager,
  IStorageBackend,
  BackupEntry,
  RestorePoint,
  BackupMetadata,
} from '../interfaces/index.js';

describe('IBackupManager', () => {
  const backupEntry: BackupEntry = {
    id: 'backup-1',
    database: 'production-db',
    type: 'full',
    sizeBytes: 1073741824,
    createdAt: new Date(),
    status: 'completed',
    tags: ['weekly', 'automated'],
  };

  const mockBackupManager: IBackupManager = {
    createBackup: vi.fn().mockResolvedValue('backup-1'),
    restore: vi.fn().mockResolvedValue(undefined),
    listBackups: vi.fn().mockResolvedValue([backupEntry]),
    deleteBackup: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue('completed'),
  };

  it('should create a backup', async () => {
    const metadata: BackupMetadata = { database: 'production-db', type: 'full', description: 'Weekly full backup' };
    const id = await mockBackupManager.createBackup(metadata);
    expect(id).toBe('backup-1');
  });

  it('should restore from a backup', async () => {
    await expect(mockBackupManager.restore('backup-1')).resolves.toBeUndefined();
  });

  it('should list backups', async () => {
    const backups = await mockBackupManager.listBackups({ database: 'production-db' });
    expect(backups.length).toBeGreaterThan(0);
    expect(backups[0]).toHaveProperty('id');
    expect(backups[0]).toHaveProperty('type');
  });

  it('should delete a backup', async () => {
    await expect(mockBackupManager.deleteBackup('backup-1')).resolves.toBeUndefined();
  });

  it('should get backup status', async () => {
    const status = await mockBackupManager.getStatus('backup-1');
    expect(status).toBe('completed');
  });

  it('should create a valid backup entry', () => {
    expect(backupEntry).toHaveProperty('database');
    expect(backupEntry).toHaveProperty('sizeBytes');
    expect(backupEntry).toHaveProperty('status');
    expect(['pending', 'running', 'completed', 'failed', 'expired']).toContain(backupEntry.status);
  });
});

describe('IPITRManager', () => {
  const restorePoint: RestorePoint = {
    id: 'pitr-1',
    timestamp: new Date(),
    database: 'production-db',
    type: 'log',
    sizeBytes: 524288000,
  };

  const mockPITR: IPITRManager = {
    createRestorePoint: vi.fn().mockResolvedValue('pitr-1'),
    restoreToPointInTime: vi.fn().mockResolvedValue(undefined),
    listRestorePoints: vi.fn().mockResolvedValue([restorePoint]),
    getRecoveryWindow: vi.fn().mockResolvedValue({ earliest: new Date('2024-01-01'), latest: new Date('2024-12-31') }),
  };

  it('should create a restore point', async () => {
    const id = await mockPITR.createRestorePoint(new Date());
    expect(id).toBe('pitr-1');
  });

  it('should restore to point in time', async () => {
    await expect(mockPITR.restoreToPointInTime(new Date('2024-06-15'))).resolves.toBeUndefined();
  });

  it('should list restore points', async () => {
    const points = await mockPITR.listRestorePoints();
    expect(points.length).toBeGreaterThan(0);
    expect(points[0]).toHaveProperty('type');
  });

  it('should get recovery window', async () => {
    const window = await mockPITR.getRecoveryWindow();
    expect(window.earliest).toBeInstanceOf(Date);
    expect(window.latest).toBeInstanceOf(Date);
  });
});

describe('IStorageBackend', () => {
  const mockStorage: IStorageBackend = {
    upload: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(Buffer.from('mock-backup-data')),
    exists: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(undefined),
    getUsage: vi.fn().mockResolvedValue({ totalBytes: 1_000_000_000_000, usedBytes: 500_000_000_000, freeBytes: 500_000_000_000, backupCount: 10 }),
  };

  it('should upload data', async () => {
    await expect(mockStorage.upload('backup-1', Buffer.from('data'), {})).resolves.toBeUndefined();
  });

  it('should download data', async () => {
    const data = await mockStorage.download('backup-1');
    expect(data.toString()).toBe('mock-backup-data');
  });

  it('should check existence', async () => {
    const result = await mockStorage.exists('backup-1');
    expect(result).toBe(true);
  });

  it('should delete data', async () => {
    await expect(mockStorage.delete('backup-1')).resolves.toBeUndefined();
  });

  it('should get usage statistics', async () => {
    const usage = await mockStorage.getUsage();
    expect(usage.totalBytes).toBeGreaterThan(0);
    expect(usage.usedBytes + usage.freeBytes).toBe(usage.totalBytes);
    expect(usage.backupCount).toBe(10);
  });
});
