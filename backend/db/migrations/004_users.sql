CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  email               CITEXT NOT NULL UNIQUE, -- case-insensitive unique email
  password_hash       VARCHAR(255) NOT NULL,  -- bcrypt/argon2 hash, never plaintext
  phone               VARCHAR(20),
  date_of_birth       DATE,
  place_of_birth      VARCHAR(150),           -- free text town/council name, used in search
  home_council_id     UUID REFERENCES councils(id) ON DELETE SET NULL, -- council where they were registered, if known
  current_location    GEOGRAPHY(POINT, 4326), -- last known location, used for nearest-council routing
  role                user_role NOT NULL DEFAULT 'citizen',

  -- MFA (TOTP)
  mfa_secret          VARCHAR(255),           -- encrypted TOTP secret (encrypt at app layer before insert)
  mfa_enabled         BOOLEAN NOT NULL DEFAULT false,

  -- Account state
  is_active           BOOLEAN NOT NULL DEFAULT true,
  failed_login_count  SMALLINT NOT NULL DEFAULT 0,   -- for lockout after N failed attempts
  locked_until        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_current_location ON users USING GIST (current_location);
-- Composite index supports the "search my own record" style lookups by identity fields.
CREATE INDEX idx_users_identity_search ON users (last_name, first_name, date_of_birth);
