# CSCMS Backend

Civil Status Certificate Management System — REST API (Express + TypeScript + PostgreSQL/PostGIS).

## Folder structure

```
src/
  config/         # env loading, DB pool
  middlewares/    # auth, validation, error handling, rate limiting
  modules/        # one folder per domain: routes -> controller -> service
    auth/
    users/
    records/
    requests/
    councils/
    audit/
  utils/          # logger, ApiError, ApiResponse, asyncHandler
  types/          # ambient TS type augmentations
  app.ts          # Express app + middleware pipeline
  server.ts       # entrypoint: boots DB check + HTTP server
scripts/
  migrate.ts      # DB migration runner (placeholder for now)
```

**Layering per module:** `routes.ts` (HTTP + middleware wiring) → `controller.ts` (parse req, call service, shape response) → `service.ts` (business logic + DB queries). Keeps each layer independently testable.

## Setup

```bash
cp .env.example .env      # fill in real secrets (JWT secrets must be 32+ chars)
npm install
npm run dev                # starts on http://localhost:4000
```

Health check: `GET http://localhost:4000/api/v1/health`

## Status

This is the **project scaffold** only. Endpoints return `501 Not Implemented`
placeholders. Next steps (in order):
1. Database schema + migrations (PostgreSQL + PostGIS)
2. Auth module: bcrypt password hashing, JWT issuance/refresh, TOTP-based MFA
3. Wire real SQL queries into each module's `service.ts`
4. Request routing logic (nearest-council matching via PostGIS)
