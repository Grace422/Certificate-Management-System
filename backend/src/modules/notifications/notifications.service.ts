import { PoolClient } from "pg";
import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { NotificationRow } from "./notifications.types";

/**
 * Creates a notification. Accepts an optional transaction `client` so
 * callers (e.g. requests.service.ts's approve/reject/ready/complete) can
 * create the notification in the SAME transaction as the state change that
 * triggered it - if the transaction rolls back, the notification never
 * gets sent for something that didn't actually happen.
 */
export async function create(
  params: { userId: string; title: string; message: string; entity?: string; entityId?: string },
  client?: PoolClient
): Promise<void> {
  const sql = `INSERT INTO notifications (user_id, title, message, entity, entity_id)
     VALUES ($1, $2, $3, $4, $5)`;
  const values = [params.userId, params.title, params.message, params.entity ?? null, params.entityId ?? null];
  if (client) {
    await client.query(sql, values);
  } else {
    await query(sql, values);
  }
}

/**
 * Notifies every admin who manages the given council (used when a request
 * is created, so the origin council's admin(s) find out immediately rather
 * than only seeing it if they happen to check their queue).
 */
export async function notifyCouncilAdmins(
  councilId: string,
  role: "origin_admin" | "destination_admin",
  params: { title: string; message: string; entity?: string; entityId?: string },
  client?: PoolClient
): Promise<void> {
  const sql = "SELECT id FROM users WHERE home_council_id = $1 AND role = $2 AND is_active = true";
  const admins = client
    ? await client.query<{ id: string }>(sql, [councilId, role])
    : await query<{ id: string }>(sql, [councilId, role]);
  for (const admin of admins.rows) {
    await create({ userId: admin.id, ...params }, client);
  }
}

/**
 * Notifies every active user with a given role, with no council
 * restriction. Used for super_admin, who - unlike origin_admin/
 * destination_admin - isn't scoped to any particular council and should
 * always be kept in the loop system-wide.
 */
export async function notifyRole(
  role: "super_admin",
  params: { title: string; message: string; entity?: string; entityId?: string },
  client?: PoolClient
): Promise<void> {
  const sql = "SELECT id FROM users WHERE role = $1 AND is_active = true";
  const admins = client
    ? await client.query<{ id: string }>(sql, [role])
    : await query<{ id: string }>(sql, [role]);
  for (const admin of admins.rows) {
    await create({ userId: admin.id, ...params }, client);
  }
}

export async function listMine(userId: string, limit = 50): Promise<NotificationRow[]> {
  const result = await query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return result.rows;
}

export async function unreadCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
    [userId]
  );
  return Number(result.rows[0].count);
}

export async function markRead(id: string, userId: string): Promise<void> {
  const result = await query(
    "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  if (result.rowCount === 0) throw ApiError.notFound("Notification not found");
}

export async function markAllRead(userId: string): Promise<void> {
  await query("UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", [userId]);
}
