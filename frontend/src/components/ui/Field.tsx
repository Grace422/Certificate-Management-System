'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500';
const ok = 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20';
const bad = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20';

function Wrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------- Input ---------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, required, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <Wrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        {...rest}
        id={inputId}
        ref={ref}
        aria-invalid={!!error}
        className={cn(base, error ? bad : ok, className)}
      />
    </Wrapper>
  );
});

/* ---------------- Password with reveal toggle ---------------- */

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(
  { label, error, hint, id, required, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const inputId = id ?? rest.name;
  return (
    <Wrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          ref={ref}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          className={cn(base, 'pr-10', error ? bad : ok)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Wrapper>
  );
});

/* ---------------- Select ---------------- */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, id, required, className, ...rest },
  ref,
) {
  const selectId = id ?? rest.name;
  return (
    <Wrapper label={label} htmlFor={selectId} error={error} hint={hint} required={required}>
      <select
        {...rest}
        id={selectId}
        ref={ref}
        aria-invalid={!!error}
        className={cn(base, error ? bad : ok, className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
});

/* ---------------- Textarea ---------------- */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, required, className, ...rest },
  ref,
) {
  const areaId = id ?? rest.name;
  return (
    <Wrapper label={label} htmlFor={areaId} error={error} hint={hint} required={required}>
      <textarea
        {...rest}
        id={areaId}
        ref={ref}
        aria-invalid={!!error}
        className={cn(base, 'min-h-24 resize-y', error ? bad : ok, className)}
      />
    </Wrapper>
  );
});
