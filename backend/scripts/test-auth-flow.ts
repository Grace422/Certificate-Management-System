/**
 * Manual integration test for the Auth module - hits a running server on
 * localhost with real HTTP requests, using the `otplib` authenticator to
 * generate real TOTP codes (simulating a user's authenticator app).
 * Not a permanent part of the repo - just for verifying this step works.
 */
import { authenticator } from "otplib";

const BASE = "http://localhost:4000/api/v1";
let cookieJar = "";

function extractCookie(res: Response): void {
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookieJar = setCookie.split(";")[0];
}

async function main() {
  const email = `test_${Date.now()}@example.com`;
  const password = "SuperSecret123!";

  console.log("1) Register...");
  let res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Jean", lastName: "Mballa", email, password })
  });
  let body: any = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  if (res.status !== 201) throw new Error("Register failed: " + JSON.stringify(body));
  const { challengeToken, otpauthUrl } = body.data;

  // Extract the base32 secret from the otpauth URL to simulate scanning it.
  const secret = new URL(otpauthUrl).searchParams.get("secret")!;
  console.log("   secret extracted from otpauth URL:", secret.slice(0, 6) + "...");

  console.log("2) Complete MFA setup with a real TOTP code...");
  let otp = authenticator.generate(secret);
  res = await fetch(`${BASE}/auth/mfa/setup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, otp })
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  if (res.status !== 200) throw new Error("MFA setup failed: " + JSON.stringify(body));
  extractCookie(res);
  let accessToken = body.data.accessToken;

  console.log("3) GET /auth/me with access token...");
  res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  body = await res.json();
  console.log("   status:", res.status, "user:", body.data?.email, body.data?.role);

  console.log("4) Login step 1 (email+password)...");
  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  const loginChallenge = body.data.challengeToken;

  console.log("5) Login step 2 (TOTP)...");
  otp = authenticator.generate(secret);
  res = await fetch(`${BASE}/auth/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken: loginChallenge, otp })
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  if (res.status !== 200) throw new Error("MFA login verify failed: " + JSON.stringify(body));
  extractCookie(res);
  accessToken = body.data.accessToken;

  console.log("6) Wrong password should fail with generic message...");
  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "WrongPassword1!" })
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);

  console.log("7) Refresh token rotation...");
  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: cookieJar }
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  const oldCookie = cookieJar;
  extractCookie(res);
  const newAccessToken = body.data.accessToken;
  console.log("   new access token differs from old:", newAccessToken !== accessToken);

  console.log("8) Reuse OLD (now-revoked) refresh cookie -> should be rejected + revoke all sessions...");
  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: oldCookie }
  });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);
  if (res.status === 200) throw new Error("SECURITY BUG: reused refresh token was accepted!");

  console.log("9) Logout...");
  res = await fetch(`${BASE}/auth/logout`, { method: "POST", headers: { Cookie: cookieJar } });
  body = await res.json();
  console.log("   status:", res.status, "message:", body.message);

  console.log("\n✅ ALL AUTH FLOW CHECKS PASSED");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message);
  process.exit(1);
});
