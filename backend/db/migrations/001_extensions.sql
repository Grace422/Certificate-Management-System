-- Enable UUID generation and PostGIS (geolocation: nearest-council matching).
-- Requires a PostgreSQL build with the postgis extension package installed
-- (e.g. `postgis/postgis` Docker image, or `apt install postgresql-16-postgis-3`).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";    -- geography type, ST_Distance, ST_DWithin
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive text (used for email)
