import Link from 'next/link';

/** Centred card layout shared by login / register / MFA / password reset. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="px-4 py-6 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
            CR
          </span>
          <span className="font-semibold text-slate-900">CivilReg Cameroon</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-slate-500">
        Protected by multi-factor authentication · Never share your one-time code.
      </footer>
    </div>
  );
}
