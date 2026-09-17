"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";

export default function AdminPage() {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "not_available" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await authFetch("/users");
        setStatus("done");
      } catch (err) {
        if (err instanceof ApiError && err.status === 501) {
          setStatus("not_available");
          setMessage("This isn't live yet - the module is still being built.");
        } else if (err instanceof ApiError && err.status === 403) {
          setStatus("error");
          setMessage("You don't have permission to view this.");
        } else {
          setStatus("error");
          setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
        }
      }
    })();
  }, [authFetch]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Bulk upload records</h1>
      <Card withFlagBar={false} className="mt-6">
        {status === "loading" && <p className="text-muted">Loading…</p>}
        {(status === "not_available" || status === "error") && (
          <p className={status === "not_available" ? "text-ink" : "text-danger"}>{message}</p>
        )}
        {status === "done" && <p className="text-muted">Nothing to show yet.</p>}
      </Card>
    </div>
  );
}
