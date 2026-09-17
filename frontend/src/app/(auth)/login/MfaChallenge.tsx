'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/api/auth.service';
import { ApiError } from '@/lib/api/client';
import { Button, Card, ErrorBanner } from '@/components/ui';
import { OtpInput } from '@/components/ui/OtpInput';

/** Second authentication factor: 6-digit TOTP or emailed/SMS OTP. */
export function MfaChallenge({
  mfaToken,
  email,
  nextPath,
}: {
  mfaToken: string;
  email: string;
  nextPath?: string;
}) {
  const { completeMfa } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30); // throttles OTP re-sends

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const user = await completeMfa(mfaToken, value);
      router.replace(nextPath ?? (user.role === 'CITIZEN' ? '/dashboard' : '/admin'));
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.status === 429
          ? 'Too many incorrect codes. Wait a moment before trying again.'
          : err.status === 401
            ? 'That code is not valid or has expired.'
            : err.message,
      );
      setCode('');
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await authService.resendOtp(mfaToken);
      setCooldown(30);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  const masked = email.replace(/^(.).*(@.*)$/, '$1•••••$2');

  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Two-step verification</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter the 6-digit code from your authenticator app, or the one sent to {masked}.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ErrorBanner message={error} />

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          disabled={busy}
          error={!!error}
        />

        <Button fullWidth loading={busy} disabled={code.length !== 6} onClick={() => submit(code)}>
          Verify and sign in
        </Button>

        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="w-full text-center text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </Card>
  );
}
