"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "citizen") router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role === "citizen") {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>;
  }

  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/requests", label: user.role === "destination_admin" ? "Routed requests" : "Incoming requests" },
    ...(user.role === "super_admin"
      ? [
          { href: "/admin/upload", label: "Bulk upload records" },
          { href: "/admin/users", label: "Manage users" },
          { href: "/admin/audit", label: "Audit log" }
        ]
      : [])
  ];

  return (
    <AppShell nav={nav} user={user} onLogout={logout}>
      {children}
    </AppShell>
  );
}
