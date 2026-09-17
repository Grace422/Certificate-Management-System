'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Navigation, Phone } from 'lucide-react';
import OfficeMap from '@/components/map/OfficeMap';
import { Timeline } from '@/components/requests/Timeline';
import {
  Button,
  Card,
  CardHeader,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '@/components/ui';
import { requestsService } from '@/lib/api/requests.service';
import { useApi } from '@/hooks/useApi';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import { directionsUrl, formatDistance, haversineKm } from '@/lib/geo';
import { downloadBlob, formatDate, formatDateTime } from '@/lib/utils';

/** Small definition-list row. */
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // Next 15+: params is a promise
  const toast = useToast();

  const [downloading, setDownloading] = useState(false);

  const { data: req, loading, error } = useApi(['request', id] as const, () =>
    requestsService.byId(id),
  );

  const download = async () => {
    if (!req) return;
    setDownloading(true);
    try {
      const blob = await requestsService.downloadDocument(req.id);
      downloadBlob(blob, `${req.reference}.pdf`);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading request…" />;
  if (error || !req) return <ErrorBanner message={error ?? 'Request not found.'} />;

  const userPos =
    req.requesterLatitude != null && req.requesterLongitude != null
      ? { latitude: req.requesterLatitude, longitude: req.requesterLongitude }
      : null;

  const pickup = req.pickupOffice ?? null;
  const distance = pickup && userPos ? haversineKm(userPos, pickup) : undefined;
  const canDownload = ['READY', 'COLLECTED', 'DISPATCHED'].includes(req.status);

  return (
    <>
      <Link
        href="/requests"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Back to requests
      </Link>

      <PageHeader
        title={req.reference}
        description={`${req.certificateType.toLowerCase()} certificate · filed ${formatDate(req.createdAt)}`}
        action={<StatusBadge status={req.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Progress" description="Live status of your request." />
            <Timeline status={req.status} events={req.timeline} />

            {req.status === 'REJECTED' && req.rejectionReason && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-medium tracking-wide text-rose-700 uppercase">
                  Reason for rejection
                </p>
                <p className="mt-1 text-sm text-rose-900">{req.rejectionReason}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Request details" />
            <dl className="divide-y divide-slate-100">
              <Row label="Request type" value={req.requestType === 'COPY' ? 'Copy' : 'Loss declaration'} />
              <Row label="Full name" value={`${req.firstName} ${req.lastName}`} />
              <Row label="Date of birth" value={formatDate(req.dateOfBirth)} />
              <Row label="Place of birth" value={req.placeOfBirth} />
              <Row label="Father's name" value={req.fatherName} />
              <Row label="Mother's name" value={req.motherName} />
              <Row label="Certificate number" value={req.certificateNumber} />
              <Row label="Copies" value={String(req.copies)} />
              <Row label="Registered at" value={req.originOffice?.name} />
              <Row label="Last updated" value={formatDateTime(req.updatedAt)} />
            </dl>
          </Card>
        </div>

        {/* Collection point + directions */}
        <div className="space-y-6">
          <Card padded={false} className="overflow-hidden">
            {pickup ? (
              <OfficeMap
                offices={[{ ...pickup, distanceKm: distance }]}
                userPosition={userPos}
                selectedOfficeId={pickup.id}
                height={260}
              />
            ) : (
              <div className="grid h-[260px] place-items-center bg-slate-50 px-6 text-center text-sm text-slate-500">
                A collection point will appear here once your request is processed.
              </div>
            )}
          </Card>

          {pickup && (
            <Card>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Collection point
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{pickup.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {pickup.address ?? `${pickup.council}, ${pickup.division}`}
              </p>
              <p className="text-sm text-slate-500">{pickup.region} Region</p>

              {distance != null && (
                <p className="mt-2 text-sm font-medium text-emerald-700">
                  {formatDistance(distance)} from where you filed
                </p>
              )}

              {pickup.phone && (
                <a
                  href={`tel:${pickup.phone}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
                >
                  <Phone className="size-4" />
                  {pickup.phone}
                </a>
              )}

              <a href={directionsUrl(pickup, userPos)} target="_blank" rel="noopener noreferrer">
                <Button fullWidth className="mt-4" leftIcon={<Navigation className="size-4" />}>
                  Get directions
                </Button>
              </a>

              {canDownload && (
                <Button
                  fullWidth
                  variant="outline"
                  className="mt-2"
                  loading={downloading}
                  onClick={download}
                  leftIcon={<Download className="size-4" />}
                >
                  Download receipt
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
