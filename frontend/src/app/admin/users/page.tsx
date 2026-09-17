'use client';

import { useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { adminService } from '@/lib/api/admin.service';
import { useApi } from '@/hooks/useApi';
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error } = useApi(['admin:users', page, debounced] as const, () =>
    adminService.users({ page, search: debounced || undefined }),
  );

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <PageHeader title="Citizens" description="Registered accounts and their verification state." />

      <Card className="mb-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name or email…"
            aria-label="Search citizens"
            className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
      </Card>

      <ErrorBanner message={error} />

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No citizens found" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">MFA</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {u.email}
                      {!u.emailVerified && (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                          unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 capitalize">{u.role.toLowerCase()}</td>
                    <td className="px-5 py-3">
                      {u.mfaEnabled ? (
                        <ShieldCheck className="size-4 text-emerald-600" aria-label="MFA enabled" />
                      ) : (
                        <ShieldOff className="size-4 text-slate-300" aria-label="MFA disabled" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(u.createdAt)}</td>
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
