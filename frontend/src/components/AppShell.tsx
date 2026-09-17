"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { PublicUser } from "@/types";
import { Button } from "./Button";

interface NavItem {
  href: string;
  label: string;
}

export function AppShell({
  nav, user, onLogout, children
}: {
  nav: NavItem[];
  user: PublicUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col justify-between border-r border-border bg-primary-dark px-4 py-6 text-white">
        <div>
          <div className="mb-8 px-2 text-lg font-semibold">CSCMS</div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                    active ? "bg-white/15 font-medium" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/15 pt-4">
          <p className="px-2 text-sm font-medium">{user.firstName} {user.lastName}</p>
          <p className="px-2 text-xs text-white/70">{user.email}</p>
          <Button variant="secondary" onClick={onLogout} className="mt-3 w-full !bg-transparent !text-white border-white/30 hover:!bg-white/10">
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 bg-bg px-8 py-8">{children}</main>
    </div>
  );
}
