-- Refresh tokens are stored as a SHA-256 HASH, never in plaintext - if this
-- table ever leaks, the hashes alone cannot be replayed as tokens.
-- Storing them (rather than pure stateless JWTs) lets us REVOKE a specific
-- session at logout, and detect/rotate on every refresh (rotation = if a
-- stolen refresh token is replayed after the legitimate user already
-- rotated it, we can tell and revoke the whole chain).
CREATE TABLE refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(64) NOT NULL UNIQUE, -- sha256 hex digest
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  replaced_by_hash  VARCHAR(64),                  -- set when rotated, points to the new token's hash
  user_agent        TEXT,
  ip_address        INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
