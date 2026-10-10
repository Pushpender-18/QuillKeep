'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GLOBAL_ERROR]', error?.message || error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0B] text-white min-h-screen flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-[#161618] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-[#8E8E93] mb-6">
            An unexpected error occurred. Please try again or return to the main dashboard.
          </p>
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-semibold transition duration-150 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <Link
              href="/dashboard"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition duration-150"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
