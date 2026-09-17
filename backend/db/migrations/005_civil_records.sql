-- The core registry data: one row per certificate on file. This is what
-- gets bulk-uploaded by Super Admin (migrated from paper archives) and
-- searched against when a citizen looks up their own record.
CREATE TABLE civil_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type             record_type NOT NULL,
  full_name               VARCHAR(200) NOT NULL,
  date_of_birth           DATE,                  -- nullable: not applicable to some marriage/death entries
  place_of_birth          VARCHAR(150),
  registration_number     VARCHAR(50) UNIQUE,    -- the official registry number from the paper archive
  registered_council_id   UUID NOT NULL REFERENCES councils(id) ON DELETE RESTRICT,
  -- Flexible bag for type-specific fields (parents' names for birth,
  -- spouse names for marriage, cause/date of death, etc.) without needing
  -- a separate table per certificate type at this stage.
  record_data             JSONB NOT NULL DEFAULT '{}',
  document_scan_url       TEXT,                  -- link to scanned original in object storage
  linked_user_id          UUID REFERENCES users(id) ON DELETE SET NULL, -- set once matched to a registered citizen
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core search path: "find my record by name + DOB + place of birth".
CREATE INDEX idx_civil_records_search ON civil_records (full_name, date_of_birth, place_of_birth);
CREATE INDEX idx_civil_records_council ON civil_records (registered_council_id);
CREATE INDEX idx_civil_records_type ON civil_records (record_type);
-- GIN index for querying inside record_data (e.g. search by parent name).
CREATE INDEX idx_civil_records_data ON civil_records USING GIN (record_data);
