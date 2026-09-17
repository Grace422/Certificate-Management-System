'use client';

import { useState } from 'react';
import Image from 'next/image';
import { KeyRound, ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import { Button, Card, CardHeader, ErrorBanner, PageHeader } from '@/components/ui';
import { PasswordInput } from '@/components/ui/Field';
import { OtpInput } from '@/components/ui/OtpInput';
import { Modal } from '@/components/ui/Modal';
import { authService } from '@/lib/api/auth.service';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { MfaSetupInfo } from '@/lib/types';

export default function SecurityPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [setup, setSetup] = useState<MfaSetupInfo | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const startSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await authService.setupMfa());
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authService.enableMfa(value);
      setRecovery(res.recoveryCodes ?? null);
      setSetup(null);
      setCode('');
      await refreshUser();
      toast.success('Two-step verification is now active.');
    } catch (e) {
      setError((e as ApiError).message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setPwBusy(true);
    try {
      await authService.changePassword(current, next);
      setCurrent('');
      setNext('');
      toast.success('Password updated. Other sessions were signed out.');
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Security" description="Protect access to your civil status records." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Two-step verification"
            description="Require a one-time code from an authenticator app at every sign-in."
          />

          <ErrorBanner message={error} />

          <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            {user?.mfaEnabled ? (
              <ShieldCheck className="size-6 text-emerald-600" />
            ) : (
              <ShieldOff className="size-6 text-amber-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                {user?.mfaEnabled ? 'Enabled' : 'Not enabled'}
              </p>
              <p className="text-xs text-slate-500">
                {user?.mfaEnabled
                  ? 'A code is required each time you sign in.'
                  : 'Your account is protected by password only.'}
              </p>
            </div>
            {!user?.mfaEnabled && (
              <Button size="sm" onClick={startSetup} loading={busy}>
                Set up
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Password" description="Use a long, unique passphrase." />
          <div className="space-y-4">
            <PasswordInput
              label="Current password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              hint="At least 12 characters, mixed case, a digit and a symbol"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <Button
              onClick={changePassword}
              loading={pwBusy}
              disabled={!current || next.length < 12}
              leftIcon={<KeyRound className="size-4" />}
            >
              Update password
            </Button>
          </div>
        </Card>
      </div>

      {/* Enrolment modal: scan QR → confirm with a code */}
      <Modal open={!!setup} onClose={() => setSetup(null)} title="Set up two-step verification">
        {setup && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Scan this QR code with Google Authenticator, Microsoft Authenticator or any TOTP app,
              then enter the 6-digit code it shows.
            </p>

            {setup.qrCodeDataUrl && (
              <div className="flex justify-center">
                <Image
                  src={setup.qrCodeDataUrl}
                  alt="Authenticator QR code"
                  width={180}
                  height={180}
                  unoptimized
                  className="rounded-lg border border-slate-200"
                />
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Or enter this key manually:</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 font-mono text-xs break-all text-slate-800">{setup.secret}</code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(setup.secret);
                    toast.success('Key copied.');
                  }}
                  aria-label="Copy key"
                >
                  <Copy className="size-4 text-slate-400 hover:text-slate-700" />
                </button>
              </div>
            </div>

            <ErrorBanner message={error} />
            <OtpInput value={code} onChange={setCode} onComplete={confirmSetup} disabled={busy} />
            <Button
              fullWidth
              loading={busy}
              disabled={code.length !== 6}
              onClick={() => confirmSetup(code)}
            >
              Verify and enable
            </Button>
          </div>
        )}
      </Modal>

      {/* One-time recovery codes */}
      <Modal
        open={!!recovery}
        onClose={() => setRecovery(null)}
        title="Save your recovery codes"
        footer={<Button onClick={() => setRecovery(null)}>I have saved them</Button>}
      >
        <p className="mb-4 text-sm text-slate-600">
          Each code works once if you lose your phone. Store them somewhere safe — they will not be
          shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4">
          {recovery?.map((c) => (
            <code key={c} className="font-mono text-sm text-slate-800">
              {c}
            </code>
          ))}
        </div>
      </Modal>
    </>
  );
}
