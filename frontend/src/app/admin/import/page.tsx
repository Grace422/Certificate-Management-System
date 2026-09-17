'use client';

import { useState } from 'react';
import { Database, MapPin, UploadCloud } from 'lucide-react';
import { Button, Card, CardHeader, PageHeader } from '@/components/ui';
import { FileDrop } from '@/components/ui/FileDrop';
import { adminService } from '@/lib/api/admin.service';
import { officesService } from '@/lib/api/offices.service';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import type { ImportResult } from '@/lib/types';

/** Reusable upload panel — used for both archive records and office data. */
function ImportPanel({
  title,
  description,
  columns,
  onUpload,
}: {
  title: string;
  description: string;
  columns: string;
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<ImportResult>;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await onUpload(file, setProgress);
      setResult(res);
      toast.success(`${res.inserted} row${res.inserted === 1 ? '' : 's'} imported.`);
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={title} description={description} />

      <div className="mb-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-medium text-slate-600">Required columns</p>
        <code className="mt-1 block font-mono text-xs break-all text-slate-700">{columns}</code>
      </div>

      <FileDrop accept=".csv,.xlsx" maxSizeMb={50} onFiles={(f) => setFile(f[0] ?? null)} />

      {busy && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Uploading… {progress}%</p>
        </div>
      )}

      <Button
        className="mt-4"
        fullWidth
        onClick={upload}
        loading={busy}
        disabled={!file}
        leftIcon={<UploadCloud className="size-4" />}
      >
        Import file
      </Button>

      {result && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold text-emerald-700">{result.inserted}</p>
              <p className="text-xs text-slate-500">Inserted</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-700">{result.updated}</p>
              <p className="text-xs text-slate-500">Updated</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-slate-500">Skipped</p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-rose-50 p-3">
              <p className="mb-1 text-xs font-medium text-rose-800">
                {result.errors.length} row error(s)
              </p>
              <ul className="space-y-0.5 text-xs text-rose-700">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Data import"
        description="Bulk-load the civil status archive and the national list of municipal buildings."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ImportPanel
          title="Civil status archive"
          description="Digitised birth, death and marriage records."
          columns="certificateNumber, type, firstName, lastName, dateOfBirth, placeOfBirth, fatherName, motherName, registrationDate, issuingOfficeCode"
          onUpload={(f, p) => adminService.importRecords(f, p)}
        />

        <ImportPanel
          title="Municipal buildings"
          description="Councils and their GPS coordinates, used for routing and the map."
          columns="name, region, division, council, address, phone, email, latitude, longitude"
          onUpload={(f, p) => officesService.importCsv(f, p) as Promise<ImportResult>}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600">
            Imports are idempotent: a row whose <code className="text-xs">certificateNumber</code>{' '}
            already exists is updated, never duplicated.
          </p>
        </Card>
        <Card className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <p className="text-sm text-slate-600">
            Coordinates must be decimal degrees inside Cameroon (lat 1.6–13.1, lng 8.4–16.2). Rows
            outside that box are rejected.
          </p>
        </Card>
      </div>
    </>
  );
}
