"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";

interface RequestItem {
  id: string;
  requestType: string;
  status: string;
  recordFullName?: string;
  originCouncilName?: string;
  destinationCouncilName?: string;
  rejectionReason: string | null;
  requestedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  in_transit: "On its way to your council",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed"
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-light text-ink",
  approved: "bg-primary-light text-primary-dark",
  rejected: "bg-danger-light text-danger",
  in_transit: "bg-primary-light text-primary-dark",
  ready_for_pickup: "bg-primary-light text-primary-dark",
  completed: "bg-primary text-white"
};

export default function TrackRequestsPage() {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch<RequestItem[]>("/requests");
        setRequests(data);
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    })();
  }, [authFetch]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">My requests</h1>
      <p className="mt-1 text-muted">Track the status of certificates you&apos;ve requested.</p>

      {status === "loading" && (
        <Card withFlagBar={false} className="mt-6">
          <p className="text-muted">Loading…</p>
        </Card>
      )}

      {status === "error" && (
        <Card withFlagBar={false} className="mt-6">
          <p className="text-danger">{message}</p>
        </Card>
      )}

      {status === "done" && requests.length === 0 && (
        <Card withFlagBar={false} className="mt-6">
          <p className="text-muted">No requests yet.</p>
        </Card>
      )}

      {status === "done" && requests.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {requests.map((r) => (
            <Card key={r.id} withFlagBar={false}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{r.recordFullName ?? "Certificate request"}</p>
                  <p className="mt-1 text-sm text-muted">
                    From {r.originCouncilName}
                    {r.destinationCouncilName ? ` → routed to ${r.destinationCouncilName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">Requested {new Date(r.requestedAt).toLocaleDateString()}</p>
                  {r.status === "rejected" && r.rejectionReason && (
                    <p className="mt-2 text-sm text-danger">Reason: {r.rejectionReason}</p>
                  )}
                </div>
                <span className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ${STATUS_STYLE[r.status] ?? "bg-bg text-muted"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}