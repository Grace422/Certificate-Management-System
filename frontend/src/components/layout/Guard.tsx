'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingBlock } from '@/components/ui';
import type { UserRole } from '@/lib/types';

/**
 * Client-side gate. Complements (never replaces) backend authorisation.
 * Renders children only once a user with an allowed role is confirmed.
 */
export function Guard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(user.role === 'CITIZEN' ? '/dashboard' : '/admin');
    }
  }, [user, loading, roles, router]);

  if (loading || !user) return <LoadingBlock label="Checking your session…" />;
  if (roles && !roles.includes(user.role)) return <LoadingBlock label="Redirecting…" />;

  return <>{children}</>;
}
