"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";

export default function AdminOverview() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";

  const links = [
    { href: "/admin/requests", title: "Incoming requests", text: "Review certificate requests and loss declarations from citizens." },
    ...(isSuper
      ? [
          { href: "/admin/upload", title: "Bulk upload & records", text: "Upload civil records and councils, and view what's in the database." },
          { href: "/admin/users", title: "Manage users", text: "See everyone registered and add staff accounts." },
          { href: "/admin/audit", title: "Audit log", text: "Every action taken in the system, most recent first." }
        ]
      : [])
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Admin dashboard</h1>
      <p className="mt-1 text-muted">
        Signed in as <span className="font-medium text-ink">{user?.role.replace(/_/g, " ")}</span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card withFlagBar={false} className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-semibold text-ink">{l.title}</h2>
              <p className="mt-1 text-sm text-muted">{l.text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
