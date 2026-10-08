"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  rejectionReason: string | null;
  requestedAt: string;
}

interface DeclarationItem {
  id: string;
  description: string;
  status: string;
  declaredAt: string;
  reviewNotes: string | null;
  citizenName?: string;
  citizenEmail?: string;
}

type InboxItem =
  | { kind: "request"; date: string; data: RequestItem }
  | { kind: "declaration"; date: string; data: DeclarationItem };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-light text-ink",
  in_transit: "bg-primary-light text-primary-dark",
  ready_for_pickup: "bg-primary-light text-primary-dark",
  completed: "bg-primary text-white",
  verified: "bg-primary text-white",
  rejected: "bg-danger-light text-danger"
};

const TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "request", label: "Certificate requests" },
  { value: "declaration", label: "Loss declarations" }
];

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In transit" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "completed", label: "Completed" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" }
];

export default function AdminIncomingPage() {
  const { authFetch, user } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const isSuper = user?.role === "super_admin";

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      // Loss declarations are super_admin-only on the backend, so other
      // staff roles never request them (they'd just get a 403).
      const [requests, declarations] = await Promise.all([
        authFetch<RequestItem[]>("/requests"),
        isSuper ? authFetch<DeclarationItem[]>("/loss-declarations") : Promise.resolve([] as DeclarationItem[])
      ]);
      const combined: InboxItem[] = [
        ...requests.map((r): InboxItem => ({ kind: "request", date: r.requestedAt, data: r })),
        ...declarations.map((d): InboxItem => ({ kind: "declaration", date: d.declaredAt, data: d }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(combined);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }, [authFetch, isSuper]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => items.filter((i) => (typeFilter === "all" || i.kind === typeFilter) && (statusFilter === "all" || i.data.status === statusFilter)),
    [items, typeFilter, statusFilter]
  );

  async function act(kind: "requests" | "loss-declarations", id: string, action: string, body?: unknown) {
    setActingOn(id);
    setMessage(null);
    try {
      await authFetch(`/${kind}/${id}/${action}`, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
      setRejectingId(null);
      setReason("");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActingOn(null);
    }
  }

  const role = user?.role;
  const canApprove = (s: string) => s === "pending" && (role === "super_admin" || role === "origin_admin");
  const canHandle = (s: string) => (s === "in_transit" || s === "ready_for_pickup") && (role === "super_admin" || role === "destination_admin");

  function renderRejectForm(id: string, onConfirm: () => void) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (min. 3 characters)"
          rows={2}
          className="rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="flex gap-2">
          <Button variant="danger" disabled={reason.trim().length < 3} loading={actingOn === id} onClick={onConfirm}>Confirm rejection</Button>
          <Button variant="secondary" onClick={() => { setRejectingId(null); setReason(""); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">Incoming requests</h1>
      <p className="mt-1 text-muted">Certificate requests and loss declarations from citizens, in one place.</p>

      <div className="mt-4 flex gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {message && <p className="mt-4 rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">{message}</p>}
      {status === "loading" && <Card withFlagBar={false} className="mt-6"><p className="text-muted">Loading…</p></Card>}
      {status === "done" && visible.length === 0 && (
        <Card withFlagBar={false} className="mt-6"><p className="text-muted">Nothing matches these filters.</p></Card>
      )}

      {status === "done" && visible.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {visible.map((item) => {
            const id = item.data.id;
            return (
              <Card key={`${item.kind}-${id}`} withFlagBar={false}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${item.kind === "request" ? "bg-primary-light text-primary-dark" : "bg-gold-light text-ink"}`}>
                      {item.kind === "request" ? "Certificate request" : "Loss declaration"}
                    </span>

                    {item.kind === "request" ? (
                      <>
                        <p className="mt-2 font-semibold text-ink">{item.data.recordFullName ?? "Certificate request"}</p>
                        <p className="mt-1 text-sm text-muted">
                          {item.data.originCouncilName}
                          {item.data.destinationCouncilName ? ` → ${item.data.destinationCouncilName}` : ""}
                        </p>
                        {item.data.rejectionReason && <p className="mt-1 text-sm text-danger">Reason: {item.data.rejectionReason}</p>}
                      </>
                    ) : (
                      <>
                        <p className="mt-2 font-semibold text-ink">{item.data.citizenName ?? "Citizen"}</p>
                        <p className="text-sm text-muted">{item.data.citizenEmail}</p>
                        <p className="mt-2 text-sm text-ink">{item.data.description}</p>
                        {item.data.reviewNotes && <p className="mt-1 text-sm text-muted">Reviewer notes: {item.data.reviewNotes}</p>}
                      </>
                    )}
                    <p className="mt-1 text-xs text-muted">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.data.status] ?? "bg-bg text-muted"}`}>
                    {item.data.status.replace(/_/g, " ")}
                  </span>
                </div>

                {item.kind === "request" && canApprove(item.data.status) && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => act("requests", id, "approve")} loading={actingOn === id}>Approve & route</Button>
                    <Button variant="secondary" onClick={() => setRejectingId(rejectingId === id ? null : id)}>Reject</Button>
                  </div>
                )}
                {item.kind === "request" && canHandle(item.data.status) && (
                  <div className="mt-4">
                    {item.data.status === "in_transit" ? (
                      <Button onClick={() => act("requests", id, "ready")} loading={actingOn === id}>Mark ready for pickup</Button>
                    ) : (
                      <Button onClick={() => act("requests", id, "complete")} loading={actingOn === id}>Confirm handover / complete</Button>
                    )}
                  </div>
                )}
                {item.kind === "request" && rejectingId === id && (
                  renderRejectForm(id, () => act("requests", id, "reject", { reason }))
                )}

                {item.kind === "declaration" && isSuper && item.data.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => act("loss-declarations", id, "verify")} loading={actingOn === id}>Verify</Button>
                    <Button variant="secondary" onClick={() => setRejectingId(rejectingId === id ? null : id)}>Reject</Button>
                  </div>
                )}
                {item.kind === "declaration" && rejectingId === id && (
                  renderRejectForm(id, () => act("loss-declarations", id, "reject", { notes: reason }))
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
