"use client";

import { useCallback, useEffect, useState, Fragment, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PublicUser } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  citizen: "Citizen",
  origin_admin: "Origin admin",
  destination_admin: "Destination admin",
  super_admin: "Super admin"
};

const ROLE_STYLE: Record<string, string> = {
  citizen: "bg-bg text-ink",
  origin_admin: "bg-primary-light text-primary-dark",
  destination_admin: "bg-primary-light text-primary-dark",
  super_admin: "bg-gold-light text-ink"
};

interface Council {
  id: string;
  name: string;
  region: string;
}

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const { authFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [councils, setCouncils] = useState<Council[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    role: "origin_admin" as "origin_admin" | "destination_admin" | "super_admin",
    councilId: ""
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Councils are only needed once the form is actually opened.
  useEffect(() => {
    if (open && councils.length === 0) {
      authFetch<Council[]>("/councils").then(setCouncils).catch(() => {});
    }
  }, [open, councils.length, authFetch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await authFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          councilId: form.role === "super_admin" ? undefined : form.councilId
        })
      });
      setStatus("done");
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "origin_admin", councilId: "" });
      onCreated();
      setTimeout(() => { setOpen(false); setStatus("idle"); }, 1500);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add staff account</Button>;
  }

  return (
    <Card withFlagBar={false} className="max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-ink">New staff account</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input
          label="Temporary password"
          type="text"
          required
          minLength={10}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <p className="-mt-2 text-xs text-muted">
          At least 10 characters, with uppercase, lowercase, a digit, and a special character.
          They&apos;ll complete MFA setup themselves on first login.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
            className="rounded-sm border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="origin_admin">Origin admin (approves requests for their council)</option>
            <option value="destination_admin">Destination admin (hands over certificates at their council)</option>
            <option value="super_admin">Super admin (system-wide)</option>
          </select>
        </label>

        {form.role !== "super_admin" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Council they manage</span>
            <select
              required
              value={form.councilId}
              onChange={(e) => setForm({ ...form, councilId: e.target.value })}
              className="rounded-sm border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Select a council…</option>
              {councils.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
              ))}
            </select>
          </label>
        )}

        {status === "error" && <p className="rounded-sm bg-danger-light px-3 py-2 text-sm text-danger">{message}</p>}
        {status === "done" && <p className="rounded-sm bg-primary-light px-3 py-2 text-sm text-primary-dark">Account created.</p>}

        <Button type="submit" loading={status === "loading"} className="w-full">Create account</Button>
      </form>
    </Card>
  );
}

export default function ManageUsersPage() {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (search) params.set("search", search);
      const data = await authFetch<PublicUser[]>(`/users?${params.toString()}`);
      setUsers(data);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }, [authFetch, roleFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Manage users</h1>
          <p className="mt-1 text-muted">Everyone registered in the system - citizens and staff.</p>
        </div>
      </div>

      <div className="mt-4">
        <CreateStaffForm onCreated={load} />
      </div>

      <div className="mt-6 flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="w-64 rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-sm border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="citizen">Citizen</option>
          <option value="origin_admin">Origin admin</option>
          <option value="destination_admin">Destination admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>

      {status === "loading" && <Card withFlagBar={false} className="mt-6"><p className="text-muted">Loading…</p></Card>}
      {status === "error" && <Card withFlagBar={false} className="mt-6"><p className="text-danger">{message}</p></Card>}

      {status === "done" && (
        <Card withFlagBar={false} className="mt-6 overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Council</th>
                <th className="px-4 py-3">MFA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">No users match your filters.</td></tr>
              )}
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-bg"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.councilName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.mfaEnabled ? "Enabled" : "Not set up"}</td>
                    <td className="px-4 py-3 text-muted">{u.isActive ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                  {expandedId === u.id && (
                    <tr className="border-b border-border bg-bg last:border-0">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                          <div><span className="text-muted">Phone:</span> <span className="text-ink">{u.phone ?? "—"}</span></div>
                          <div><span className="text-muted">Date of birth:</span> <span className="text-ink">{u.dateOfBirth ?? "—"}</span></div>
                          <div><span className="text-muted">Place of birth:</span> <span className="text-ink">{u.placeOfBirth ?? "—"}</span></div>
                          <div><span className="text-muted">User ID:</span> <span className="font-mono text-xs text-ink">{u.id}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
