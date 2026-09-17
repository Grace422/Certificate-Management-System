"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function MfaSetupPage() {
  const { otpauthUrl, challengeToken, completeMfaSetup, user } = useAuth();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guard: this page only makes sense mid-registration or mid-first-login
  // (admin accounts provisioned by Super Admin). If there's no pending
  // challenge (e.g. direct navigation, or already completed), send the
  // person somewhere sensible instead of showing a broken form.
  useEffect(() => {
    if (user) router.replace(user.role === "citizen" ? "/dashboard" : "/admin");
    else if (!challengeToken || !otpauthUrl) router.replace("/login");
  }, [user, challengeToken, otpauthUrl, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const completedUser = await completeMfaSetup(otp);
      router.push(completedUser.role === "citizen" ? "/dashboard" : "/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!otpauthUrl) return null; // redirect effect above will fire

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-ink">Set up two-factor authentication</h1>
        <p className="mt-1 text-sm text-muted">
          Scan this code with Google Authenticator, Authy, or any TOTP app, then enter the 6-digit code it shows.
        </p>

        <div className="my-6 flex justify-center rounded-md border border-border bg-white p-4">
          <QRCodeSVG value={otpauthUrl} size={180} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="6-digit code"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} disabled={otp.length !== 6} className="w-full">
            Verify and activate account
          </Button>
        </form>
      </Card>
    </div>
  );
}
