export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  entity: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PublicNotification {
  id: string;
  title: string;
  message: string;
  entity: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export function toPublicNotification(row: NotificationRow): PublicNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    entity: row.entity,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at
  };
}
