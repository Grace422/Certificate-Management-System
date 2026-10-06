-- In-app notifications. No email/SMS integration exists yet (documented
-- limitation) - this is the practical MVP substitute: every state change
-- that matters to a citizen or admin creates a row here, surfaced via a
-- bell icon with an unread count, polled periodically by the frontend.
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(150) NOT NULL,
  message     TEXT NOT NULL,
  entity      VARCHAR(50),      -- e.g. 'certificate_requests'
  entity_id   UUID,             -- e.g. the request id - lets the frontend link to it
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = false;
