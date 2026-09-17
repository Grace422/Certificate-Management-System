import { AppShell } from '@/components/layout/AppShell';
import { Guard } from '@/components/layout/Guard';

/** Authenticated citizen area. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <AppShell variant="citizen">{children}</AppShell>
    </Guard>
  );
}
