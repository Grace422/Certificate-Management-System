-- Enums enforce a fixed, self-documenting set of valid values at the DB
-- level (defense in depth - even if app-layer validation is bypassed,
-- the DB will reject an invalid value).

CREATE TYPE user_role AS ENUM (
  'citizen',
  'origin_admin',
  'destination_admin',
  'super_admin'
);

CREATE TYPE record_type AS ENUM (
  'birth',
  'death',
  'marriage'
);

CREATE TYPE request_type AS ENUM (
  'copy',       -- request for a copy of an existing certificate
  'reissue'     -- request following a loss declaration
);

CREATE TYPE request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'in_transit',
  'ready_for_pickup',
  'completed'
);

CREATE TYPE declaration_status AS ENUM (
  'pending',
  'verified',
  'rejected'
);

-- Cameroon's 10 regions - constrains Councils.region to valid values only.
CREATE TYPE cameroon_region AS ENUM (
  'Adamawa',
  'Centre',
  'East',
  'Far North',
  'Littoral',
  'North',
  'Northwest',
  'West',
  'South',
  'Southwest'
);
