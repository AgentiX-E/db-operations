import { describe, it, expect, vi } from 'vitest';
import type {
  IBackupManager,
  IPITRManager,
  IStorageBackend,
  BackupEntry,
  RestorePoint,
  BackupMetadata,
  IBackupScheduleConfig,
  IBackupScheduler,
  IBackupManifest,
  IBackupRetentionRule,
  IBackupRetentionPolicy,
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

// ── Sprint 1.2: New Interface Tests ──

describe('IBackupScheduleConfig', () => {
  it('should create a valid schedule config', () => {
    const config: IBackupScheduleConfig = {
      enabled: true,
      intervalMs: 86400000,
      retentionCount: 7,
    };
    expect(config.enabled).toBe(true);
    expect(config.intervalMs).toBe(86400000);
    expect(config.retentionCount).toBe(7);
  });

  it('should have all required properties', () => {
    const config: IBackupScheduleConfig = {
      enabled: false,
      intervalMs: 3600000,
      retentionCount: 30,
    };
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('intervalMs');
    expect(config).toHaveProperty('retentionCount');
  });
});

describe('IBackupScheduler', () => {
  const mockScheduler: IBackupScheduler = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getNextScheduled: vi.fn().mockResolvedValue(new Date(Date.now() + 3600000)),
    triggerNow: vi.fn().mockResolvedValue('backup-42'),
    onBackupReady: vi.fn(),
  };

  it('should start the scheduler', async () => {
    await expect(mockScheduler.start()).resolves.toBeUndefined();
  });

  it('should stop the scheduler', async () => {
    await expect(mockScheduler.stop()).resolves.toBeUndefined();
  });

  it('should get next scheduled backup time', async () => {
    const next = await mockScheduler.getNextScheduled();
    expect(next).toBeInstanceOf(Date);
    expect(next!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should return null when no backup is scheduled', async () => {
    const noopScheduler: IBackupScheduler = {
      start: vi.fn(),
      stop: vi.fn(),
      getNextScheduled: vi.fn().mockResolvedValue(null),
      triggerNow: vi.fn(),
      onBackupReady: vi.fn(),
    };
    const next = await noopScheduler.getNextScheduled();
    expect(next).toBeNull();
  });

  it('should trigger an immediate backup', async () => {
    const backupId = await mockScheduler.triggerNow();
    expect(typeof backupId).toBe('string');
    expect(backupId).toBe('backup-42');
  });

  it('should register backup ready callback', () => {
    const callback = vi.fn();
    mockScheduler.onBackupReady(callback);
    expect(mockScheduler.onBackupReady).toHaveBeenCalledWith(callback);
  });
});

describe('IBackupManifest', () => {
  it('should create a valid backup manifest', () => {
    const manifest: IBackupManifest = {
      id: 'backup-1',
      metadata: { database: 'prod', type: 'full' },
      status: 'completed',
      sizeBytes: 1048576,
      createdAt: new Date(),
    };
    expect(manifest.id).toBe('backup-1');
    expect(manifest.status).toBe('completed');
    expect(manifest.metadata.database).toBe('prod');
  });

  it('should have all required properties', () => {
    const manifest: IBackupManifest = {
      id: 'backup-2',
      metadata: { database: 'staging', type: 'incremental' },
      status: 'running',
      sizeBytes: 0,
      createdAt: new Date(),
    };
    expect(manifest).toHaveProperty('id');
    expect(manifest).toHaveProperty('metadata');
    expect(manifest).toHaveProperty('status');
    expect(manifest).toHaveProperty('sizeBytes');
    expect(manifest).toHaveProperty('createdAt');
  });
});

describe('IBackupRetentionRule', () => {
  it('should create a valid retention rule', () => {
    const rule: IBackupRetentionRule = {
      maxCount: 7,
      maxAgeDays: 30,
      minInterval: 24,
    };
    expect(rule.maxCount).toBe(7);
    expect(rule.maxAgeDays).toBe(30);
    expect(rule.minInterval).toBe(24);
  });

  it('should have all required properties', () => {
    const rule: IBackupRetentionRule = {
      maxCount: 14,
      maxAgeDays: 60,
      minInterval: 12,
    };
    expect(rule).toHaveProperty('maxCount');
    expect(rule).toHaveProperty('maxAgeDays');
    expect(rule).toHaveProperty('minInterval');
  });
});

describe('IBackupRetentionPolicy', () => {
  const mockManifests: IBackupManifest[] = [
    { id: 'b1', metadata: { database: 'prod', type: 'full' }, status: 'completed', sizeBytes: 100, createdAt: new Date('2025-01-01') },
    { id: 'b2', metadata: { database: 'prod', type: 'full' }, status: 'completed', sizeBytes: 100, createdAt: new Date('2025-01-02') },
    { id: 'b3', metadata: { database: 'prod', type: 'full' }, status: 'completed', sizeBytes: 100, createdAt: new Date('2025-01-03') },
  ];

  const mockRules: IBackupRetentionRule[] = [
    { maxCount: 2, maxAgeDays: 7, minInterval: 24 },
  ];

  const mockPolicy: IBackupRetentionPolicy = {
    evaluate: vi.fn().mockResolvedValue([mockManifests[0]]),
    getPolicy: vi.fn().mockResolvedValue(mockRules),
    setPolicy: vi.fn().mockResolvedValue(undefined),
  };

  it('should evaluate manifests and return deletable ones', async () => {
    const deletable = await mockPolicy.evaluate(mockManifests);
    expect(Array.isArray(deletable)).toBe(true);
    expect(deletable.length).toBeGreaterThan(0);
    expect(deletable[0]).toHaveProperty('id');
  });

  it('should return empty array when no backups need deletion', async () => {
    const strictPolicy: IBackupRetentionPolicy = {
      evaluate: vi.fn().mockResolvedValue([]),
      getPolicy: vi.fn(),
      setPolicy: vi.fn(),
    };
    const deletable = await strictPolicy.evaluate(mockManifests);
    expect(deletable).toHaveLength(0);
  });

  it('should get current policy rules', async () => {
    const rules = await mockPolicy.getPolicy();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules[0].maxCount).toBe(2);
  });

  it('should set new policy rules', async () => {
    const newRules: IBackupRetentionRule[] = [
      { maxCount: 14, maxAgeDays: 60, minInterval: 12 },
    ];
    await expect(mockPolicy.setPolicy(newRules)).resolves.toBeUndefined();
  });
});
