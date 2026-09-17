"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

interface CivilRecordResult {
  id: string;
  recordType: string;
  fullName: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  registeredCouncilName?: string;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser does not support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  });
}

export default function RequestCertificatePage() {
  const { authFetch } = useAuth();

  const [search, setSearch] = useState({ fullName: "", dateOfBirth: "", placeOfBirth: "" });
  const [results, setResults] = useState<CivilRecordResult[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<Record<string, { status: "success" | "error"; message: string }>>({});

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchStatus("loading");
    setSearchError(null);
    setResults(null);
    try {
      const params = new URLSearchParams(
        Object.entries(search).filter(([, v]) => v.trim() !== "")
      ).toString();
      const data = await authFetch<CivilRecordResult[]>(`/records?${params}`);
      setResults(data);
      setSearchStatus("idle");
    } catch (err) {
      setSearchStatus("error");
      setSearchError(err instanceof ApiError ? err.message : "Something went wrong while searching.");
    }
  }

  async function handleRequest(record: CivilRecordResult) {
    setSubmitting(record.id);
    setSubmitResult((prev) => ({ ...prev, [record.id]: undefined as any }));
    try {
      const position = await getCurrentPosition();
      await authFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          civilRecordId: record.id,
          requestType: "copy",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      });
      setSubmitResult((prev) => ({
        ...prev,
        [record.id]: { status: "success", message: "Request submitted. You can track its status from \"Track my requests\"." }
      }));
    } catch (err) {
      let message = "Something went wrong. Please try again.";
      if (err instanceof GeolocationPositionError || (err as any)?.code !== undefined) {
        const geoErr = err as GeolocationPositionError;
        message = geoErr.code === 1
          ? "Location access was denied. Please allow location access in your browser and try again - it's required to route your certificate to the council nearest you."
          : "Could not determine your location. Please check your device's location settings and try again.";
      } else if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setSubmitResult((prev) => ({ ...prev, [record.id]: { status: "error", message } }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Request a certificate</h1>
      <p className="mt-1 text-muted">Search for your civil record, then request a copy - we'll route it to the municipal office nearest you.</p>

      <Card withFlagBar={false} className="mt-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <Input
            label="Full name (as on the certificate)"
            name="fullName"
            value={search.fullName}
            onChange={(e) => setSearch({ ...search, fullName: e.target.value })}
          />
          <Input
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            value={search.dateOfBirth}
            onChange={(e) => setSearch({ ...search, dateOfBirth: e.target.value })}
          />
          <Input
            label="Place of birth"
            name="placeOfBirth"
            value={search.placeOfBirth}
            onChange={(e) => setSearch({ ...search, placeOfBirth: e.target.value })}
          />
          <p className="text-xs text-muted">Fill in at least one field.</p>

          {searchError && <p className="rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">{searchError}</p>}

          <Button type="submit" loading={searchStatus === "loading"} className="w-full">
            Search record
          </Button>
        </form>
      </Card>

      {results !== null && (
        <div className="mt-6 flex flex-col gap-4">
          {results.length === 0 ? (
            <Card withFlagBar={false}>
              <p className="text-muted">No matching record found. Double-check the spelling, or try fewer fields.</p>
            </Card>
          ) : (
            results.map((record) => (
              <Card key={record.id} withFlagBar={false}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{record.fullName}</p>
                    <p className="mt-1 text-sm text-muted capitalize">{record.recordType} certificate</p>
                    {record.dateOfBirth && <p className="text-sm text-muted">Born {record.dateOfBirth}{record.placeOfBirth ? `, ${record.placeOfBirth}` : ""}</p>}
                    {record.registeredCouncilName && <p className="text-sm text-muted">Registered at {record.registeredCouncilName}</p>}
                  </div>
                  <Button
                    onClick={() => handleRequest(record)}
                    loading={submitting === record.id}
                    disabled={submitResult[record.id]?.status === "success"}
                  >
                    {submitResult[record.id]?.status === "success" ? "Requested" : "Request this certificate"}
                  </Button>
                </div>
                {submitResult[record.id] && (
                  <p className={`mt-3 rounded-sm px-3 py-2 text-sm ${submitResult[record.id].status === "success" ? "bg-primary-light text-primary-dark" : "bg-danger-light text-danger"}`}>
                    {submitResult[record.id].message}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}