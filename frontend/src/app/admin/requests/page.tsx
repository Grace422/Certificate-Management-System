"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface RequestItem {
  id: string;
  requestType: string;
  status: string;
  recordFullName?: string;
  originCouncilName?: string;
  destinationCouncilName?: string;
  requestedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-light text-ink",
  in_transit: "bg-primary-light text-primary-dark",
  ready_for_pickup: "bg-primary-light text-primary-dark",
  completed: "bg-primary text-white",
  rejected: "bg-danger-light text-danger"
};

export default function AdminRequestsPage() {
  const { authFetch, user } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await authFetch<RequestItem[]>("/requests");
      setItems(data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }, [authFetch]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "ready" | "complete", body?: unknown) {
    setActingOn(id);
    try {
      await authFetch(`/requests/${id}/${action}`, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
      setRejectingId(null);
      setReason("");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActingOn(null);
    }
  }

  const heading = user?.role === "origin_admin"
    ? "Incoming requests"
    : user?.role === "destination_admin"
    ? "Requests routed to your council"
    : "All requests";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">{heading}</h1>
      <p className="mt-1 text-muted">
        {user?.role === "origin_admin" && "Review and approve certificate requests for records registered at your council."}
        {user?.role === "destination_admin" && "Prepare certificates routed here for pickup."}
        {user?.role === "super_admin" && "System-wide view - no actions available from this account."}
      </p>

      {status === "loading" && <Card withFlagBar={false} className="mt-6"><p className="text-muted">Loading…</p></Card>}
      {status === "error" && <Card withFlagBar={false} className="mt-6"><p className="text-danger">{message}</p></Card>}
      {status === "done" && items.length === 0 && (
        <Card withFlagBar={false} className="mt-6"><p className="text-muted">Nothing here right now.</p></Card>
      )}

      {status === "done" && items.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {items.map((r) => (
            <Card key={r.id} withFlagBar={false}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{r.recordFullName ?? "Certificate request"}</p>
                  <p className="mt-1 text-sm text-muted">
                    {r.originCouncilName}
                    {r.destinationCouncilName ? ` → ${r.destinationCouncilName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">Requested {new Date(r.requestedAt).toLocaleDateString()}</p>
                </div>
                <span className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ${STATUS_STYLE[r.status] ?? "bg-bg text-muted"}`}>
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>

              {user?.role === "origin_admin" && r.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => act(r.id, "approve")} loading={actingOn === r.id}>Approve & route</Button>
                  <Button variant="secondary" onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}>Reject</Button>
                </div>
              )}

              {rejectingId === r.id && (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rejection (min. 3 characters)"
                    rows={2}
                    className="rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" disabled={reason.trim().length < 3} loading={actingOn === r.id} onClick={() => act(r.id, "reject", { reason })}>
                      Confirm rejection
                    </Button>
                    <Button variant="secondary" onClick={() => { setRejectingId(null); setReason(""); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {user?.role === "destination_admin" && r.status === "in_transit" && (
                <div className="mt-4">
                  <Button onClick={() => act(r.id, "ready")} loading={actingOn === r.id}>Mark ready for pickup</Button>
                </div>
              )}
              {user?.role === "destination_admin" && r.status === "ready_for_pickup" && (
                <div className="mt-4">
                  <Button onClick={() => act(r.id, "complete")} loading={actingOn === r.id}>Confirm handover / complete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
