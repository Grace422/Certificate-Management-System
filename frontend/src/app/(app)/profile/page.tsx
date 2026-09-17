'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, LoadingBlock, PageHeader } from '@/components/ui';
import { Input, Select } from '@/components/ui/Field';
import { api, unwrap, ApiError } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { REGIONS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { User } from '@/lib/types';

/**
 * Editable form. Mounted with key={user.id} by the page below, so its initial
 * state comes straight from props — no effect syncing server data into state.
 */
function ProfileForm({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    placeOfBirth: user.placeOfBirth ?? '',
    region: user.region ?? '',
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(ENDPOINTS.users.updateProfile, form);
      onSaved(unwrap<User>(data));
      toast.success('Profile updated.');
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Personal information" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={form.firstName} onChange={set('firstName')} />
        <Input label="Last name" value={form.lastName} onChange={set('lastName')} />
        <Input label="Phone number" type="tel" value={form.phone} onChange={set('phone')} />
        <Input label="Place of birth" value={form.placeOfBirth} onChange={set('placeOfBirth')} />
        <Select
          label="Region of residence"
          placeholder="Select a region"
          options={REGIONS.map((r) => ({ value: r, label: r }))}
          value={form.region}
          onChange={set('region')}
        />
      </div>
      <Button className="mt-5" onClick={save} loading={busy}>
        Save changes
      </Button>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  if (!user) return <LoadingBlock label="Loading your profile…" />;

  return (
    <>
      <PageHeader title="Profile" description="Details used to match you to civil status records." />

      <div className="grid gap-6 lg:grid-cols-3">
        <ProfileForm key={user.id} user={user} onSaved={setUser} />

        <Card>
          <CardHeader title="Account" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date of birth</dt>
              <dd className="font-medium text-slate-900">{formatDate(user.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">National ID</dt>
              <dd className="font-medium text-slate-900">{user.nationalId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Member since</dt>
              <dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Email and date of birth are locked because they anchor your identity verification.
            Contact your council to correct them.
          </p>
        </Card>
      </div>
    </>
  );
}
