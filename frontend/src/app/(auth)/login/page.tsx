'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Button, Card, ErrorBanner, Input, PasswordInput } from '@/components/ui';
import { MfaChallenge } from './MfaChallenge';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') ?? undefined;

  const [formError, setFormError] = useState<string | null>(
    params.get('reason') === 'expired' ? 'Your session expired. Please sign in again.' : null,
  );
  const [mfa, setMfa] = useState<{ token: string; email: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const result = await login(values.email, values.password);

      // Step 2 required → swap the form for the OTP challenge.
      if (result.mfaRequired && result.mfaToken) {
        setMfa({ token: result.mfaToken, email: values.email });
        return;
      }

      const role = result.user?.role;
      router.replace(nextPath ?? (role && role !== 'CITIZEN' ? '/admin' : '/dashboard'));
    } catch (e) {
      const err = e as ApiError;
      if (err.fieldErrors) {
        Object.entries(err.fieldErrors).forEach(([k, v]) =>
          setError(k as keyof LoginValues, { message: v }),
        );
      }
      // Deliberately generic: never reveal whether the email exists.
      setFormError(err.status === 401 ? 'Incorrect email or password.' : err.message);
    }
  };

  if (mfa) {
    return <MfaChallenge mfaToken={mfa.token} email={mfa.email} nextPath={nextPath} />;
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Access your certificate requests and track their delivery.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <ErrorBanner message={formError} />

        <Input
          label="Email address"
          type="email"
          autoComplete="username"
          placeholder="you@example.cm"
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-emerald-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isSubmitting}>
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-emerald-700 hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
