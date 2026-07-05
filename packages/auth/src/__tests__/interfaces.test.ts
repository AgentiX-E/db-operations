import { describe, it, expect, vi } from 'vitest';
import type {
  IRBACProvider,
  IAuthProvider,
  ITLSManager,
  IAuditStore,
  AuditEvent,
  AuditQuery,
} from '../interfaces/index.js';

function createMockAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    timestamp: new Date(),
    userId: 'user-1',
    action: 'read',
    resource: 'db:orders',
    result: 'success',
    details: {},
    ...overrides,
  };
}

describe('IRBACProvider', () => {
  const mockRBAC: IRBACProvider = {
    checkPermission: vi.fn().mockResolvedValue(true),
    assignRole: vi.fn().mockResolvedValue(undefined),
    revokeRole: vi.fn().mockResolvedValue(undefined),
    getUserRoles: vi.fn().mockResolvedValue(['admin', 'operator']),
  };

  it('should check permission', async () => {
    const result = await mockRBAC.checkPermission('admin', 'write', 'db:orders');
    expect(result).toBe(true);
  });

  it('should assign a role', async () => {
    await expect(mockRBAC.assignRole('user-1', 'operator')).resolves.toBeUndefined();
  });

  it('should revoke a role', async () => {
    await expect(mockRBAC.revokeRole('user-1', 'operator')).resolves.toBeUndefined();
  });

  it('should list user roles', async () => {
    const roles = await mockRBAC.getUserRoles('user-1');
    expect(roles).toContain('admin');
    expect(roles).toContain('operator');
  });
});

describe('IAuthProvider', () => {
  const mockAuth: IAuthProvider = {
    authenticate: vi.fn().mockResolvedValue({ token: 'mock-token', expiresAt: new Date('2099-12-31') }),
    validateToken: vi.fn().mockResolvedValue({ userId: 'user-1', roles: ['admin'] }),
    revokeToken: vi.fn().mockResolvedValue(undefined),
  };

  it('should authenticate user', async () => {
    const result = await mockAuth.authenticate('admin', 'password');
    expect(result.token).toBe('mock-token');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('should validate a token', async () => {
    const result = await mockAuth.validateToken('mock-token');
    expect(result.userId).toBe('user-1');
    expect(result.roles).toContain('admin');
  });

  it('should revoke a token', async () => {
    await expect(mockAuth.revokeToken('mock-token')).resolves.toBeUndefined();
  });
});

describe('ITLSManager', () => {
  const mockTLS: ITLSManager = {
    getConfig: vi.fn().mockResolvedValue({ cert: 'cert-pem', key: 'key-pem', ca: 'ca-pem' }),
    rotateCertificates: vi.fn().mockResolvedValue(undefined),
    validateExpiration: vi.fn().mockResolvedValue({ valid: true, daysRemaining: 30 }),
  };

  it('should get TLS config', async () => {
    const config = await mockTLS.getConfig();
    expect(config.cert).toBe('cert-pem');
    expect(config.key).toBe('key-pem');
  });

  it('should rotate certificates', async () => {
    await expect(mockTLS.rotateCertificates('new-cert', 'new-key')).resolves.toBeUndefined();
  });

  it('should validate expiration', async () => {
    const result = await mockTLS.validateExpiration();
    expect(result.valid).toBe(true);
    expect(result.daysRemaining).toBeGreaterThan(0);
  });
});

describe('IAuditStore', () => {
  const events: AuditEvent[] = [];

  const mockAuditStore: IAuditStore = {
    record: vi.fn().mockImplementation(async (event: AuditEvent) => { events.push(event); }),
    query: vi.fn().mockImplementation(async (filters: AuditQuery) => events.filter(e => !filters.userId || e.userId === filters.userId)),
    export: vi.fn().mockResolvedValue(events),
  };

  it('should record an audit event', async () => {
    const event = createMockAuditEvent();
    await mockAuditStore.record(event);
    expect(mockAuditStore.record).toHaveBeenCalledWith(event);
  });

  it('should query audit events', async () => {
    const results = await mockAuditStore.query({ userId: 'user-1' });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should export audit log', async () => {
    const results = await mockAuditStore.export(new Date('2024-01-01'), new Date('2024-12-31'));
    expect(Array.isArray(results)).toBe(true);
  });

  it('should create audit event with proper structure', () => {
    const event = createMockAuditEvent({ action: 'delete', result: 'failure', details: { reason: 'unauthorized' } });
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('userId');
    expect(event).toHaveProperty('action');
    expect(event).toHaveProperty('resource');
    expect(event).toHaveProperty('result');
    expect(event.details?.reason).toBe('unauthorized');
  });
});
