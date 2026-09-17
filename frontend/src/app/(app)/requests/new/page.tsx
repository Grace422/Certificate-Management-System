'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Crosshair, MapPin } from 'lucide-react';
import OfficeMap from '@/components/map/OfficeMap';
import { Button, Card, CardHeader, ErrorBanner, Input, PageHeader, Select, Spinner, Textarea } from '@/components/ui';
import { certificateRequestSchema, type CertificateRequestValues } from '@/lib/validation';
import { CERTIFICATE_TYPES, REQUEST_TYPES } from '@/lib/constants';
import { officesService } from '@/lib/api/offices.service';
import { requestsService } from '@/lib/api/requests.service';
import { ApiError } from '@/lib/api/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { formatDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';
import type { MunicipalOffice } from '@/lib/types';

export default function NewRequestPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const geo = useGeolocation();

  const [offices, setOffices] = useState<MunicipalOffice[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CertificateRequestValues>({
    resolver: zodResolver(certificateRequestSchema),
    defaultValues: {
      requestType: 'COPY',
      certificateType: 'BIRTH',
      copies: 1,
      // Pre-fill with the signed-in citizen's own identity data.
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dateOfBirth: user?.dateOfBirth?.slice(0, 10) ?? '',
      placeOfBirth: user?.placeOfBirth ?? '',
      pickupOfficeId: '',
    },
  });

  const requestType = watch('requestType');
  const pickupOfficeId = watch('pickupOfficeId');

  /** Load offices: nearest-first once we have coordinates, otherwise all. */
  const loadOffices = async (lat?: number, lng?: number) => {
    setLoadingOffices(true);
    try {
      const list =
        lat != null && lng != null
          ? await officesService.nearest(lat, lng, 8)
          : await officesService.list();
      setOffices(list);
      // Default the collection point to the closest office.
      if (list[0] && !pickupOfficeId) setValue('pickupOfficeId', list[0].id);
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setLoadingOffices(false);
    }
  };

  useEffect(() => {
    void loadOffices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = async () => {
    const pos = await geo.request();
    if (pos) await loadOffices(pos.latitude, pos.longitude);
  };

  const selected = useMemo(
    () => offices.find((o) => o.id === pickupOfficeId) ?? null,
    [offices, pickupOfficeId],
  );

  const onSubmit = async (values: CertificateRequestValues) => {
    setFormError(null);
    try {
      const created = await requestsService.create({
        ...values,
        fatherName: values.fatherName || undefined,
        motherName: values.motherName || undefined,
        certificateNumber: values.certificateNumber || undefined,
        reason: values.reason || undefined,
        requesterLatitude: geo.position?.latitude,
        requesterLongitude: geo.position?.longitude,
      });
      toast.success(`Request ${created.reference} submitted.`);
      router.push(`/requests/${created.id}`);
    } catch (e) {
      const err = e as ApiError;
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([k, v]) =>
          setError(k as keyof CertificateRequestValues, { message: v }),
        );
      }
      setFormError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="New certificate request"
        description="We search the national archive — you do not need to travel to your region of birth."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-6 lg:col-span-2">
          <ErrorBanner message={formError} />

          {/* 1 — What is being requested */}
          <Card>
            <CardHeader title="1. What do you need?" />
            <div className="grid gap-3 sm:grid-cols-2">
              {REQUEST_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition',
                    requestType === t.value
                      ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <input type="radio" value={t.value} className="sr-only" {...register('requestType')} />
                  <p className="text-sm font-medium text-slate-900">{t.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{t.hint}</p>
                </label>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select
                label="Certificate type"
                required
                options={CERTIFICATE_TYPES.map((c) => ({ value: c.value, label: c.label }))}
                error={errors.certificateType?.message}
                {...register('certificateType')}
              />
              <Input
                label="Number of copies"
                type="number"
                min={1}
                max={5}
                required
                error={errors.copies?.message}
                {...register('copies')}
              />
            </div>
          </Card>

          {/* 2 — Search keys for the archive */}
          <Card>
            <CardHeader
              title="2. Details on the certificate"
              description="These fields drive the archive search. Spell them exactly as registered."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
              <Input
                label="Date of birth"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />
              <Input
                label="Place of birth"
                required
                placeholder="e.g. Buea"
                hint="Council where the record was registered"
                error={errors.placeOfBirth?.message}
                {...register('placeOfBirth')}
              />
              <Input label="Father's name" error={errors.fatherName?.message} {...register('fatherName')} />
              <Input label="Mother's name" error={errors.motherName?.message} {...register('motherName')} />
            </div>

            <div className="mt-4">
              <Input
                label="Certificate number"
                hint="Optional — if you know it, the match is instant"
                error={errors.certificateNumber?.message}
                {...register('certificateNumber')}
              />
            </div>

            {requestType === 'LOSS_DECLARATION' && (
              <div className="mt-4">
                <Textarea
                  label="Circumstances of the loss"
                  required
                  placeholder="Describe when and how the certificate was lost, stolen or destroyed."
                  error={errors.reason?.message}
                  {...register('reason')}
                />
              </div>
            )}
          </Card>

          {/* 3 — Where to collect */}
          <Card>
            <CardHeader
              title="3. Where will you collect it?"
              description="Share your location and we will list the nearest municipal buildings."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useMyLocation}
                  loading={geo.loading}
                  leftIcon={<Crosshair className="size-4" />}
                >
                  Use my location
                </Button>
              }
            />

            {geo.error && <p className="mb-3 text-xs text-amber-700">{geo.error}</p>}

            {loadingOffices ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {offices.map((o) => (
                  <label
                    key={o.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                      pickupOfficeId === o.id
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <input type="radio" value={o.id} className="sr-only" {...register('pickupOfficeId')} />
                    <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{o.name}</p>
                      <p className="text-xs text-slate-500">
                        {o.council}, {o.division} — {o.region}
                      </p>
                    </div>
                    {o.distanceKm != null && (
                      <span className="shrink-0 text-xs font-medium text-emerald-700">
                        {formatDistance(o.distanceKm)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {errors.pickupOfficeId && (
              <p className="mt-2 text-xs text-rose-600">{errors.pickupOfficeId.message}</p>
            )}
          </Card>
        </div>

        {/* Sidebar: map + submit */}
        <div className="space-y-6">
          <Card padded={false} className="overflow-hidden">
            <OfficeMap
              offices={offices}
              userPosition={geo.position}
              selectedOfficeId={pickupOfficeId}
              onSelect={(o) => setValue('pickupOfficeId', o.id)}
              height={320}
            />
          </Card>

          <Card>
            {selected ? (
              <>
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Collection point
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">{selected.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.address ?? `${selected.council}, ${selected.region}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a collection point to continue.</p>
            )}

            <Button type="submit" fullWidth className="mt-5" loading={isSubmitting}>
              Submit request
            </Button>
            <p className="mt-3 text-xs text-slate-500">
              You will receive a tracking reference. Processing typically takes 3–5 working days.
            </p>
          </Card>
        </div>
      </form>
    </>
  );
}
