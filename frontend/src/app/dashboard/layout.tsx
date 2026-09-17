"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "citizen") router.replace("/admin");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "citizen") {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>;
  }

  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/request-certificate", label: "Request a certificate" },
    { href: "/dashboard/loss-declaration", label: "Report a lost certificate" },
    { href: "/dashboard/track", label: "Track my requests" }
  ];

  return (
    <AppShell nav={nav} user={user} onLogout={logout}>
      {children}
    </AppShell>
  );
}
