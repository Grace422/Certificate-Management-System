"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Timeline, TimelineStep } from "@/components/Timeline";

interface RequestItem {
  id: string;
  requestType: string;
  status: string;
  recordFullName?: string;
  originCouncilName?: string;
  destinationCouncilName?: string;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
}

interface DeclarationItem {
  id: string;
  description: string;
  status: string;
  declaredAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

type TrackItem =
  | { kind: "request"; data: RequestItem }
  | { kind: "declaration"; data: DeclarationItem };

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function requestSteps(r: RequestItem): TimelineStep[] {
  if (r.status === "rejected") {
    return [
      { title: "Request submitted", subtitle: formatDate(r.requestedAt), state: "done" },
      { title: "Rejected", subtitle: r.rejectionReason ? `Reason: ${r.rejectionReason}` : formatDate(r.processedAt), state: "rejected" }
    ];
  }

  const stages: { key: string; title: string; date: string | null }[] = [
    { key: "pending", title: "Request submitted", date: r.requestedAt },
    { key: "in_transit", title: `Approved & routed to ${r.destinationCouncilName ?? "the nearest council"}`, date: r.processedAt },
    { key: "ready_for_pickup", title: `Ready for pickup at ${r.destinationCouncilName ?? "your council"}`, date: r.readyAt },
    { key: "completed", title: "Collected", date: r.completedAt }
  ];
  const order = ["pending", "in_transit", "ready_for_pickup", "completed"];
  const currentIndex = order.indexOf(r.status);

  return stages.map((stage, i) => {
    let state: TimelineStep["state"] = "upcoming";
    if (i < currentIndex || (i === currentIndex && stage.date)) state = "done";
    else if (i === currentIndex) state = "current";
    return { title: stage.title, subtitle: stage.date ? formatDate(stage.date) : (state === "current" ? "In progress" : undefined), state, isFinal: stage.key === "completed" };
  });
}

function declarationSteps(d: DeclarationItem): TimelineStep[] {
  const submitted: TimelineStep = { title: "Declaration submitted", subtitle: formatDate(d.declaredAt), state: "done" };
  if (d.status === "pending") {
    return [submitted, { title: "Under review", subtitle: "Awaiting registry review", state: "current" }];
  }
  if (d.status === "rejected") {
    return [submitted, { title: "Rejected", subtitle: d.reviewNotes || formatDate(d.reviewedAt), state: "rejected" }];
  }
  return [submitted, { title: "Verified", subtitle: d.reviewNotes || formatDate(d.reviewedAt), state: "done", isFinal: true }];
}

export default function TrackRequestsPage() {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<TrackItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [requests, declarations] = await Promise.all([
          authFetch<RequestItem[]>("/requests"),
          authFetch<DeclarationItem[]>("/loss-declarations")
        ]);
        const combined: TrackItem[] = [
          ...requests.map((r): TrackItem => ({ kind: "request", data: r })),
          ...declarations.map((d): TrackItem => ({ kind: "declaration", data: d }))
        ].sort((a, b) => {
          const dateA = a.kind === "request" ? a.data.requestedAt : a.data.declaredAt;
          const dateB = b.kind === "request" ? b.data.requestedAt : b.data.declaredAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setItems(combined);
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
      <p className="mt-1 text-muted">Click a request or report to see its progress.</p>

      {status === "loading" && (
        <Card withFlagBar={false} className="mt-6"><p className="text-muted">Loading…</p></Card>
      )}
      {status === "error" && (
        <Card withFlagBar={false} className="mt-6"><p className="text-danger">{message}</p></Card>
      )}
      {status === "done" && items.length === 0 && (
        <Card withFlagBar={false} className="mt-6"><p className="text-muted">Nothing yet - requests and reports you submit will show up here.</p></Card>
      )}

      {status === "done" && items.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((item) => {
            const isOpen = openId === item.data.id;
            const title = item.kind === "request"
              ? (item.data.recordFullName ?? "Certificate request")
              : "Lost certificate declaration";
            const subtitle = item.kind === "request"
              ? `Requested ${formatDate(item.data.requestedAt)}`
              : `Reported ${formatDate(item.data.declaredAt)}`;
            const Icon = item.kind === "request" ? FileText : AlertTriangle;

            return (
              <Card key={item.data.id} withFlagBar={false} className="!p-0 overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : item.data.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-bg"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-ink">{title}</p>
                      <p className="text-sm text-muted">{subtitle}</p>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border px-6 pt-5 pb-2">
                    <Timeline steps={item.kind === "request" ? requestSteps(item.data) : declarationSteps(item.data)} />
                    {item.kind === "request" && (item.data.status === "ready_for_pickup" || item.data.status === "completed") && (
                      <Link href={`/dashboard/certificate/${item.data.id}`} className="mb-4 inline-block text-sm font-medium text-primary hover:underline">
                        View certificate →
                      </Link>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
