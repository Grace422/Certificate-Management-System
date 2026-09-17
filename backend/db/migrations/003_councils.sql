-- Municipal councils / registry offices. Populated from the location
-- dataset you'll provide (bulk insert - see db/seeds/).
CREATE TABLE councils (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(150) NOT NULL,
  region            cameroon_region NOT NULL,
  division          VARCHAR(100) NOT NULL,
  -- geography(Point, 4326): SRID 4326 = standard GPS lat/lng (WGS 84).
  -- 'geography' (not 'geometry') so ST_Distance returns meters directly.
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  address           TEXT,
  contact_phone     VARCHAR(20),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIST index required for fast spatial queries (ST_Distance, ST_DWithin, <->).
CREATE INDEX idx_councils_location ON councils USING GIST (location);
CREATE INDEX idx_councils_region ON councils (region);
