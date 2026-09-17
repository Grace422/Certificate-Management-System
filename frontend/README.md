# CivilReg Cameroon — Frontend

Next.js 16 (App Router) · TypeScript · Tailwind v4 · SWR · Leaflet

Citizens request birth / death / marriage certificates from anywhere in Cameroon;
admins process the requests and dispatch documents to the municipal building
nearest the citizen.

---

## 1. Run it

```bash
npm install
cp .env.example .env.local     # point NEXT_PUBLIC_API_URL at your Express server
npm run dev                    # http://localhost:3000
```

| Variable                     | Default                        | Purpose                                              |
| ---------------------------- | ------------------------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`        | `http://localhost:5000/api/v1` | Base URL of your Express backend                     |
| `NEXT_PUBLIC_AUTH_MODE`      | `cookie`                       | `cookie` (httpOnly, recommended) or `bearer`         |
| `NEXT_PUBLIC_SESSION_COOKIE` | `access_token`                 | Cookie name the edge proxy checks for a session      |

---

## 2. Wiring this to YOUR backend — start here

**Every route in the app is declared in one file: `src/lib/api/endpoints.ts`.**
No component or hook contains a hard-coded URL. If your Express routes differ,
edit that file only — nothing else changes.

The response parsers are deliberately forgiving, so you probably don't need to
change your backend at all:

| Your backend returns             | Handled by                                       |
| -------------------------------- | ------------------------------------------------ |
| `{ success, data }`              | `unwrap()` in `client.ts`                        |
| the payload directly             | `unwrap()` falls through                         |
| `{ items, total, totalPages }`   | `toPage()` in `requests.service.ts`              |
| `{ rows, count }` (Sequelize)    | `toPage()`                                       |
| a bare array                     | `toPage()`                                       |
| express-validator `errors[]`     | `toApiError()` → per-field messages on the form  |
| `{ errors: { email: "..." } }`   | `toApiError()`                                   |

### Endpoints the frontend calls

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/mfa/verify`,
`POST /auth/mfa/resend`, `POST /auth/mfa/setup`, `POST /auth/mfa/enable`,
`POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`,
`POST /auth/forgot-password`, `POST /auth/reset-password`,
`POST /auth/change-password`, `GET /auth/csrf-token`

**Citizen** — `GET|POST /requests`, `GET /requests/:id`,
`PATCH /requests/:id/cancel`, `GET /requests/:id/timeline`,
`POST /requests/:id/attachments`, `GET /requests/:id/document`,
`GET /requests/track/:reference`, `PUT /users/me`

**Offices** — `GET /offices`, `GET /offices/:id`,
`GET /offices/nearest?lat&lng&limit`, `POST|PUT|DELETE /offices`,
`POST /offices/import`

**Admin** — `GET /admin/stats`, `GET /admin/requests`,
`GET /admin/requests/:id`, `PATCH /admin/requests/:id/status`,
`PATCH /admin/requests/:id/dispatch`, `POST /admin/requests/:id/match`,
`GET /admin/users`, `GET /admin/records`, `POST /admin/records/import`

### The two shapes that matter most

`POST /auth/login` must return **either** a session **or** an MFA challenge:

```jsonc
// MFA required
{ "success": true, "data": { "mfaRequired": true, "mfaToken": "<short-lived JWT>" } }

// No MFA
{ "success": true, "data": { "mfaRequired": false, "accessToken": "…", "user": { … } } }
```

`POST /auth/mfa/verify` takes `{ mfaToken, code }` and returns `{ accessToken?, user }`.

If your backend has no `/offices/nearest` route, the frontend falls back to
fetching all offices and sorting them client-side with the haversine formula
(`src/lib/geo.ts`) — the UI works either way.

---

## 3. Architecture

```
src/
├─ app/
│  ├─ (auth)/          login (+ MFA step), register, forgot-password
│  ├─ (app)/           citizen area  — guarded, AppShell variant="citizen"
│  ├─ admin/           staff area    — guarded, AppShell variant="admin"
│  ├─ track/           PUBLIC tracking by reference (no sign-in)
│  └─ layout.tsx       AuthProvider → ToastProvider
├─ components/
│  ├─ ui/              Button, Field (Input/Password/Select/Textarea), Modal,
│  │                   OtpInput, FileDrop, Card, StatusBadge, EmptyState…
│  ├─ layout/          AppShell (responsive sidebar+drawer), Guard (RBAC)
│  ├─ map/             OfficeMap (dynamic, ssr:false) + OfficeMapInner (Leaflet)
│  └─ requests/        Timeline (lifecycle stepper)
├─ context/            AuthContext (session via SWR), ToastContext
├─ hooks/              useApi (SWR wrapper), useGeolocation
├─ lib/
│  ├─ api/             endpoints.ts ⟵ EDIT THIS · client.ts · *.service.ts
│  ├─ validation.ts    zod schemas mirroring server rules
│  ├─ geo.ts           haversine, nearest-office sort, directions deep-link
│  ├─ constants.ts     10 regions, capitals, statuses + colours
│  └─ types.ts         domain model — keep in sync with your DB
└─ proxy.ts            edge route gate + security headers
```

**Data fetching.** All reads go through `useApi` (SWR): deduplication, per-key
caching, no `setState` inside effects. Writes call a service directly, then
push the result into the SWR cache (`mutate(updated, { revalidate: false })`).

**Routing.** `src/proxy.ts` (Next 16's replacement for `middleware.ts`) redirects
signed-out visitors and sets security headers. `<Guard roles={[…]}>` enforces
roles client-side.

---

## 4. Security notes

This is the frontend half only — every control below must be enforced again
server-side. A browser is never a trust boundary.

| Concern             | What the frontend does                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- |
| Token storage       | Cookie mode by default (httpOnly ⇒ XSS can't read it). Bearer mode keeps the token **in memory only** — never `localStorage`. |
| Session expiry      | One refresh attempt per 401, queued replays, no stampede (`client.ts`).                 |
| CSRF                | `X-CSRF-Token` double-submit header on POST/PUT/PATCH/DELETE.                            |
| Account enumeration | Login and forgot-password return identical messages whether or not the email exists.     |
| MFA                 | TOTP/OTP step with paste-aware 6-box input, 30 s resend cooldown, recovery codes.         |
| Password policy     | 12+ chars, mixed case, digit, symbol, live strength meter (`validation.ts`).              |
| Headers             | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` in `proxy.ts`. |
| Uploads             | Extension + size checks before upload. **Verify magic bytes and AV-scan server-side.**    |
| Geolocation         | Requested only on an explicit click, never on page load.                                  |
| Third parties       | No external fonts or CDNs. Map tiles come from OpenStreetMap.                              |

**Still to do on the backend:** rate-limit `/auth/*`, add a strict CSP,
argon2id password hashing, short access-token TTL with rotating refresh tokens,
per-request authorisation checks (never trust `role` from the client), an
append-only audit log for every civil-status read, and encryption at rest.

---

## 5. What is not built yet

- Admin `POST /admin/requests/:id/document` upload UI (service method exists).
- Email verification and password-reset landing pages (`/verify-email`, `/reset-password`).
- Offline/PWA support and i18n (French + English) — worth adding for Cameroon.
- Tests. Suggested: Vitest + Testing Library for `geo.ts`, `validation.ts` and
  `client.ts` error mapping; Playwright for login → request → dispatch.
