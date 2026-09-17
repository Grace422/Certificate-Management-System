"use client";

import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";

export default function AdminOverview() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Admin dashboard</h1>
      <p className="mt-1 text-muted">
        Signed in as <span className="font-medium text-ink">{user?.role.replace("_", " ")}</span>
      </p>

      <Card withFlagBar={false} className="mt-8 max-w-xl">
        <p className="text-ink">
          Request review, bulk record upload, and audit log views are wired to the API contract
          and will activate automatically once the corresponding backend modules are implemented.
        </p>
      </Card>
    </div>
  );
}
