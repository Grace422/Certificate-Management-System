"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface BulkUploadResult {
  insertedCount: number;
  errors: { row: number; message: string }[];
}

function UploadCard({
  title, description, endpoint, columnsHint
}: {
  title: string;
  description: string;
  endpoint: string;
  columnsHint: string;
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

export default function BulkUploadPage() {
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
          columnsHint="record_type, council_name, region, department, arrondissement, centre_etat_civil, registration_number, child_surname, child_given_names, sex, date_of_birth, place_of_birth, father_*, mother_*, declarant, registrar_name, secretary_name, date_drawn_up"
        />
        <UploadCard
          title="Municipal councils"
          description="The council/courthouse location dataset used for nearest-office routing."
          endpoint="/councils/bulk-upload"
          columnsHint="name, region, division, latitude, longitude, address, contact_phone"
        />
      </div>
    </div>
  );
}
