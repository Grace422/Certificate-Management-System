'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Search, Send, XCircle } from 'lucide-react';
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
import { Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { adminService } from '@/lib/api/admin.service';
import { officesService } from '@/lib/api/offices.service';
import { useApi } from '@/hooks/useApi';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import { formatDistance, haversineKm } from '@/lib/geo';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { CertificateRecord, CertificateRequest, MunicipalOffice } from '@/lib/types';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function AdminRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();

  const [matches, setMatches] = useState<CertificateRecord[] | null>(null);
  /** null = "follow the server value"; a string = agent picked another office. */
  const [pickupOverride, setPickupOverride] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const {
    data: req,
    loading,
    error,
    mutate,
  } = useApi(['admin:request', id] as const, () => adminService.requestById(id));

  // Collection points, ranked by proximity to where the citizen filed.
  // Key depends on the request, so it only runs once the request has loaded.
  const { data: officesData } = useApi(
    req ? (['admin:req-offices', req.requesterLatitude, req.requesterLongitude] as const) : null,
    () =>
      req?.requesterLatitude != null && req?.requesterLongitude != null
        ? officesService.nearest(req.requesterLatitude, req.requesterLongitude, 10)
        : officesService.list(),
  );
  const offices: MunicipalOffice[] = useMemo(() => officesData ?? [], [officesData]);

  // Derived, never synced through an effect.
  const pickupId = pickupOverride ?? req?.pickupOfficeId ?? '';
  const setPickupId = (value: string) => setPickupOverride(value);

  const runMatch = async () => {
    setBusy(true);
    try {
      setMatches(await adminService.matchRecords(id));
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  /** Runs a mutation, then writes the returned request into the SWR cache. */
  const runAction = async (
    action: () => Promise<CertificateRequest>,
    successMessage: string,
    after?: () => void,
  ) => {
    setBusy(true);
    try {
      const updated = await action();
      await mutate(updated, { revalidate: false });
      toast.success(successMessage);
      after?.();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const approve = (recordId?: string) =>
    runAction(
      () => adminService.updateStatus(id, 'APPROVED', note || undefined, recordId),
      'Request approved.',
      () => setNote(''),
    );

  const dispatch = () => {
    if (!pickupId) return;
    return runAction(
      () => adminService.dispatchToOffice(id, pickupId, note || undefined),
      'Document dispatched to the collection point.',
      () => setNote(''),
    );
  };

  const reject = () =>
    runAction(
      () => adminService.updateStatus(id, 'REJECTED', rejectReason),
      'Request rejected and the citizen notified.',
      () => setRejectOpen(false),
    );

  if (loading) return <LoadingBlock label="Loading request…" />;
  if (error || !req) return <ErrorBanner message={error ?? 'Request not found.'} />;

  const userPos =
    req.requesterLatitude != null && req.requesterLongitude != null
      ? { latitude: req.requesterLatitude, longitude: req.requesterLongitude }
      : null;
  const selectedOffice = offices.find((o) => o.id === pickupId);

  return (
    <>
      <Link
        href="/admin/requests"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Back to queue
      </Link>

      <PageHeader
        title={`${req.firstName} ${req.lastName}`}
        description={`${req.reference} · ${req.certificateType.toLowerCase()} certificate · ${
          req.requestType === 'COPY' ? 'copy request' : 'loss declaration'
        }`}
        action={<StatusBadge status={req.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Archive matching */}
          <Card>
            <CardHeader
              title="Archive search"
              description="Match the request against the national civil status archive."
              action={
                <Button size="sm" onClick={runMatch} loading={busy} leftIcon={<Search className="size-4" />}>
                  Run match
                </Button>
              }
            />

            {matches === null ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Run the match to search records by name, date and place of birth.
              </p>
            ) : matches.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                No record matched. Verify the spelling with the applicant, or reject with a reason.
              </div>
            ) : (
              <ul className="space-y-2">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {m.firstName} {m.lastName}
                        <span className="ml-2 font-mono text-xs text-slate-400">
                          {m.certificateNumber}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Born {formatDate(m.dateOfBirth)} in {m.placeOfBirth}
                        {m.issuingOffice && ` · registered at ${m.issuingOffice.name}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approve(m.id)}
                      loading={busy}
                      leftIcon={<CheckCircle2 className="size-4" />}
                    >
                      Approve with this record
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Applicant data */}
          <Card>
            <CardHeader title="Submitted details" />
            <dl className="divide-y divide-slate-100">
              <Row label="Applicant account" value={req.user?.email} />
              <Row label="Phone" value={req.user?.phone} />
              <Row label="Date of birth" value={formatDate(req.dateOfBirth)} />
              <Row label="Place of birth" value={req.placeOfBirth} />
              <Row label="Father's name" value={req.fatherName} />
              <Row label="Mother's name" value={req.motherName} />
              <Row label="Certificate number" value={req.certificateNumber} />
              <Row label="Copies requested" value={String(req.copies)} />
              <Row label="Stated reason" value={req.reason} />
              <Row label="Filed" value={formatDateTime(req.createdAt)} />
            </dl>
          </Card>

          <Card>
            <CardHeader title="History" />
            <Timeline status={req.status} events={req.timeline} />
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card padded={false} className="overflow-hidden">
            <OfficeMap
              offices={selectedOffice ? [selectedOffice] : offices.slice(0, 5)}
              userPosition={userPos}
              selectedOfficeId={pickupId}
              onSelect={(o) => setPickupId(o.id)}
              height={240}
            />
          </Card>

          <Card>
            <CardHeader title="Dispatch" description="Send the document to a collection point." />

            <Select
              label="Collection point"
              placeholder="Select an office"
              value={pickupId}
              onChange={(e) => setPickupId(e.target.value)}
              options={offices.map((o) => ({
                value: o.id,
                label:
                  o.distanceKm != null
                    ? `${o.name} — ${formatDistance(o.distanceKm)}`
                    : `${o.name} (${o.region})`,
              }))}
              hint={
                userPos
                  ? 'Sorted by distance from where the citizen filed.'
                  : 'The citizen did not share a location — choose manually.'
              }
            />

            {selectedOffice && userPos && (
              <p className="mt-2 text-xs text-emerald-700">
                {formatDistance(haversineKm(userPos, selectedOffice))} from the applicant.
              </p>
            )}

            <div className="mt-4">
              <Textarea
                label="Internal note"
                placeholder="Optional note recorded in the audit trail"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Button
                fullWidth
                onClick={dispatch}
                loading={busy}
                disabled={!pickupId || req.status === 'REJECTED'}
                leftIcon={<Send className="size-4" />}
              >
                Dispatch to office
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => approve()}
                loading={busy}
                disabled={req.status !== 'PENDING' && req.status !== 'UNDER_REVIEW'}
              >
                Approve without match
              </Button>
              <Button
                fullWidth
                variant="danger"
                onClick={() => setRejectOpen(true)}
                disabled={req.status === 'REJECTED'}
                leftIcon={<XCircle className="size-4" />}
              >
                Reject request
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this request"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reject} loading={busy} disabled={rejectReason.length < 10}>
              Confirm rejection
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason shown to the citizen"
          required
          placeholder="e.g. No matching record found for the names and date supplied. Please confirm the spelling on an older document."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          hint="At least 10 characters. This is recorded in the audit trail."
        />
      </Modal>
    </>
  );
}
