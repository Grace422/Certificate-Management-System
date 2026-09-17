import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

// Using the native system font stack (see globals.css): no external request,
// no layout shift, and nothing leaks to a third-party CDN — a deliberate
// choice for a government service. To use Inter instead:
//   import { Inter } from 'next/font/google';
//   const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// then add `className={inter.variable}` to <html>.

export const metadata: Metadata = {
  title: {
    default: 'CivilReg Cameroon — Civil status certificates online',
    template: '%s · CivilReg Cameroon',
  },
  description:
    'Request birth, death and marriage certificates from any region of Cameroon and collect them at the municipal building nearest to you.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#047857',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
