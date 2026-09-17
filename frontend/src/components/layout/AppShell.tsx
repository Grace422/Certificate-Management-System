'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Upload,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, initials } from '@/lib/utils';
import { config } from '@/lib/config';

interface NavItem {
  href: string;
  label: string;
  icon: typeof FileText;
}

const CITIZEN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/requests', label: 'My requests', icon: FileText },
  { href: '/offices', label: 'Find an office', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/security', label: 'Security', icon: ShieldCheck },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Requests', icon: FileText },
  { href: '/admin/import', label: 'Archive import', icon: Upload },
  { href: '/admin/offices', label: 'Municipal offices', icon: MapPin },
  { href: '/admin/users', label: 'Citizens', icon: Users },
];

export function AppShell({
  children,
  variant = 'citizen',
}: {
  children: React.ReactNode;
  variant?: 'citizen' | 'admin';
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = variant === 'admin' ? ADMIN_NAV : CITIZEN_NAV;

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  // Rendered as an element, not a nested component definition — defining a
  // component inside render remounts its subtree on every parent render.
  const navLinks = (
    <nav className="space-y-1">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            isActive(href)
              ? 'bg-emerald-50 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )}
        >
          <Icon className="size-4.5" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href={variant === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
              CR
            </span>
            <span className="hidden text-sm font-semibold text-slate-900 sm:block">
              {config.appName}
              {variant === 'admin' && <span className="ml-2 text-xs text-slate-400">Admin</span>}
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </p>
              <p className="text-xs text-slate-500">{user?.role.toLowerCase()}</p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {initials(user?.firstName, user?.lastName)}
            </div>
            <button
              onClick={() => void logout()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">{navLinks}</aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
            <div className="relative h-full w-64 bg-white p-4 pt-20 shadow-xl">{navLinks}</div>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
