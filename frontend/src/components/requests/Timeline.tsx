'use client';

import { Check } from 'lucide-react';
import { STATUS_FLOW, STATUS_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { RequestEvent, RequestStatus } from '@/lib/types';

/** Vertical progress tracker: lifecycle steps + any recorded events. */
export function Timeline({
  status,
  events = [],
}: {
  status: RequestStatus;
  events?: RequestEvent[];
}) {
  if (status === 'REJECTED') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        This request was rejected. See the reason below.
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);
  const eventFor = (s: RequestStatus) => events.find((e) => e.status === s);

  return (
    <ol className="relative space-y-0">
      {STATUS_FLOW.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        const evt = eventFor(step);
        const last = i === STATUS_FLOW.length - 1;

        return (
          <li key={step} className="flex gap-3 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border-2 text-white transition',
                  done ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white',
                  active && 'ring-4 ring-emerald-100',
                )}
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {!last && (
                <span className={cn('w-0.5 flex-1', i < currentIndex ? 'bg-emerald-600' : 'bg-slate-200')} />
              )}
            </div>

            <div className="-mt-0.5 pb-1">
              <p className={cn('text-sm font-medium', done ? 'text-slate-900' : 'text-slate-400')}>
                {STATUS_LABEL[step]}
              </p>
              {evt && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDateTime(evt.createdAt)}
                  {evt.note && ` — ${evt.note}`}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
