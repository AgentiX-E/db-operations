export interface IRBACProvider {
  /** Check if a role has permission for a specific action on a resource */
  checkPermission(role: string, action: string, resource: string): Promise<boolean>;
  /** Assign a role to a user */
  assignRole(userId: string, role: string): Promise<void>;
  /** Revoke a role from a user */
  revokeRole(userId: string, role: string): Promise<void>;
  /** List all roles assigned to a user */
  getUserRoles(userId: string): Promise<string[]>;
}

export interface IAuthProvider {
  /** Authenticate a user with credentials */
  authenticate(username: string, password: string): Promise<{ token: string; expiresAt: Date }>;
  /** Validate an existing token */
  validateToken(token: string): Promise<{ userId: string; roles: string[] }>;
  /** Revoke a token */
  revokeToken(token: string): Promise<void>;
}

export interface ITLSManager {
  /** Get the current TLS configuration */
  getConfig(): Promise<{ cert: string; key: string; ca?: string }>;
  /** Rotate TLS certificates */
  rotateCertificates(newCert: string, newKey: string): Promise<void>;
  /** Validate certificate expiration */
  validateExpiration(): Promise<{ valid: boolean; daysRemaining: number }>;
}

export interface IAuditStore {
  /** Record an audit event */
  record(event: AuditEvent): Promise<void>;
  /** Query audit events with filters */
  query(filters: AuditQuery): Promise<AuditEvent[]>;
  /** Export audit log for compliance */
  export(startDate: Date, endDate: Date): Promise<AuditEvent[]>;
}

export interface AuditEvent {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details?: Record<string, unknown>;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
