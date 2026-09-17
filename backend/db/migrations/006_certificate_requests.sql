-- One row per certificate-copy request. Tracks the full lifecycle:
-- pending -> approved/rejected -> in_transit -> ready_for_pickup -> completed.
CREATE TABLE certificate_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  civil_record_id         UUID NOT NULL REFERENCES civil_records(id) ON DELETE RESTRICT,
  request_type            request_type NOT NULL DEFAULT 'copy',
  status                  request_status NOT NULL DEFAULT 'pending',

  origin_council_id       UUID NOT NULL REFERENCES councils(id) ON DELETE RESTRICT,      -- council where the record is registered
  destination_council_id  UUID REFERENCES councils(id) ON DELETE RESTRICT,               -- nearest council to citizen, set on approval

  citizen_location        GEOGRAPHY(POINT, 4326) NOT NULL, -- location captured at request time (used to compute destination)
  rejection_reason        TEXT,

  requested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at            TIMESTAMPTZ,      -- when origin admin approved/rejected
  ready_at                TIMESTAMPTZ,      -- when destination admin marked ready for pickup
  completed_at            TIMESTAMPTZ,      -- when citizen picked it up

  -- A citizen requesting the same record twice while a request is still
  -- open is almost always a duplicate click, not a new legitimate request.
  CONSTRAINT chk_destination_set_when_approved
    CHECK (status = 'pending' OR status = 'rejected' OR destination_council_id IS NOT NULL)
);

CREATE INDEX idx_requests_citizen ON certificate_requests (citizen_id);
CREATE INDEX idx_requests_status ON certificate_requests (status);
CREATE INDEX idx_requests_origin_council ON certificate_requests (origin_council_id);
CREATE INDEX idx_requests_destination_council ON certificate_requests (destination_council_id);
