'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { adminService } from '@/lib/api/admin.service';
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
import { REGIONS, STATUS_LABEL } from '@/lib/constants';
import { formatDate, timeAgo } from '@/lib/utils';
import type { RequestStatus } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<RequestStatus | 'ALL'>('PENDING');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error } = useApi(
    ['admin:requests', page, status, region, debounced] as const,
    () =>
      adminService.requests({
        page,
        pageSize: 15,
        status,
        region: region || undefined,
        search: debounced || undefined,
      }),
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Request queue"
        description={`${total.toLocaleString()} request${total === 1 ? '' : 's'} matching your filters.`}
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
              placeholder="Reference, name or place of birth…"
              aria-label="Search requests"
              className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <div className="w-44">
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
          <div className="w-44">
            <Select
              placeholder="All regions"
              options={REGIONS.map((r) => ({ value: r, label: r }))}
              value={region}
              onChange={(e) => {
                setPage(1);
                setRegion(e.target.value);
              }}
              aria-label="Filter by region"
            />
          </div>
        </div>
      </Card>

      <ErrorBanner message={error} />

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No requests match" description="Adjust the filters above." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Applicant</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Place of birth</th>
                  <th className="px-5 py-3 font-medium">Filed</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.reference}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize">
                      {r.certificateType.toLowerCase()}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.placeOfBirth}</td>
                    <td className="px-5 py-3 text-slate-600" title={formatDate(r.createdAt)}>
                      {timeAgo(r.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="text-sm font-medium text-emerald-700 hover:underline"
                      >
                        Process
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
