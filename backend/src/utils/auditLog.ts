import { query } from "../config/db";

/**
 * Writes an audit trail entry. Called internally by services on
 * security/business-significant actions (login, request approval, bulk
 * upload, etc.) - there is deliberately NO public "create audit log" API
 * endpoint, since audit entries must only ever be system-generated.
 */
export async function writeAuditLog(params: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (actor_id, action, entity, entity_id, ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.actorId,
      params.action,
      params.entity,
      params.entityId ?? null,
      params.ipAddress ?? null,
      JSON.stringify(params.metadata ?? {})
    ]
  );
}
