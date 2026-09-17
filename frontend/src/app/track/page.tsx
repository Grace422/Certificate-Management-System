'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Timeline } from '@/components/requests/Timeline';
import { Button, Card, ErrorBanner, StatusBadge } from '@/components/ui';
import { Input } from '@/components/ui/Field';
import { requestsService } from '@/lib/api/requests.service';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import type { CertificateRequest } from '@/lib/types';

/** Public tracking by reference — no sign-in required, no personal data shown. */
export default function TrackPage() {
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<CertificateRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await requestsService.track(reference.trim()));
    } catch (err) {
      setError(
        (err as ApiError).status === 404
          ? 'No request found with that reference.'
          : (err as ApiError).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
              CR
            </span>
            <span className="font-semibold text-slate-900">CivilReg Cameroon</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Track a request</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Enter the reference from your submission receipt, e.g. CR-2026-000134.
        </p>

        <Card>
          <form onSubmit={track} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <Input
                label="Request reference"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder="CR-2026-000134"
                required
              />
            </div>
            <Button type="submit" loading={busy} disabled={!reference.trim()} leftIcon={<Search className="size-4" />}>
              Track
            </Button>
          </form>
        </Card>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {result && (
          <Card className="mt-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-slate-500">{result.reference}</p>
                <p className="text-sm font-medium text-slate-900 capitalize">
                  {result.certificateType.toLowerCase()} certificate · filed{' '}
                  {formatDate(result.createdAt)}
                </p>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <Timeline status={result.status} events={result.timeline} />

            {result.pickupOffice && (
              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Collection point
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{result.pickupOffice.name}</p>
                <p className="text-sm text-slate-600">
                  {result.pickupOffice.council}, {result.pickupOffice.region}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Sign in to see full details, directions and to download your receipt.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
