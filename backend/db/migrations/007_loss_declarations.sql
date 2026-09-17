-- A citizen declares their certificate lost; once verified, this typically
-- leads to a certificate_requests row with request_type='reissue'.
CREATE TABLE loss_declarations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  civil_record_id   UUID REFERENCES civil_records(id) ON DELETE SET NULL, -- may be null if record not yet matched
  description       TEXT NOT NULL,          -- citizen's account of circumstances (for fraud review)
  status            declaration_status NOT NULL DEFAULT 'pending',
  linked_request_id UUID REFERENCES certificate_requests(id) ON DELETE SET NULL,
  declared_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at       TIMESTAMPTZ
);

CREATE INDEX idx_loss_declarations_citizen ON loss_declarations (citizen_id);
CREATE INDEX idx_loss_declarations_status ON loss_declarations (status);
