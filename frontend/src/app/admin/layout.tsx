import { AppShell } from '@/components/layout/AppShell';
import { Guard } from '@/components/layout/Guard';

/** Staff-only area: agents and administrators. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={['AGENT', 'ADMIN', 'SUPER_ADMIN']}>
      <AppShell variant="admin">{children}</AppShell>
    </Guard>
  );
}
