"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface BulkUploadResult {
  insertedCount: number;
  errors: { row: number; message: string }[];
}

function UploadCard({
  title, description, endpoint, columnsHint, onUploaded
}: {
  title: string;
  description: string;
  endpoint: string;
  columnsHint: string;
  onUploaded?: () => void;
}) {
  const { authFetch } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("loading");
    setMessage(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await authFetch<BulkUploadResult>(endpoint, { method: "POST", body: formData });
      setResult(data);
      setStatus("done");
      onUploaded?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Upload failed.");
    }
  }

  return (
    <Card withFlagBar={false}>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <p className="mt-2 rounded-sm bg-bg px-3 py-2 font-mono text-xs text-muted">{columnsHint}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-dark hover:file:bg-primary/20"
        />
        <Button type="submit" disabled={!file} loading={status === "loading"} className="w-fit">
          Upload
        </Button>
      </form>

      {status === "error" && <p className="mt-3 rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">{message}</p>}

      {result && (
        <div className="mt-4 rounded-sm bg-bg px-3 py-3 text-sm">
          <p className="font-medium text-ink">Imported {result.insertedCount} row(s).</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-danger">Row {e.row}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}


interface RecordRow {
  id: string;
  recordType: string;
  fullName: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  registrationNumber: string | null;
  registeredCouncilName?: string;
}

function UploadedRecordsTable({ refreshKey }: { refreshKey: number }) {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await authFetch<RecordRow[]>("/records/all");
      setRecords(data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Could not load records.");
    }
  }, [authFetch]);

  // refreshKey changes after each successful upload so the table updates itself.
  useEffect(() => { load(); }, [load, refreshKey]);

  const shown = records.filter((r) => r.fullName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Card withFlagBar={false}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ink">Records in the database</h2>
          <p className="mt-1 text-sm text-muted">Most recent {records.length} civil records. This is what citizens are matched against.</p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          className="w-44 rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {status === "loading" && <p className="mt-4 text-sm text-muted">Loading…</p>}
      {status === "error" && <p className="mt-4 text-sm text-danger">{message}</p>}
      {status === "done" && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Born</th>
                <th className="py-2 pr-4">Place</th>
                <th className="py-2 pr-4">Council</th>
                <th className="py-2">Reg. no.</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No records yet - upload a CSV above.</td></tr>
              )}
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium text-ink">{r.fullName}</td>
                  <td className="py-2 pr-4 capitalize text-muted">{r.recordType}</td>
                  <td className="py-2 pr-4 text-muted">{r.dateOfBirth ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">{r.placeOfBirth ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">{r.registeredCouncilName ?? "—"}</td>
                  <td className="py-2 font-mono text-xs text-muted">{r.registrationNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function BulkUploadPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Bulk upload</h1>
      <p className="mt-1 text-muted">
        Import data migrated from paper archives. Bad rows are reported individually - the rest of the file still imports.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <UploadCard
          title="Civil records"
          description="Birth, death, and marriage records digitized from municipal archives."
          endpoint="/records/bulk-upload"
          onUploaded={() => setRefreshKey((k) => k + 1)}
          columnsHint="record_type, council_name, region, department, arrondissement, centre_etat_civil, registration_number, child_surname, child_given_names, sex, date_of_birth, place_of_birth, father_*, mother_*, declarant, registrar_name, secretary_name, date_drawn_up"
        />
        <UploadCard
          title="Municipal councils"
          description="The council/courthouse location dataset used for nearest-office routing."
          endpoint="/councils/bulk-upload"
          columnsHint="name, region, division, latitude, longitude, address, contact_phone"
        />
        <UploadedRecordsTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
