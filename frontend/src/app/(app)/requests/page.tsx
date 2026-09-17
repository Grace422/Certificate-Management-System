'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FilePlus2, Search } from 'lucide-react';
import { requestsService } from '@/lib/api/requests.service';
import { useApi } from '@/hooks/useApi';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { STATUS_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { RequestStatus } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export default function RequestsPage() {
  const [status, setStatus] = useState<RequestStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error } = useApi(
    ['requests', page, status, debounced] as const,
    () => requestsService.list({ page, pageSize: 10, status, search: debounced || undefined }),
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <PageHeader
        title="My requests"
        description="Every certificate request you have filed."
        action={
          <Link href="/requests/new">
            <Button leftIcon={<FilePlus2 className="size-4" />}>New request</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by reference or name…"
              aria-label="Search requests"
              className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <div className="w-48">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as RequestStatus | 'ALL');
              }}
              aria-label="Filter by status"
            />
          </div>
        </div>
      </Card>

      <ErrorBanner message={error} />

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No requests found"
              description="Try a different filter, or file a new request."
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Filed</th>
                  <th className="px-5 py-3 font-medium">Collection point</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <Link href={`/requests/${r.id}`} className="font-mono text-xs font-medium text-emerald-700 hover:underline">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 capitalize">
                      {r.certificateType.toLowerCase()}
                      {r.requestType === 'LOSS_DECLARATION' && (
                        <span className="ml-1 text-xs text-slate-400">(loss)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{r.pickupOffice?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {items.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="block px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-xs font-medium text-emerald-700">{r.reference}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800 capitalize">
                      {r.certificateType.toLowerCase()} certificate
                    </p>
                    <p className="text-xs text-slate-500">Filed {formatDate(r.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
