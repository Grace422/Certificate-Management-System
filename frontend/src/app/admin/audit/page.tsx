"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";

interface AuditLogEntry {
  id: string;
  actor_email?: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

export default function AuditLogPage() {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch<AuditLogEntry[]>("/audit-logs");
        setLogs(data);
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    })();
  }, [authFetch]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
      <p className="mt-1 text-muted">Every state-changing action across the system, most recent first.</p>

      {status === "loading" && <Card withFlagBar={false} className="mt-6"><p className="text-muted">Loading…</p></Card>}
      {status === "error" && <Card withFlagBar={false} className="mt-6"><p className="text-danger">{message}</p></Card>}

      {status === "done" && (
        <Card withFlagBar={false} className="mt-6 overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No activity recorded yet.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink">{log.actor_email ?? "System"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{log.action}</td>
                  <td className="px-4 py-3 text-muted">{log.entity}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
