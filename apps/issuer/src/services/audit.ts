import Database from 'better-sqlite3';

import type {
  AuditLogIssueInput,
  AuditLogRevokeInput,
  LicenseListOptions,
  LicenseRecord,
} from '../types.js';

export class AuditService {
  private readonly db: Database.Database;
  private readonly insertLicenseStmt: Database.Statement;
  private readonly insertRevokeStmt: Database.Statement;
  private readonly selectLicenseStmt: Database.Statement;
  private readonly listLicensesStmtBase: string;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(
      CREATE TABLE IF NOT EXISTS licenses (
        jti TEXT PRIMARY KEY,
        hwid TEXT NOT NULL,
        plan TEXT,
        note TEXT,
        issued_at INTEGER NOT NULL,
        exp INTEGER NOT NULL,
        issuer_ip TEXT
      );

      CREATE TABLE IF NOT EXISTS revocations (
        jti TEXT PRIMARY KEY,
        revoked_at INTEGER NOT NULL,
        admin TEXT
      );
    );

    this.insertLicenseStmt = this.db.prepare(
      INSERT INTO licenses (jti, hwid, plan, note, issued_at, exp, issuer_ip)
      VALUES (@jti, @hwid, @plan, @note, @issuedAt, @exp, @issuerIp)
      ON CONFLICT(jti) DO UPDATE SET
        hwid = excluded.hwid,
        plan = excluded.plan,
        note = excluded.note,
        issued_at = excluded.issued_at,
        exp = excluded.exp,
        issuer_ip = excluded.issuer_ip;
    );

    this.insertRevokeStmt = this.db.prepare(
      INSERT INTO revocations (jti, revoked_at, admin)
      VALUES (@jti, @revokedAt, @admin)
      ON CONFLICT(jti) DO UPDATE SET
        revoked_at = excluded.revoked_at,
        admin = excluded.admin;
    );

    this.selectLicenseStmt = this.db.prepare(
      SELECT
        l.jti,
        l.hwid,
        l.plan,
        l.note,
        l.issued_at AS issuedAt,
        l.exp,
        l.issuer_ip AS issuerIp,
        r.revoked_at AS revokedAt,
        r.admin AS revokedBy
      FROM licenses l
      LEFT JOIN revocations r ON r.jti = l.jti
      WHERE l.jti = ?
    );

    this.listLicensesStmtBase = 
      SELECT
        l.jti,
        l.hwid,
        l.plan,
        l.note,
        l.issued_at AS issuedAt,
        l.exp,
        l.issuer_ip AS issuerIp,
        r.revoked_at AS revokedAt,
        r.admin AS revokedBy
      FROM licenses l
      LEFT JOIN revocations r ON r.jti = l.jti
    ;
  }

  logIssue(entry: AuditLogIssueInput): void {
    this.insertLicenseStmt.run(entry);
  }

  logRevoke(entry: AuditLogRevokeInput): void {
    this.insertRevokeStmt.run(entry);
  }

  getLicense(jti: string): LicenseRecord | null {
    const row = this.selectLicenseStmt.get(jti);
    return row ?? null;
  }

  listLicenses(options: LicenseListOptions): LicenseRecord[] {
    const { limit, include } = options;
    const clauses: string[] = [];

    if (include === 'active') {
      clauses.push('r.jti IS NULL');
    }

    if (include === 'revoked') {
      clauses.push('r.jti IS NOT NULL');
    }

    const where = clauses.length > 0 ? WHERE  : '';
    const sql = ${this.listLicensesStmtBase}  ORDER BY l.issued_at DESC LIMIT ?;
    const stmt = this.db.prepare(sql);
    return stmt.all(limit) as LicenseRecord[];
  }

  close(): void {
    this.db.close();
  }
}
