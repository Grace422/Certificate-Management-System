'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { forgotPasswordSchema } from '@/lib/validation';
import { authService } from '@/lib/api/auth.service';
import { Button, Card, Input } from '@/components/ui';

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: Values) => {
    // Always show the same confirmation — never leak which emails exist.
    try {
      await authService.forgotPassword(values.email);
    } catch {
      /* swallow: identical response prevents account enumeration */
    } finally {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Card className="text-center">
        <MailCheck className="mx-auto mb-4 size-10 text-emerald-600" />
        <h1 className="text-lg font-semibold text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-600">
          If an account exists for that address, we have sent a password reset link. It expires in
          30 minutes.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          Back to sign in
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Enter your email and we will send you a secure reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
