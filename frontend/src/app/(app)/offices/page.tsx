'use client';

import { useMemo, useState } from 'react';
import { Crosshair, MapPin, Navigation, Search } from 'lucide-react';
import OfficeMap from '@/components/map/OfficeMap';
import { Button, Card, ErrorBanner, PageHeader, Select, Skeleton } from '@/components/ui';
import { officesService } from '@/lib/api/offices.service';
import { useApi } from '@/hooks/useApi';
import { useGeolocation } from '@/hooks/useGeolocation';
import { REGIONS } from '@/lib/constants';
import { directionsUrl, formatDistance, sortByDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';

export default function OfficesPage() {
  const geo = useGeolocation();
  const [region, setRegion] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { data, loading, error } = useApi('offices', () => officesService.list());
  const offices = useMemo(() => data ?? [], [data]);

  /** Filter locally — the dataset is a few hundred rows at most. */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = offices.filter(
      (o) =>
        (!region || o.region === region) &&
        (!q ||
          o.name.toLowerCase().includes(q) ||
          o.council.toLowerCase().includes(q) ||
          o.division.toLowerCase().includes(q)),
    );
    if (geo.position) list = sortByDistance(list, geo.position);
    return list;
  }, [offices, region, query, geo.position]);

  return (
    <>
      <PageHeader
        title="Municipal buildings"
        description="Civil status registries across the 10 regions of Cameroon."
        action={
          <Button
            variant="outline"
            onClick={() => void geo.request()}
            loading={geo.loading}
            leftIcon={<Crosshair className="size-4" />}
          >
            Find nearest
          </Button>
        }
      />

      <ErrorBanner message={error ?? geo.error} />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by council or division…"
              aria-label="Search offices"
              className="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="All regions"
              options={REGIONS.map((r) => ({ value: r, label: r }))}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Filter by region"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card padded={false} className="overflow-hidden lg:col-span-3">
          <OfficeMap
            offices={visible}
            userPosition={geo.position}
            selectedOfficeId={selected}
            onSelect={(o) => setSelected(o.id)}
            height={480}
          />
        </Card>

        <div className="lg:col-span-2">
          <Card padded={false}>
            <div className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No offices match your filters.</p>
              ) : (
                visible.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className={cn(
                      'w-full px-4 py-3.5 text-left transition hover:bg-slate-50',
                      selected === o.id && 'bg-emerald-50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{o.name}</p>
                        <p className="text-xs text-slate-500">
                          {o.council}, {o.division} — {o.region}
                        </p>
                        {o.distanceKm != null && (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {formatDistance(o.distanceKm)} away
                          </p>
                        )}
                      </div>
                      <a
                        href={directionsUrl(o, geo.position)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-emerald-700"
                        aria-label={`Directions to ${o.name}`}
                      >
                        <Navigation className="size-4" />
                      </a>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
