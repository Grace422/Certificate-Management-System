-- Generic trigger function to auto-maintain updated_at on every UPDATE,
-- so application code never has to remember to set it manually.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_councils_updated_at
  BEFORE UPDATE ON councils
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_civil_records_updated_at
  BEFORE UPDATE ON civil_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
