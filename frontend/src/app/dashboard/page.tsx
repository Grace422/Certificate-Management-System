"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";

export default function DashboardOverview() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Welcome, {user?.firstName}</h1>
      <p className="mt-1 text-muted">What would you like to do today?</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/dashboard/request-certificate">
          <Card withFlagBar={false} className="h-full transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-ink">Request a certificate</h2>
            <p className="mt-1 text-sm text-muted">Get a copy of your birth, death, or marriage certificate.</p>
          </Card>
        </Link>
        <Link href="/dashboard/loss-declaration">
          <Card withFlagBar={false} className="h-full transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-ink">Report a lost certificate</h2>
            <p className="mt-1 text-sm text-muted">File a declaration and start the reissue process.</p>
          </Card>
        </Link>
        <Link href="/dashboard/track">
          <Card withFlagBar={false} className="h-full transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-ink">Track my requests</h2>
            <p className="mt-1 text-sm text-muted">See the status of certificates you&apos;ve requested.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
