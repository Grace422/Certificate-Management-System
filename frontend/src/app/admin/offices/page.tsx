'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import OfficeMap from '@/components/map/OfficeMap';
import { Button, Card, ErrorBanner, PageHeader, Select, Skeleton } from '@/components/ui';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { officesService } from '@/lib/api/offices.service';
import { useApi } from '@/hooks/useApi';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import { officeSchema, type OfficeValues } from '@/lib/validation';
import { REGIONS } from '@/lib/constants';
import type { MunicipalOffice, Region } from '@/lib/types';

export default function AdminOfficesPage() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [editing, setEditing] = useState<MunicipalOffice | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OfficeValues>({ resolver: zodResolver(officeSchema) });

  // `reload` re-fetches this key after a create / update / delete.
  const { data, loading, error, reload } = useApi('admin:offices', () => officesService.list());
  const offices = useMemo(() => data ?? [], [data]);

  const openForm = (office?: MunicipalOffice) => {
    setEditing(office ?? null);
    reset(
      office
        ? {
            name: office.name,
            region: office.region,
            division: office.division,
            council: office.council,
            address: office.address ?? '',
            phone: office.phone ?? '',
            email: office.email ?? '',
            latitude: office.latitude,
            longitude: office.longitude,
            isActive: office.isActive,
          }
        : { isActive: true, region: '', latitude: 0, longitude: 0 },
    );
    setOpen(true);
  };

  const submit = async (values: OfficeValues) => {
    try {
      if (editing) {
        await officesService.update(editing.id, values as Partial<MunicipalOffice>);
        toast.success('Office updated.');
      } else {
        await officesService.create(values as unknown as Omit<MunicipalOffice, 'id'>);
        toast.success('Office created.');
      }
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const remove = async (office: MunicipalOffice) => {
    if (!window.confirm(`Deactivate "${office.name}"? Citizens will no longer be routed there.`)) return;
    try {
      await officesService.remove(office.id);
      toast.success('Office removed.');
      await reload();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offices.filter(
      (o) =>
        (!region || o.region === region) &&
        (!q || o.name.toLowerCase().includes(q) || o.council.toLowerCase().includes(q)),
    );
  }, [offices, query, region]);

  return (
    <>
      <PageHeader
        title="Municipal offices"
        description={`${offices.length} civil status centres registered nationwide.`}
        action={
          <Button onClick={() => openForm()} leftIcon={<Plus className="size-4" />}>
            Add office
          </Button>
        }
      />

      <ErrorBanner message={error} />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offices…"
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

      <Card padded={false} className="mb-6 overflow-hidden">
        <OfficeMap offices={visible} height={320} />
      </Card>

      <Card padded={false}>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Office</th>
                  <th className="px-5 py-3 font-medium">Council</th>
                  <th className="px-5 py-3 font-medium">Division</th>
                  <th className="px-5 py-3 font-medium">Region</th>
                  <th className="px-5 py-3 font-medium">Coordinates</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{o.name}</td>
                    <td className="px-5 py-3 text-slate-600">{o.council}</td>
                    <td className="px-5 py-3 text-slate-600">{o.division}</td>
                    <td className="px-5 py-3 text-slate-600">{o.region}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          o.isActive
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700'
                            : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'
                        }
                      >
                        {o.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openForm(o)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Edit ${o.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(o)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${o.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit office' : 'Add municipal office'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
              {editing ? 'Save changes' : 'Create office'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(submit)}>
          <Input label="Office name" required error={errors.name?.message} {...register('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Region"
              required
              placeholder="Select region"
              options={REGIONS.map((r: Region) => ({ value: r, label: r }))}
              error={errors.region?.message}
              {...register('region')}
            />
            <Input label="Division" required error={errors.division?.message} {...register('division')} />
            <Input label="Council" required error={errors.council?.message} {...register('council')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          </div>
          <Input label="Address" error={errors.address?.message} {...register('address')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              required
              error={errors.latitude?.message}
              {...register('latitude')}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              required
              error={errors.longitude?.message}
              {...register('longitude')}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              {...register('isActive')}
            />
            Active — citizens can be routed here
          </label>
        </form>
      </Modal>
    </>
  );
}
