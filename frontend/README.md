# CSCMS Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS.

## Setup

```bash
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev                         # http://localhost:3000
```

Requires the backend running on the URL in `.env.local` (defaults to `http://localhost:4000/api/v1`), with `CORS_ORIGIN` on the backend set to `http://localhost:3000`.

## Structure

```
src/
  app/
    page.tsx              landing page
    register/             citizen registration (step 1)
    mfa-setup/             MFA QR setup + verification (step 2 of registration)
    login/                 login (step 1: email+password)
    mfa-verify/            login step 2: TOTP code
    dashboard/             citizen area (protected, role=citizen)
    admin/                 admin area (protected, role != citizen)
  components/              Button, Input, Card, FlagBar, AppShell
  lib/
    api.ts                 fetch wrapper (credentials, envelope parsing, ApiError)
    auth-context.tsx        session state: access token in memory, silent refresh, authFetch
  types/                   shared TS types
```

## How auth works here

- **Access token**: held in React state only (never localStorage/sessionStorage) — gone on tab close, which is the point: it limits the blast radius if an XSS bug ever leaked JS-readable storage.
- **Refresh token**: httpOnly cookie set by the backend. Never touched by frontend JS. `AuthProvider` calls `POST /auth/refresh` once on mount to silently restore a session after a page reload.
- **authFetch**: use this (not raw `fetch`) for any authenticated call. It attaches the access token and, on a 401, retries once after a silent refresh — covers the access token's 15-minute expiry without forcing a re-login mid-session.
- Login branches on `requiresSetup`: an account that has never completed MFA (true for admin accounts just provisioned by Super Admin, who never go through `/register`) gets routed to `/mfa-setup` instead of `/mfa-verify` after password check. Both pages share the same `completeMfaSetup` flow.
- Both MFA steps (registration and login) require **two page loads** by design — the `challengeToken` lives in `AuthProvider`'s React state, so it survives client-side navigation (`router.push`) but is lost on a hard refresh, intentionally forcing the flow to restart rather than resume from a stale, possibly-expired challenge.

## Status

Fully working: registration, MFA (TOTP) setup, login (including the admin-first-login MFA setup branch), MFA verify, silent refresh, logout, protected routing by role.

Request-certificate, loss-declaration, and track pages call real, working backend endpoints (record search, request creation/listing, loss declarations). The admin pages (`/admin/requests`, `/admin/upload`, `/admin/audit`) are currently read-only placeholders that confirm connectivity to their respective endpoints (`GET /requests`, `GET /users`, `GET /audit-logs`) but don't yet expose the approve/reject/ready/complete actions in the UI - those exist on the backend (`PATCH /requests/:id/approve` etc.) and just need forms wired up next.
