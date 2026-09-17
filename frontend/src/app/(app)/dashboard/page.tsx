'use client';

import Link from 'next/link';
import { FilePlus2, FileSearch, ShieldAlert } from 'lucide-react';
import { requestsService } from '@/lib/api/requests.service';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { formatDate, timeAgo } from '@/lib/utils';
import { STATUS_LABEL } from '@/lib/constants';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, loading, error } = useApi('dashboard:requests', () =>
    requestsService.list({ page: 1, pageSize: 5 }),
  );
  const requests = data?.items ?? [];

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? ''}`}
        description="Request certificates and follow their progress."
        action={
          <Link href="/requests/new">
            <Button leftIcon={<FilePlus2 className="size-4" />}>New request</Button>
          </Link>
        }
      />

      <ErrorBanner message={error} />

      {/* MFA nudge — the single highest-value security prompt for citizens */}
      {user && !user.mfaEnabled && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert className="size-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-900">
            Two-step verification is not enabled. Add it to protect your civil status records.
          </p>
          <Link href="/security">
            <Button size="sm" variant="outline">
              Enable now
            </Button>
          </Link>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['PENDING', 'UNDER_REVIEW', 'READY', 'COLLECTED'] as const).map((s) => (
          <Card key={s} className="py-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {STATUS_LABEL[s]}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {loading ? <Skeleton className="h-7 w-10" /> : (counts[s] ?? 0)}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent requests"
          description="Your five most recent submissions."
          action={
            <Link href="/requests" className="text-sm font-medium text-emerald-700 hover:underline">
              View all
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<FileSearch className="size-8" />}
            title="No requests yet"
            description="File a request for a certificate copy, or declare a lost document."
            action={
              <Link href="/requests/new">
                <Button>Create your first request</Button>
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/requests/${r.id}`}
                  className="flex flex-wrap items-center gap-3 py-3.5 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.certificateType.toLowerCase()} certificate ·{' '}
                      <span className="font-mono text-xs text-slate-500">{r.reference}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Filed {timeAgo(r.createdAt)} · born {formatDate(r.dateOfBirth)} in{' '}
                      {r.placeOfBirth}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
