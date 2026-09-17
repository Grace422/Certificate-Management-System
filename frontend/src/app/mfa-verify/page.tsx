"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function MfaVerifyPage() {
  const { challengeToken, verifyMfaLogin, user } = useAuth();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
    else if (!challengeToken) router.replace("/login");
  }, [user, challengeToken, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyMfaLogin(otp);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!challengeToken) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-ink">Enter your authentication code</h1>
        <p className="mt-1 text-sm text-muted">Open your authenticator app and enter the current 6-digit code.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
            Verify and log in
          </Button>
        </form>
      </Card>
    </div>
  );
}
