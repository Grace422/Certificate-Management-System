import { query } from "../../config/db";

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_email?: string;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Read-only by design - see migration 008's note on revoking UPDATE/DELETE
// from the app's runtime DB role in production.
export async function list(limit = 200): Promise<AuditLogRow[]> {
  const result = await query<AuditLogRow>(
    `SELECT al.*, u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
