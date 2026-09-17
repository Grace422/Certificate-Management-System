'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * 6-box one-time-code field with paste + arrow-key support.
 * Controlled: parent owns the string value.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(length).split('').slice(0, length);

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const setAt = (index: number, digit: string) => {
    const arr = value.split('');
    arr[index] = digit;
    commit(arr.join('').replace(/\s/g, '').slice(0, length));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    commit(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={c.trim()}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => onKeyDown(e, i)}
          onPaste={onPaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'h-14 w-full rounded-lg border text-center text-xl font-semibold text-slate-900 outline-none transition',
            'focus:ring-2 disabled:bg-slate-50',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20',
          )}
        />
      ))}
    </div>
  );
}
