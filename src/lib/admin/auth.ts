import type { Pool } from "pg";
import {
  burnPasswordCheck, hashPassword, matchTotp, newRecoveryCodes, newToken, newTotpSecret, normalizeRecoveryCode,
  openSecret, sealSecret, sha256, totpUri, base32Encode, verifyPassword,
} from "./crypto";

export const MAX_ACCOUNT_FAILURES = 5;
export const ACCOUNT_LOCK_MINUTES = 15;
export const MAX_IP_ATTEMPTS = 20;
export const IP_WINDOW_MINUTES = 15;
const SESSION_DAYS = 7;
const IDLE_HOURS = 12;
const PENDING_MINUTES = 10;
const INVITE_HOURS = 24;

export type AdminIdentity = { id: number; email: string };

/** Password rules a person can follow: length over composition, as NIST recommends. */
export function passwordProblem(password: string, email: string) {
  if (password.length < 12) return "Usá al menos 12 caracteres.";
  if (password.length > 200) return "Usá como máximo 200 caracteres.";
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "No uses tu email dentro de la contraseña.";
  if (new Set(password).size < 5) return "Es demasiado repetitiva.";
  return null;
}

export class AdminAuth {
  constructor(private db: Pool, private rootSecret: string) {}

  /** Creates the account or re-issues access. Current credentials keep working until it is activated. */
  async invite(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("invalid_email");
    const token = newToken();
    await this.db.query(`INSERT INTO admin_users(email,invite_hash,invite_expires_at) VALUES($1,$2,now()+make_interval(hours=>$3))
      ON CONFLICT(email) DO UPDATE SET invite_hash=EXCLUDED.invite_hash,invite_expires_at=EXCLUDED.invite_expires_at,
      pending_password_hash=NULL,pending_totp_enc=NULL,active=true`, [email, sha256(token), INVITE_HOURS]);
    return { email, token };
  }

  async disable(rawEmail: string) {
    const { rows: [user] } = await this.db.query(`UPDATE admin_users SET active=false,invite_hash=NULL WHERE email=$1 RETURNING id`, [rawEmail.trim().toLowerCase()]);
    if (!user) return false;
    await this.db.query("UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
    return true;
  }

  private async invited(token: string) {
    const { rows: [user] } = await this.db.query(`SELECT id,email,pending_password_hash,pending_totp_enc FROM admin_users
      WHERE invite_hash=$1 AND invite_expires_at>now() AND active`, [sha256(token)]);
    return user as { id: number; email: string; pending_password_hash: string | null; pending_totp_enc: string | null } | undefined;
  }

  async inviteEmail(token: string) { return (await this.invited(token))?.email ?? null; }

  /** Step 1: keep the password and a new secret apart until a code proves the app was set up. */
  async beginActivation(token: string, password: string) {
    const user = await this.invited(token);
    if (!user) return { error: "invite" as const };
    const problem = passwordProblem(password, user.email);
    if (problem) return { error: "password" as const, problem };
    const secret = newTotpSecret();
    await this.db.query("UPDATE admin_users SET pending_password_hash=$2,pending_totp_enc=$3 WHERE id=$1",
      [user.id, await hashPassword(password), sealSecret(secret, this.rootSecret)]);
    return { email: user.email, key: base32Encode(secret), uri: totpUri(user.email, secret) };
  }

  /** Step 2: the swap is atomic, and any previous session stops being valid. */
  async confirmActivation(token: string, code: string) {
    const user = await this.invited(token);
    if (!user?.pending_totp_enc || !user.pending_password_hash) return { error: "invite" as const };
    const step = matchTotp(openSecret(user.pending_totp_enc, this.rootSecret), code.trim());
    if (step === null) return { error: "code" as const };
    const codes = newRecoveryCodes();
    await this.db.query(`UPDATE admin_users SET password_hash=pending_password_hash,totp_secret_enc=pending_totp_enc,totp_last_step=$2,
      recovery_hashes=$3,pending_password_hash=NULL,pending_totp_enc=NULL,invite_hash=NULL,invite_expires_at=NULL,failed_attempts=0,locked_until=NULL
      WHERE id=$1`, [user.id, step, JSON.stringify(codes.map(c => sha256(normalizeRecoveryCode(c))))]);
    await this.db.query("UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
    await this.audit(user, "activar_acceso", "admin_user", String(user.id));
    return { recoveryCodes: codes };
  }

  /** Counts every attempt before the expensive hash. The window restarts once it has elapsed. */
  private async ipAllowed(ip: string) {
    const { rows: [row] } = await this.db.query(`INSERT INTO admin_login_throttle(ip_hash,attempts) VALUES($1,1)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts=CASE WHEN admin_login_throttle.window_started_at<now()-make_interval(mins=>$2) THEN 1 ELSE admin_login_throttle.attempts+1 END,
        window_started_at=CASE WHEN admin_login_throttle.window_started_at<now()-make_interval(mins=>$2) THEN now() ELSE admin_login_throttle.window_started_at END
      RETURNING attempts`, [sha256(ip), IP_WINDOW_MINUTES]);
    return row.attempts <= MAX_IP_ATTEMPTS;
  }

  private async failure(userId: number) {
    await this.db.query(`UPDATE admin_users SET
      locked_until=CASE WHEN failed_attempts+1>=$2 THEN now()+make_interval(mins=>$3) ELSE locked_until END,
      failed_attempts=CASE WHEN failed_attempts+1>=$2 THEN 0 ELSE failed_attempts+1 END WHERE id=$1`,
    [userId, MAX_ACCOUNT_FAILURES, ACCOUNT_LOCK_MINUTES]);
  }

  /** Every failure returns the same result, so it cannot be used to discover accounts or locks. */
  async login(rawEmail: string, password: string, ip: string) {
    if (password.length > 200 || !await this.ipAllowed(ip)) return null;
    const { rows: [user] } = await this.db.query(`SELECT id,password_hash,totp_secret_enc,locked_until>now() AS locked FROM admin_users
      WHERE email=$1 AND active`, [rawEmail.trim().toLowerCase()]);
    if (!user?.password_hash || !user.totp_secret_enc || user.locked) { await burnPasswordCheck(password); return null; }
    if (!await verifyPassword(password, user.password_hash)) { await this.failure(user.id); return null; }
    const token = newToken();
    await this.db.query(`INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+make_interval(mins=>$3))`,
      [sha256(token), user.id, PENDING_MINUTES]);
    return token;
  }

  private async consumeRecoveryCode(userId: number, code: string) {
    const result = await this.db.query(`UPDATE admin_users SET recovery_hashes=recovery_hashes-$2 WHERE id=$1 AND recovery_hashes?$2`,
      [userId, sha256(normalizeRecoveryCode(code))]);
    return result.rowCount === 1;
  }

  /** The token is replaced once the second factor passes, so a pre-login cookie is worthless after it. */
  async verifySecondFactor(pendingToken: string, rawCode: string) {
    const { rows: [row] } = await this.db.query(`SELECT s.token_hash,u.id,u.email,u.totp_secret_enc,u.locked_until>now() AS locked FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND NOT s.mfa_passed AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active`, [sha256(pendingToken)]);
    if (!row || row.locked) return null;
    const code = rawCode.trim();
    let ok = false, usedRecovery = false;
    if (/^\d{6}$/.test(code)) {
      const step = matchTotp(openSecret(row.totp_secret_enc, this.rootSecret), code);
      // Atomic: a code that was seen once cannot open a second session.
      ok = step !== null && (await this.db.query("UPDATE admin_users SET totp_last_step=$2 WHERE id=$1 AND totp_last_step<$2", [row.id, step])).rowCount === 1;
    } else if (code.length <= 40) {
      ok = usedRecovery = await this.consumeRecoveryCode(row.id, code);
    }
    if (!ok) {
      await this.failure(row.id);
      const { rows: [state] } = await this.db.query("SELECT locked_until>now() AS locked FROM admin_users WHERE id=$1", [row.id]);
      if (state.locked) await this.db.query("UPDATE admin_sessions SET revoked_at=now() WHERE token_hash=$1", [row.token_hash]);
      return null;
    }
    const token = newToken();
    await this.db.query("UPDATE admin_sessions SET revoked_at=now() WHERE token_hash=$1", [row.token_hash]);
    await this.db.query("INSERT INTO admin_sessions(token_hash,user_id,mfa_passed,expires_at) VALUES($1,$2,true,now()+make_interval(days=>$3))",
      [sha256(token), row.id, SESSION_DAYS]);
    await this.db.query("UPDATE admin_users SET failed_attempts=0,locked_until=NULL,last_login_at=now() WHERE id=$1", [row.id]);
    await this.audit(row, usedRecovery ? "ingresar_con_codigo_de_recuperacion" : "ingresar", "admin_user", String(row.id));
    return token;
  }

  async pendingSessionValid(token: string) {
    return (await this.db.query(`SELECT 1 FROM admin_sessions WHERE token_hash=$1 AND NOT mfa_passed AND revoked_at IS NULL AND expires_at>now()`, [sha256(token)])).rowCount === 1;
  }

  async identify(token: string): Promise<AdminIdentity | null> {
    const hash = sha256(token);
    const { rows: [row] } = await this.db.query(`SELECT u.id,u.email,s.last_seen_at<now()-interval '1 minute' AS stale FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.mfa_passed AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active
      AND s.last_seen_at>now()-make_interval(hours=>$2)`, [hash, IDLE_HOURS]);
    if (!row) return null;
    if (row.stale) await this.db.query("UPDATE admin_sessions SET last_seen_at=now() WHERE token_hash=$1", [hash]);
    return { id: row.id, email: row.email };
  }

  async logout(token: string) {
    await this.db.query("UPDATE admin_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [sha256(token)]);
  }

  private async audit(actor: AdminIdentity, action: string, entity: string, entityId: string) {
    await this.db.query("INSERT INTO audit_log(actor_id,actor_email,action,entity,entity_id) VALUES($1,$2,$3,$4,$5)", [actor.id, actor.email, action, entity, entityId]);
  }
}
