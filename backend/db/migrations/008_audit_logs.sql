-- Immutable audit trail. No UPDATE/DELETE should ever be performed on
-- this table by the application (enforced by app-layer convention here;
-- can be hardened further with a REVOKE UPDATE/DELETE role grant in prod).
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL, -- null = system-initiated action
  action      VARCHAR(100) NOT NULL,   -- e.g. 'LOGIN_SUCCESS', 'REQUEST_APPROVED', 'BULK_UPLOAD'
  entity      VARCHAR(50) NOT NULL,    -- e.g. 'certificate_requests'
  entity_id   UUID,
  ip_address  INET,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Revoke UPDATE/DELETE from the app's runtime DB role so a compromised
-- app server cannot tamper with the audit trail (defense in depth).
-- Replace 'cscms_user' with your actual runtime DB role name.
-- REVOKE UPDATE, DELETE ON audit_logs FROM cscms_user;
