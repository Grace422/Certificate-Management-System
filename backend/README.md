# CSCMS Backend

Civil Status Certificate Management System — REST API (Express + TypeScript + PostgreSQL/PostGIS).

## Setup

```bash
cp .env.example .env      # fill in real secrets (JWT secrets must be 32+ chars)
npm install
npm run migrate            # applies db/migrations/*.sql in order
npm run seed                # sample councils + a super admin (superadmin@cscms.cm)
npm run dev                 # http://localhost:4000
```

Health check: `GET http://localhost:4000/api/v1/health`

## Status: fully working end-to-end

Verified live against a real PostgreSQL+PostGIS instance (see `scripts/test-auth-flow.ts`
and `scripts/test-workflow.ts` for the exact test scripts, runnable with `npx ts-node scripts/<name>.ts`
against a running server):

- **Auth**: register → MFA (TOTP) setup → login → MFA verify → refresh token rotation →
  replay-attack detection → logout. Passwords bcrypt-hashed, refresh tokens stored as
  SHA-256 hashes in an httpOnly cookie.
- **Admin provisioning**: Super Admin creates origin/destination admin accounts tied to a
  council; those accounts complete MFA setup on their own first login (same code path as
  citizen self-registration).
- **Records**: citizen search (name/DOB/place of birth), and CSV bulk-upload for migrating
  paper archives (partial-success semantics - bad rows are reported, good rows still import).
- **Councils**: list, get, and PostGIS nearest-council lookup (`GET /councils/nearest`).
- **Requests (the core workflow)**: citizen submits a request → origin council admin
  approves (which auto-computes and routes to the council nearest the citizen via PostGIS) →
  destination admin marks ready → destination admin completes. Every transition is
  audit-logged. Cross-council authorization is enforced (an admin can't act on a request
  outside their own council).
- **Loss declarations**: citizen can file one, independent of the certificate-request flow.
- **Audit log**: read-only, Super Admin only.

## Folder structure

```
src/
  config/         env loading (zod-validated), DB pool + query/transaction helpers
  middlewares/    auth (JWT), validation (zod), error handling, rate limiting
  modules/        one folder per domain: routes -> controller -> service
    auth/ users/ records/ requests/ councils/ loss-declarations/ audit/
  utils/          logger, ApiError, ApiResponse, asyncHandler, jwt, mfa, hash, duration
  types/          ambient TS type augmentations (req.user)
db/
  migrations/     11 numbered .sql files, tracked in schema_migrations, run via scripts/migrate.ts
  seeds/          sample council data
scripts/
  migrate.ts       migration runner
  seed.ts          seeds councils + a super admin
  test-auth-flow.ts    integration test for the Auth module
  test-workflow.ts     integration test for the full citizen-to-completion workflow
```

## Known simplifications (documented, not hidden)

- `users.home_council_id` is repurposed as "the council this admin manages" for
  origin_admin/destination_admin roles - avoids a schema migration for a second concept
  that behaves identically for MVP purposes.
- `approve` skips a separate idle "approved" state and goes straight to `in_transit`,
  since routing is fully automatic (no manual "pick a destination" step for staff).
- Council bulk-upload from your real dataset isn't built yet - only civil_records has a
  CSV bulk-upload endpoint. Councils are currently seeded from `db/seeds/001_sample_councils.sql`
  (11 sample councils). Swap in your full dataset there, or ask for a councils bulk-upload
  endpoint (same pattern as records).

## Update: rich civil records, councils bulk-upload, certificate view

- `civil_records.record_data` now captures the full set of fields on the real
  Cameroon bilingual birth certificate (child, both parents' full details,
  registration centre, registrar/secretary) - see `BirthRecordData` in
  `src/modules/records/records.types.ts`. Bulk-upload CSV columns extended
  to match (see `db/../civil-records-sample.csv` if provided separately).
- `POST /councils/bulk-upload` (super_admin only) - same CSV bulk-import
  pattern as records, for the municipal council/"courthouse" dataset.
  Upserts by (name, region) so re-uploading an updated dataset refreshes
  existing councils instead of duplicating them.
- `GET /requests/:id/certificate` (citizen, own request only, status must
  be ready_for_pickup or completed) - returns the full civil record
  (including record_data) for rendering/printing as a certificate.
