"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/Button";
import { FlagBar } from "@/components/FlagBar";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "citizen" ? "/dashboard" : "/admin");
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen">
      <FlagBar />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold">CSCMS</span>
        <nav className="flex gap-3">
          <Link href="/login">
            <Button variant="secondary">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Create account</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Get your birth, death, or marriage certificate from anywhere in Cameroon.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Born in Buea, living in Ebolowa? You no longer need to travel back to the
          council where your record was registered. Request a copy or report a lost
          certificate from any of Cameroon&apos;s 10 regions, and pick it up at the
          municipal office nearest you.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/register">
            <Button className="px-6 py-3 text-base">Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="px-6 py-3 text-base">I already have an account</Button>
          </Link>
        </div>

        <dl className="mt-16 grid grid-cols-1 gap-8 border-t border-border pt-10 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-muted">Coverage</dt>
            <dd className="mt-1 text-2xl font-semibold">10 regions</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Certificate types</dt>
            <dd className="mt-1 text-2xl font-semibold">Birth · Death · Marriage</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Security</dt>
            <dd className="mt-1 text-2xl font-semibold">MFA-protected</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
