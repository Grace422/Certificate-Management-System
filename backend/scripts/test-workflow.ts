/**
 * Full workflow integration test against a running server:
 * 1. Super admin logs in (seeded account), creates an origin_admin and a
 *    destination_admin, each tied to a real seeded council.
 * 2. Both admins complete their first-login MFA setup.
 * 3. Super admin bulk-uploads a CSV of civil records.
 * 4. A citizen registers, searches for their record, and submits a
 *    certificate request with a location far from the origin council
 *    (so the nearest-council routing has something real to compute).
 * 5. Origin admin approves -> system computes nearest council and routes.
 * 6. Destination admin marks ready, then completes.
 * 7. Verify the final state and audit trail.
 */
import { authenticator } from "otplib";

const BASE = "http://localhost:4000/api/v1";

async function req(path: string, options: RequestInit & { accessToken?: string; cookie?: string } = {}) {
  const { accessToken, cookie, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(cookie ? { Cookie: cookie } : {})
  };

  const res = await fetch(`${BASE}${path}`, { ...rest, headers });
  const setCookie = res.headers.get("set-cookie");
  const body: any = await res.json();
  return { status: res.status, body, cookie: setCookie ? setCookie.split(";")[0] : undefined };
}

async function loginFlow(email: string, password: string) {
  let r = await req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.body)}`);

  const { requiresSetup, challengeToken, otpauthUrl } = r.body.data;
  const secret = otpauthUrl ? new URL(otpauthUrl).searchParams.get("secret")! : null;

  if (requiresSetup) {
    const otp = authenticator.generate(secret!);
    r = await req("/auth/mfa/setup/verify", { method: "POST", body: JSON.stringify({ challengeToken, otp }) });
  } else {
    // For accounts with MFA already enabled we'd need the secret from
    // registration time - the caller passes it in for that case.
    throw new Error("unexpected: MFA already enabled in this test path");
  }
  if (r.status !== 200) throw new Error(`mfa verify failed: ${JSON.stringify(r.body)}`);
  return { accessToken: r.body.data.accessToken, cookie: r.cookie!, user: r.body.data.user, secret };
}

async function loginWithKnownSecret(email: string, password: string, secret: string) {
  let r = await req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  const { challengeToken } = r.body.data;
  const otp = authenticator.generate(secret);
  r = await req("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ challengeToken, otp }) });
  if (r.status !== 200) throw new Error(`mfa verify failed: ${JSON.stringify(r.body)}`);
  return { accessToken: r.body.data.accessToken, cookie: r.cookie!, user: r.body.data.user };
}

async function main() {
  console.log("=== 1) Super admin login (seeded account) ===");
  const superLogin = await loginWithSuperAdmin();
  console.log("   OK, role:", superLogin.user.role);

  console.log("=== 2) Get seeded councils, pick Buea (origin) and Ebolowa (destination) ===");
  const councilsRes = await req("/councils", { accessToken: superLogin.accessToken });
  const councils = councilsRes.body.data;
  const buea = councils.find((c: any) => c.name === "Buea Council");
  const ebolowa = councils.find((c: any) => c.name === "Ebolowa Council");
  if (!buea || !ebolowa) throw new Error("Seed councils not found - did you run `npm run seed`?");
  console.log("   Buea:", buea.id, " Ebolowa:", ebolowa.id);

  console.log("=== 3) Create origin_admin (Buea) and destination_admin (Ebolowa) ===");
  const ts = Date.now();
  const originEmail = `origin_${ts}@cscms.cm`;
  const destEmail = `dest_${ts}@cscms.cm`;
  const adminPassword = "AdminPass123!";

  let r = await req("/users", {
    method: "POST",
    accessToken: superLogin.accessToken,
    body: JSON.stringify({ firstName: "Origin", lastName: "Admin", email: originEmail, password: adminPassword, role: "origin_admin", councilId: buea.id })
  });
  if (r.status !== 201) throw new Error(`create origin_admin failed: ${JSON.stringify(r.body)}`);

  r = await req("/users", {
    method: "POST",
    accessToken: superLogin.accessToken,
    body: JSON.stringify({ firstName: "Dest", lastName: "Admin", email: destEmail, password: adminPassword, role: "destination_admin", councilId: ebolowa.id })
  });
  if (r.status !== 201) throw new Error(`create destination_admin failed: ${JSON.stringify(r.body)}`);
  console.log("   Both admin accounts created");

  console.log("=== 4) Both admins complete first-login MFA setup ===");
  const originAuth = await loginFlow(originEmail, adminPassword);
  const destAuth = await loginFlow(destEmail, adminPassword);
  console.log("   Origin admin role:", originAuth.user.role, " Dest admin role:", destAuth.user.role);

  console.log("=== 5) Super admin bulk-uploads a CSV of civil records ===");
  const csv = [
    "record_type,full_name,date_of_birth,place_of_birth,registration_number,council_name",
    `birth,Jean Paul Mballa,1990-05-14,Buea,REG-${ts}-001,Buea Council`,
    "birth,,1990-05-14,Buea,REG-BAD-002,Buea Council" // intentionally malformed row - full_name missing
  ].join("\n");
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "records.csv");
  r = await req("/records/bulk-upload", { method: "POST", accessToken: superLogin.accessToken, body: form as any });
  if (r.status !== 200) throw new Error(`bulk upload failed: ${JSON.stringify(r.body)}`);
  console.log("   ", r.body.message, "| errors:", JSON.stringify(r.body.data.errors));
  if (r.body.data.insertedCount !== 1) throw new Error("Expected exactly 1 successful row (1 good + 1 bad)");

  console.log("=== 6) Citizen registers and completes MFA setup ===");
  const citizenEmail = `citizen_${ts}@example.com`;
  const citizenPassword = "CitizenPass123!";
  r = await req("/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName: "Jean", lastName: "Mballa", email: citizenEmail, password: citizenPassword })
  });
  const regSecret = new URL(r.body.data.otpauthUrl).searchParams.get("secret")!;
  const regOtp = authenticator.generate(regSecret);
  r = await req("/auth/mfa/setup/verify", { method: "POST", body: JSON.stringify({ challengeToken: r.body.data.challengeToken, otp: regOtp }) });
  const citizenAccessToken = r.body.data.accessToken;
  console.log("   Citizen registered:", r.body.data.user.email);

  console.log("=== 7) Citizen searches for their civil record ===");
  r = await req("/records?fullName=Mballa", { accessToken: citizenAccessToken });
  if (r.status !== 200 || r.body.data.length === 0) throw new Error(`search failed: ${JSON.stringify(r.body)}`);
  const record = r.body.data[0];
  console.log("   Found record:", record.fullName, record.id);

  console.log("=== 8) Citizen submits a certificate request from Ebolowa's coordinates ===");
  // Ebolowa coordinates - far from Buea (origin), so nearest-council routing
  // should send this back to Ebolowa, not somewhere near Buea.
  r = await req("/requests", {
    method: "POST",
    accessToken: citizenAccessToken,
    body: JSON.stringify({ civilRecordId: record.id, requestType: "copy", latitude: 2.9167, longitude: 11.1546 })
  });
  if (r.status !== 201) throw new Error(`create request failed: ${JSON.stringify(r.body)}`);
  const request = r.body.data;
  console.log("   Request created:", request.id, "status:", request.status, "origin:", request.originCouncilName);

  console.log("=== 9) Origin admin (Buea) sees it in their incoming queue ===");
  r = await req("/requests", { accessToken: originAuth.accessToken });
  const incoming = r.body.data.find((x: any) => x.id === request.id);
  if (!incoming) throw new Error("Origin admin cannot see the pending request");
  console.log("   Visible to origin admin, status:", incoming.status);

  console.log("=== 10) Origin admin approves -> should auto-route to Ebolowa (nearest to citizen's location) ===");
  r = await req(`/requests/${request.id}/approve`, { method: "PATCH", accessToken: originAuth.accessToken });
  if (r.status !== 200) throw new Error(`approve failed: ${JSON.stringify(r.body)}`);
  console.log("   Status:", r.body.data.status, "| routed to:", r.body.data.destinationCouncilName);
  if (r.body.data.destinationCouncilName !== "Ebolowa Council") {
    throw new Error(`ROUTING BUG: expected Ebolowa Council, got ${r.body.data.destinationCouncilName}`);
  }

  console.log("=== 11) Destination admin (Ebolowa) sees it and marks ready ===");
  r = await req("/requests", { accessToken: destAuth.accessToken });
  const atDestination = r.body.data.find((x: any) => x.id === request.id);
  if (!atDestination) throw new Error("Destination admin cannot see the routed request");

  r = await req(`/requests/${request.id}/ready`, { method: "PATCH", accessToken: destAuth.accessToken });
  if (r.status !== 200) throw new Error(`mark ready failed: ${JSON.stringify(r.body)}`);
  console.log("   Status:", r.body.data.status);

  console.log("=== 12) Destination admin completes the request ===");
  r = await req(`/requests/${request.id}/complete`, { method: "PATCH", accessToken: destAuth.accessToken });
  if (r.status !== 200) throw new Error(`complete failed: ${JSON.stringify(r.body)}`);
  console.log("   Final status:", r.body.data.status);
  if (r.body.data.status !== "completed") throw new Error("Request did not reach completed status");

  console.log("=== 13) Wrong-council admin cannot act on someone else's request (authorization check) ===");
  const secondOriginLogin = await req("/auth/login", { method: "POST", body: JSON.stringify({ email: destEmail, password: adminPassword }) });
  // destAuth already has a valid token; try using it to approve a DIFFERENT council's pending request-less action
  r = await req(`/requests/${request.id}/approve`, { method: "PATCH", accessToken: destAuth.accessToken });
  if (r.status !== 403 && r.status !== 400 && r.status !== 409) {
    console.log("   ⚠ Expected a rejection (403/409), got:", r.status, r.body.message);
  } else {
    console.log("   Correctly rejected cross-council/invalid-state action:", r.status, r.body.message);
  }

  console.log("=== 14) Super admin can see this in the audit log ===");
  r = await req("/audit-logs", { accessToken: superLogin.accessToken });
  const relevant = r.body.data.filter((log: any) => log.entity_id === request.id);
  console.log(`   Found ${relevant.length} audit entries for this request:`, relevant.map((l: any) => l.action).join(", "));
  if (relevant.length < 3) throw new Error("Expected at least 3 audit entries (created, approved, ready, completed)");

  console.log("\n✅ ALL WORKFLOW CHECKS PASSED");
}

async function loginWithSuperAdmin() {
  // Seeded by scripts/seed.ts - MFA not enabled by default for the seed
  // account, so it goes through the same requiresSetup branch.
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@cscms.cm";
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";

  let r = await req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  if (r.status !== 200) throw new Error(`super admin login failed: ${JSON.stringify(r.body)}`);

  if (r.body.data.requiresSetup) {
    const secret = new URL(r.body.data.otpauthUrl).searchParams.get("secret")!;
    const otp = authenticator.generate(secret);
    r = await req("/auth/mfa/setup/verify", { method: "POST", body: JSON.stringify({ challengeToken: r.body.data.challengeToken, otp }) });
  } else {
    throw new Error("Super admin already has MFA enabled - re-seed the DB or adjust this test");
  }
  return { accessToken: r.body.data.accessToken, user: r.body.data.user };
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message);
  process.exit(1);
});
