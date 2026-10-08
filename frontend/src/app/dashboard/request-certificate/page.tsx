"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
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

  const [checkStatus, setCheckStatus] = useState<"loading" | "found" | "not_found" | "error">("loading");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [results, setResults] = useState<CivilRecordResult[]>([]);

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<Record<string, { status: "success" | "error"; message: string }>>({});

  // Checks whether a civil record matching the CURRENT citizen's own
  // profile (name, and DOB/place of birth if they gave those at
  // registration) exists - this is the "does this user exist in our
  // records" check, run automatically rather than via free-text search,
  // so a citizen can only ever find/request their own record.
  useEffect(() => {
    (async () => {
      setCheckStatus("loading");
      try {
        const data = await authFetch<CivilRecordResult[]>("/records/me");
        setResults(data);
        setCheckStatus(data.length > 0 ? "found" : "not_found");
      } catch (err) {
        setCheckStatus("error");
        setCheckError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    })();
  }, [authFetch]);

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
      if ((err as any)?.code !== undefined) {
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
      <p className="mt-1 text-muted">We check your account against our civil records and let you request a copy if you&apos;re on file.</p>

      {checkStatus === "loading" && (
        <Card withFlagBar={false} className="mt-6">
          <p className="text-muted">Checking our records…</p>
        </Card>
      )}

      {checkStatus === "error" && (
        <Card withFlagBar={false} className="mt-6">
          <p className="text-danger">{checkError}</p>
        </Card>
      )}

      {checkStatus === "not_found" && (
        <Card withFlagBar={false} className="mt-6">
          <p className="font-medium text-ink">This user does not exist in our civil records.</p>
          <p className="mt-2 text-sm text-muted">
            We couldn&apos;t find a record matching your name{"/"}date of birth. This can happen if your record hasn&apos;t
            been digitized yet, or if the details on your account don&apos;t match what&apos;s on file. If you believe
            this is an error, try reporting it as a lost certificate, or contact your local registry.
          </p>
        </Card>
      )}

      {checkStatus === "found" && (
        <div className="mt-6 flex flex-col gap-4">
          {results.map((record) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
