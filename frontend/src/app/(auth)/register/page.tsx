'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { registerSchema, passwordStrength, type RegisterValues } from '@/lib/validation';
import { authService } from '@/lib/api/auth.service';
import { ApiError } from '@/lib/api/client';
import { useToast } from '@/context/ToastContext';
import { Button, Card, ErrorBanner, Input, PasswordInput } from '@/components/ui';
import { cn } from '@/lib/utils';

const STRENGTH = ['Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
const STRENGTH_COLOR = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-600'];

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false as unknown as true },
  });

  const pw = watch('password') ?? '';
  const score = passwordStrength(pw);

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await authService.register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        dateOfBirth: values.dateOfBirth,
        placeOfBirth: values.placeOfBirth,
        nationalId: values.nationalId || undefined,
      });
      setDone(true);
      toast.success('Account created. Check your email to verify it.');
    } catch (e) {
      const err = e as ApiError;
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([k, v]) =>
          setError(k as keyof RegisterValues, { message: v }),
        );
      }
      setFormError(err.message);
    }
  };

  if (done) {
    return (
      <Card className="text-center">
        <CheckCircle2 className="mx-auto mb-4 size-10 text-emerald-600" />
        <h1 className="text-lg font-semibold text-slate-900">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a confirmation link to your inbox. Open it to activate your account, then sign in.
        </p>
        <Button className="mt-6" fullWidth onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Use the names exactly as they appear on your civil status record — they drive the archive
        search.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ErrorBanner message={formError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            required
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            required
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone number"
          type="tel"
          required
          placeholder="+237 6XX XXX XXX"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date of birth"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <Input
            label="Place of birth"
            required
            placeholder="e.g. Buea"
            error={errors.placeOfBirth?.message}
            {...register('placeOfBirth')}
          />
        </div>

        <Input
          label="National ID number"
          hint="Optional, speeds up verification"
          error={errors.nationalId?.message}
          {...register('nationalId')}
        />

        <div>
          <PasswordInput
            label="Password"
            required
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {pw && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-full flex-1 rounded-full',
                      i < score ? STRENGTH_COLOR[score] : 'bg-slate-200',
                    )}
                  />
                ))}
              </div>
              <span className="w-20 text-right text-xs text-slate-500">{STRENGTH[score]}</span>
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            {...register('acceptTerms')}
          />
          <span>
            I confirm the information above is accurate and I accept the terms of use and privacy
            notice.
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-xs text-rose-600">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
