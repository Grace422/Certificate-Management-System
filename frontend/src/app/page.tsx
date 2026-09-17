import Link from 'next/link';
import { FileText, MapPin, ShieldCheck, Search } from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'One national archive',
    body: 'Records from all 10 regions are searchable in one place. Born in Buea, living in Ebolowa? File from where you are.',
  },
  {
    icon: MapPin,
    title: 'Collect nearby',
    body: 'Your approved document is dispatched to the municipal building closest to you, with directions on a map.',
  },
  {
    icon: FileText,
    title: 'Copies & loss declarations',
    body: 'Request an extra certified copy, or declare a lost certificate without travelling back to your birth region.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected by design',
    body: 'Multi-factor authentication, encrypted transport and a full audit trail on every civil-status record.',
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
              CR
            </span>
            <span className="font-semibold text-slate-900">CivilReg Cameroon</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
            République du Cameroun · Civil status
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Your certificate, wherever you are in Cameroon.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Request a copy of a birth, death or marriage certificate — or declare a lost one —
            without returning to the council where it was registered. We deliver it to the municipal
            building nearest to you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Start a request
            </Link>
            <Link
              href="/track"
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Track an existing request
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-slate-200 p-5">
              <Icon className="mb-3 size-6 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <p className="mx-auto max-w-6xl px-4 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} CivilReg Cameroon — a digital civil status registry prototype.
        </p>
      </footer>
    </div>
  );
}
