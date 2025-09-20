export type LicensePlan = string | null;

export interface IssueRequestBody {
  hwid: string;
  ttlSeconds: number;
  plan?: string | null;
  note?: string | null;
}

export interface IssueResult {
  token: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface LicensePayload {
  sub: 'license';
  hwid: string;
  plan?: string | null;
  jti: string;
  iat: number;
  exp: number;
}

export interface LicenseRecord {
  jti: string;
  hwid: string;
  plan: string | null;
  note: string | null;
  issuedAt: number;
  exp: number;
  issuerIp: string | null;
  revokedAt: number | null;
  revokedBy: string | null;
}

export interface LicenseListOptions {
  limit: number;
  include: 'all' | 'active' | 'revoked';
}

export interface AuditLogIssueInput {
  jti: string;
  hwid: string;
  plan: string | null;
  note: string | null;
  issuedAt: number;
  exp: number;
  issuerIp: string | null;
}

export interface AuditLogRevokeInput {
  jti: string;
  revokedAt: number;
  admin: string;
}
