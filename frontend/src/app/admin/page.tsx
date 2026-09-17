'use client';

import Link from 'next/link';
import { Building2, FileText, Users, Database } from 'lucide-react';
import { adminService } from '@/lib/api/admin.service';
import { useApi } from '@/hooks/useApi';
import {
  Card,
  CardHeader,
  ErrorBanner,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { timeAgo } from '@/lib/utils';

const TILES = [
  { key: 'totalRequests', label: 'Total requests', icon: FileText },
  { key: 'totalCitizens', label: 'Registered citizens', icon: Users },
  { key: 'totalRecords', label: 'Archive records', icon: Database },
  { key: 'totalOffices', label: 'Municipal offices', icon: Building2 },
] as const;

export default function AdminDashboard() {
  // Two independent keys: the tiles still render if the queue call fails.
  const statsQuery = useApi('admin:stats', () => adminService.stats());
  const queueQuery = useApi('admin:queue', () =>
    adminService.requests({ status: 'PENDING', page: 1, pageSize: 6 }),
  );

  const stats = statsQuery.data;
  const queue = queueQuery.data?.items ?? [];
  const loading = statsQuery.loading || queueQuery.loading;
  const error = statsQuery.error ?? queueQuery.error;

  return (
    <>
      <PageHeader
        title="Administration"
        description="Process citizen requests and manage the national civil status archive."
      />

      <ErrorBanner message={error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {loading ? <Skeleton className="h-7 w-14" /> : (stats?.[key] ?? 0).toLocaleString()}
                </p>
              </div>
              <Icon className="size-5 text-slate-300" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Awaiting processing"
            description="Oldest pending requests first."
            action={
              <Link
                href="/admin/requests"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Open queue
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nothing pending. The queue is clear.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {r.firstName} {r.lastName}
                        <span className="ml-2 font-mono text-xs text-slate-400">{r.reference}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.certificateType.toLowerCase()} · born in {r.placeOfBirth} ·{' '}
                        {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="By status" />
          {loading || !stats ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="space-y-3">
              {(
                [
                  ['Pending', stats.pending, 'bg-amber-500'],
                  ['Under review', stats.underReview, 'bg-blue-500'],
                  ['Approved', stats.approved, 'bg-emerald-500'],
                  ['Dispatched', stats.dispatched, 'bg-indigo-500'],
                  ['Rejected', stats.rejected, 'bg-rose-500'],
                ] as const
              ).map(([label, value, color]) => {
                const pct = stats.totalRequests ? (value / stats.totalRequests) * 100 : 0;
                return (
                  <li key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium text-slate-900">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
